/**
 * insights-api/index.js
 * Returns aggregated Digital Twin insights for a userId.
 * Uses Cosmos DB in production, falls back to /tmp JSON locally.
 */
const { getDocuments } = require('../shared/cosmos-db')
const https = require('https')

function getMonthlySavings(byCategory = {}, transactions = [], fullDoc = {}) {
  // Direct calculation: Income - Expenses
  const totalIncome = Number(fullDoc?.agentResult?.agents?.documentIntelligence?.totalIncome) || 
                      Number(fullDoc?.totalIncome) || 0
  const totalExpenses = Number(fullDoc?.agentResult?.agents?.documentIntelligence?.totalExpenses) || 
                        Number(fullDoc?.totalExpenses) || 0
  const availableSavings = Math.max(0, totalIncome - totalExpenses)
  return Math.round(availableSavings * 100) / 100
}

function getGoalSavedAmount(goal = {}, fallback = 0) {
  const candidates = [
    goal?.savedAmount,
    goal?.currentSaved,
    goal?.amountSaved,
    goal?.progressAmount,
  ]
  for (const value of candidates) {
    const num = Number(value)
    if (!Number.isNaN(num) && num >= 0) return num
  }
  return fallback
}

function buildGoalSummaries(rawGoals = [], goalAlignmentGoals = [], monthlySavings = 0) {
  if (Array.isArray(rawGoals) && rawGoals.length) {
    return (rawGoals || []).map((goal) => {
      const targetAmount = Number(goal?.targetAmount) || 0
      const deadlineMonths = Math.max(Number(goal?.deadlineMonths) || 1, 1)
      const monthlyNeeded = Math.round((targetAmount / deadlineMonths) * 100) / 100
      const savedAmount = Math.min(targetAmount, getGoalSavedAmount(goal, monthlySavings))
      const remainingAmount = Math.max(0, targetAmount - savedAmount)
      const progressPct = targetAmount > 0 ? Math.round((savedAmount / targetAmount) * 100) : 0
      return {
        goal: goal?.description || 'Goal',
        monthlyNeeded,
        currentSavings: monthlySavings,
        savedAmount: Math.round(savedAmount * 100) / 100,
        progressPct,
        onTrack: monthlySavings >= monthlyNeeded,
        projectedMonths: monthlySavings > 0 ? Math.ceil(remainingAmount / monthlySavings) : null,
      }
    })
  }

  if (Array.isArray(goalAlignmentGoals) && goalAlignmentGoals.length) {
    return goalAlignmentGoals.map((goal) => {
      const currentSavingsBase = Math.round(Math.abs(Number(goal.currentSavings) || 0) * 100) / 100
      const monthlyNeeded = Math.round((Number(goal.monthlyNeeded) || 0) * 100) / 100
      const currentSavings = monthlySavings > 0 ? monthlySavings : currentSavingsBase
      const progressPct = Number(goal?.progressPct)
      return {
        ...goal,
        currentSavings,
        monthlyNeeded,
        progressPct: !Number.isNaN(progressPct) ? progressPct : undefined,
        onTrack: currentSavings >= monthlyNeeded,
        projectedMonths: goal?.projectedMonths ?? (currentSavings > 0 && monthlyNeeded > 0 ? Math.ceil(monthlyNeeded / currentSavings) : null),
      }
    })
  }

  return []
}

function deriveGoalAlignmentScore(_summaryScore, goalSummaries = []) {
  if (!goalSummaries.length) return 0
  const progressValues = goalSummaries
    .map(goal => Number(goal?.progressPct))
    .filter(value => !Number.isNaN(value))
  if (progressValues.length) {
    return Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length)
  }
  const onTrackGoals = goalSummaries.filter(goal => goal.onTrack).length
  return Math.round((onTrackGoals / goalSummaries.length) * 100)
}

function buildOptimizationSummary(goalOptimization = {}, goalSummaries = [], savingsMonthly = 0, fsiLevel = 'Medium') {
  const rawActions = Array.isArray(goalOptimization?.actions) ? goalOptimization.actions : []
  let actions = rawActions.filter(action => action && action.title)
  const source = goalOptimization?.source || (actions.length ? 'agent' : 'api-fallback')

  // Backward-compatible fallback for older analyzed docs where goalOptimization may be empty.
  if (!actions.length) {
    actions = [{
      title: 'Review spending habits',
      description: 'A monthly budget review helps uncover easy savings opportunities.',
      category: 'Planning',
      potentialSavings: 50,
      effort: 'Low',
      implementation: 'Set a 20-minute monthly review and cap non-essential spend.',
    }]

    if (String(fsiLevel || '').toLowerCase() === 'medium' || String(fsiLevel || '').toLowerCase() === 'high') {
      actions.push({
        title: 'Build emergency buffer',
        description: 'A small safety buffer reduces stress and improves consistency.',
        category: 'Savings',
        potentialSavings: 35,
        effort: 'Medium',
        implementation: 'Automate a fixed transfer to savings on payday.',
      })
    }
  }

  const totalPotentialSavings = Math.round(
    (Number(goalOptimization?.totalPotentialSavings) > 0
      ? Number(goalOptimization.totalPotentialSavings)
      : actions.reduce((sum, action) => sum + (Number(action?.potentialSavings) || 0), 0)) * 100
  ) / 100

  const currentMonthlySavings = Math.round((Number(goalOptimization?.currentMonthlySavings) || Number(savingsMonthly) || 0) * 100) / 100
  const optimizedMonthlySavings = Math.round((Number(goalOptimization?.optimizedMonthlySavings) || (currentMonthlySavings + totalPotentialSavings)) * 100) / 100

  let optimizedGoals = Array.isArray(goalOptimization?.optimizedGoals) ? goalOptimization.optimizedGoals : []
  if (!optimizedGoals.length && Array.isArray(goalSummaries) && goalSummaries.length) {
    optimizedGoals = goalSummaries.map(goal => {
      const currentProjected = Number(goal?.projectedMonths)
      if (!currentProjected || !Number.isFinite(currentProjected)) {
        return {
          goal: goal?.goal || 'Goal',
          currentProjected: goal?.projectedMonths ?? null,
          optimizedProjected: null,
          timeSaved: 0,
        }
      }

      const currentSavings = Number(goal?.currentSavings) || Number(currentMonthlySavings) || 0
      const monthlyNeeded = Number(goal?.monthlyNeeded) || 0
      const remaining = currentSavings > 0 ? (currentSavings * currentProjected) : (monthlyNeeded * currentProjected)
      let optimizedProjected = optimizedMonthlySavings > 0 ? Math.max(1, Math.ceil(remaining / optimizedMonthlySavings)) : null
      if (optimizedProjected && currentProjected) {
        optimizedProjected = Math.min(currentProjected, optimizedProjected)
      }
      const timeSaved = optimizedProjected ? Math.max(0, currentProjected - optimizedProjected) : 0

      return {
        goal: goal?.goal || 'Goal',
        currentProjected,
        optimizedProjected,
        timeSaved,
      }
    })
  }

  return {
    source,
    totalPotentialSavings,
    currentMonthlySavings,
    optimizedMonthlySavings,
    optimizedGoals,
    actions,
  }
}

function getDocumentCategoryTotals(doc = {}) {
  const catMap = doc.agentResult?.agents?.documentIntelligence?.byCategory
  if (catMap && Object.keys(catMap).length > 0) return catMap

  return (doc.transactions || []).reduce((acc, tx) => {
    const amount = Number(tx?.amount) || 0
    if (amount < 0) {
      const category = tx?.category || 'Other'
      acc[category] = (acc[category] || 0) + Math.abs(amount)
    }
    return acc
  }, {})
}

/**
 * Call Azure OpenAI via native https (no extra npm deps needed).
 * Returns the raw text content from the model, or null on failure.
 */
function _callOpenAI(endpoint, deployment, apiKey, prompt, options = {}) {
  return new Promise((resolve) => {
    try {
      const url = new URL(`/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`, endpoint)
      const payload = {
        messages: [{ role: 'user', content: prompt }],
        temperature: Number(options.temperature ?? 0.6),
        max_tokens: Number(options.maxTokens ?? 350),
      }
      if (options.responseFormat === 'json_object') {
        payload.response_format = { type: 'json_object' }
      }
      const body = JSON.stringify(payload)
      const req = https.request({
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
          'Content-Length': Buffer.byteLength(body),
        },
      }, (res) => {
        let data = ''
        res.on('data', chunk => { data += chunk })
        res.on('end', () => {
          try { resolve(JSON.parse(data).choices?.[0]?.message?.content || null) }
          catch { resolve(null) }
        })
      })
      req.on('error', () => resolve(null))
      req.setTimeout(9000, () => { req.destroy(); resolve(null) })
      req.write(body)
      req.end()
    } catch { resolve(null) }
  })
}

function _extractJsonObject(raw) {
  if (!raw || typeof raw !== 'string') return null
  const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const first = cleaned.indexOf('{')
    const last = cleaned.lastIndexOf('}')
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(cleaned.slice(first, last + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

/**
 * Helper: Return bilingual message based on language.
 */
function _getMessage(es, msgEs, msgEn) {
  return es ? msgEs : msgEn
}

/**
 * Helper: Collect positive financial indicators.
 */
function _collectPositiveIndicators(score, netFlow, hasSavings, weekendAlert, dominant, es) {
  const pos = []
  
  if (netFlow > 0)
    pos.push(_getMessage(es, 'Tus ingresos superaron tus gastos este período', 'Your income exceeded your spending this period'))
  
  if (hasSavings)
    pos.push(_getMessage(es, 'Realizaste una aportación a ahorros o inversión', 'You made a savings or investment contribution'))
  
  if (score >= 70)
    pos.push(_getMessage(es, 'Tus hábitos financieros están por encima de la media', 'Your overall financial habits are above average'))
  
  const noImpulsiveSpending = !weekendAlert && dominant === 'none'
  if (noImpulsiveSpending)
    pos.push(_getMessage(es, 'No se detectaron patrones de gasto impulsivo', 'No significant impulse-spending patterns detected'))
  
  if (pos.length === 0)
    pos.push(_getMessage(es, 'Estás haciendo seguimiento activo de tus finanzas', 'You are actively tracking your finances — great first step'))
  
  return pos
}

/**
 * Helper: Collect financial warning indicators.
 */
function _collectWarningIndicators(weekendAlert, fsiLevel, es) {
  const warn = []
  
  if (weekendAlert)
    warn.push(_getMessage(es, 'Se detectó gasto elevado los fines de semana', 'High weekend spending pattern detected'))
  else if (fsiLevel === 'High')
    warn.push(_getMessage(es, 'Tu índice de estrés financiero es elevado — revisa tus gastos fijos', 'Your financial stress index is elevated — review fixed costs'))
  
  return warn
}

/**
 * Build a rule-based explanation (bilingual) from summary data.
 * Used as fallback when Azure OpenAI is not configured.
 */
function _staticExplanation(score, netFlow, hasSavings, fsiLevel, weekendAlert, dominant, lang) {
  const es = lang === 'es'
  const positives = _collectPositiveIndicators(score, netFlow, hasSavings, weekendAlert, dominant, es)
  const warnings = _collectWarningIndicators(weekendAlert, fsiLevel, es)
  return { positives: positives.slice(0, 3), warnings: warnings.slice(0, 1), source: 'static' }
}

/**
 * Generate an AI score explanation for existing Cosmos data that predates this field.
 * Calls Azure OpenAI directly (no enrichment-agent dependency).
 * Always returns a { positives, warnings, source } object — never null.
 */
async function generateScoreExplanation(summaryData, lang) {
  const { habitWealthScore, netCashFlow, fsiLevel, dominantPattern, weekendSpendAlert, byCategory } = summaryData
  const hasSavings = getMonthlySavings(byCategory) > 0
  const staticResult = _staticExplanation(habitWealthScore, netCashFlow, hasSavings, fsiLevel, weekendSpendAlert, dominantPattern, lang)

  const endpoint   = (process.env.AZURE_OPENAI_ENDPOINT   || '').replace(/\/$/, '')
  const apiKey     = process.env.AZURE_OPENAI_KEY          || ''
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT   || 'gpt-4o-mini'

  if (!endpoint || !apiKey) return staticResult

  const prompt =
    `You are a personal finance AI coach. The user has a HabitWealth Score of ${habitWealthScore}/100.\n\n` +
    `Financial profile:\n` +
    `- Dominant emotional spending pattern: "${dominantPattern}"\n` +
    `- Financial Stress Level: ${fsiLevel}\n` +
    `- Net cash flow this period: €${netCashFlow.toFixed(2)} (${netCashFlow > 0 ? 'positive — great!' : 'negative'})\n` +
    `- Savings/investment contributions made: ${hasSavings ? 'yes' : 'no'}\n` +
    `- Weekend spending alert: ${weekendSpendAlert ? 'yes' : 'no'}\n\n` +
    `Generate a score explanation with:\n` +
    `- 2-3 short POSITIVES (what the user did well to earn this score, max 12 words each)\n` +
    `- 0-1 WARNING (only if fsiLevel=High or weekendAlert=yes, else empty list), max 15 words\n` +
    `Tone: warm, encouraging, data-specific — NOT generic advice.\n` +
    `Return ONLY valid JSON, no markdown:\n` +
    `{"en":{"positives":["..."],"warnings":["..."]},"es":{"positives":["..."],"warnings":["..."]}}`

  try {
    const raw = await _callOpenAI(endpoint, deployment, apiKey, prompt)
    if (!raw) return staticResult
    const parsed = JSON.parse(raw)
    const localized = lang === 'es' ? (parsed.es ?? parsed.en) : parsed.en
    if (localized?.positives?.length) return { ...localized, source: 'gpt-4o' }
  } catch { /* fall through */ }

  return staticResult
}

/**
 * Generate optimization actions on-demand via Azure OpenAI when historical docs
 * do not include GoalOptimization results.
 */
async function generateGoalOptimization(summaryData) {
  const {
    byCategory,
    weekendSpend,
    primaryPattern,
    fsiLevel,
    goals,
    currentMonthlySavings,
  } = summaryData

  const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/$/, '')
  const apiKey = process.env.AZURE_OPENAI_KEY || ''
  const deployment = process.env.AZURE_OPENAI_GOAL_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini'

  console.log('[generateGoalOptimization] endpoint:', endpoint ? '✓ configured' : '✗ missing')
  console.log('[generateGoalOptimization] apiKey:', apiKey ? '✓ configured' : '✗ missing')
  console.log('[generateGoalOptimization] deployment:', deployment)

  if (!endpoint || !apiKey) {
    console.warn('[generateGoalOptimization] missing credentials - returning null for fallback')
    return null
  }

  const payload = {
    currency: 'EUR',
    spendingByCategory: byCategory || {},
    weekendSpend: Number(weekendSpend) || 0,
    dominantPattern: primaryPattern || 'none',
    fsiLevel: fsiLevel || 'Medium',
    goals: goals || [],
    currentMonthlySavings: Number(currentMonthlySavings) || 0,
  }

  const prompt =
    'You are a financial optimization advisor. Return ONLY valid JSON. ' +
    'Build an actionable monthly plan to achieve the goals faster using user spending and behavior context. ' +
    'Schema: ' +
    '{"actions":[{"title":string,"description":string,"category":string,"potentialSavings":number,"effort":"Low"|"Medium"|"High","implementation":string}],"totalPotentialSavings":number,"currentMonthlySavings":number,"optimizedMonthlySavings":number,"optimizedGoals":[{"goal":string,"currentProjected":number|null,"optimizedProjected":number|null,"timeSaved":number}]} ' +
    'Rules: max 4 actions, realistic monthly EUR savings, never worsen goal timeline (optimizedProjected <= currentProjected), at least 1 action.\n\n' +
    `UserData:\n${JSON.stringify(payload)}`

  try {
    const raw = await _callOpenAI(endpoint, deployment, apiKey, prompt, {
      responseFormat: 'json_object',
      temperature: 0.25,
      maxTokens: 900,
    })
    if (!raw) return null

    const parsed = _extractJsonObject(raw)
    if (!parsed) return null
    const parsedActions = Array.isArray(parsed?.actions) ? parsed.actions : []
    const actions = parsedActions
      .filter(a => a && a.title)
      .slice(0, 4)
      .map(a => ({
        title: String(a.title),
        description: String(a.description || ''),
        category: String(a.category || 'Planning'),
        potentialSavings: Math.round(Math.max(0, Number(a.potentialSavings) || 0) * 100) / 100,
        effort: String(a.effort || 'Medium'),
        implementation: String(a.implementation || 'Apply this action for 30 days and review results.'),
      }))

    if (!actions.length) return null

    const totalPotentialSavings = Math.round(
      ((Number(parsed?.totalPotentialSavings) > 0
        ? Number(parsed.totalPotentialSavings)
        : actions.reduce((sum, action) => sum + (Number(action?.potentialSavings) || 0), 0)) * 100)
    ) / 100

    const current = Math.round((Number(parsed?.currentMonthlySavings) || Number(currentMonthlySavings) || 0) * 100) / 100
    const optimized = Math.round((Number(parsed?.optimizedMonthlySavings) || (current + totalPotentialSavings)) * 100) / 100

    let optimizedGoals = Array.isArray(parsed?.optimizedGoals) ? parsed.optimizedGoals : []
    if (!optimizedGoals.length && Array.isArray(goals) && goals.length) {
      optimizedGoals = goals.map(goal => {
        const currentProjected = Number(goal?.projectedMonths)
        if (!currentProjected || !Number.isFinite(currentProjected)) {
          return {
            goal: goal?.goal || 'Goal',
            currentProjected: goal?.projectedMonths ?? null,
            optimizedProjected: null,
            timeSaved: 0,
          }
        }
        const remaining = (Number(goal?.currentSavings) || current || 0) * currentProjected
        let optimizedProjected = optimized > 0 ? Math.max(1, Math.ceil(remaining / optimized)) : null
        if (optimizedProjected && currentProjected) {
          optimizedProjected = Math.min(currentProjected, optimizedProjected)
        }
        return {
          goal: goal?.goal || 'Goal',
          currentProjected,
          optimizedProjected,
          timeSaved: optimizedProjected ? Math.max(0, currentProjected - optimizedProjected) : 0,
        }
      })
    }

    return {
      source: deployment,
      actions,
      totalPotentialSavings,
      currentMonthlySavings: current,
      optimizedMonthlySavings: optimized,
      optimizedGoals,
    }
  } catch (err) {
    // Keep this non-fatal: API summary will still return fallback actions.
    console.warn('[insights-api] generateGoalOptimization failed:', err?.message || err)
    return null
  }
}

/**
 * Extract month number from filename using pattern matching.
 * Try: numeric patterns → Spanish month names → English month names → analyzedAt date → null
 */
function _extractMonthFromFilename(filename, analyzedAt) {
  const fn = (filename || '').toLowerCase()
  
  // Try numeric pattern: _MM_
  const numMatch = fn.match(/_(\d{1,2})_/)
  if (numMatch) return Number.parseInt(numMatch[1], 10)
  
  // Try Spanish month names
  const spanishMonths = {
    diciembre: 12, enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5,
    junio: 6, julio: 7, agosto: 8, setiembre: 9, septiembre: 9, octubre: 10, noviembre: 11
  }
  for (const [name, month] of Object.entries(spanishMonths)) {
    if (fn.includes(name)) return month
  }
  
  // Try English month names
  const englishMonths = {
    january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
    may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8,
    september: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12
  }
  for (const [name, month] of Object.entries(englishMonths)) {
    if (fn.includes(name)) return month
  }
  
  // Fallback: parse analyzedAt date
  if (analyzedAt) {
    try {
      return new Date(analyzedAt).getMonth() + 1
    } catch { /* ignored */ }
  }
  
  return null
}

/**
 * Process a single transaction: extract category, amount, and merchant.
 */
function _processTransaction(tx) {
  const amount = Math.abs(Number(tx.amount) || 0)
  if (amount <= 0) return null
  return { merchant: tx.merchant, amount: Math.round(amount * 100) / 100 }
}

/**
 * Aggregate transactions for a single document: group by category, sort, keep top 5.
 */
function _aggregateDocumentTransactions(doc) {
  const transactions = doc.transactions || []
  const byCategory = {}
  
  for (const tx of transactions) {
    const processed = _processTransaction(tx)
    if (!processed) continue
    const cat = tx.category || 'Other'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(processed)
  }
  
  for (const [cat, txs] of Object.entries(byCategory)) {
    byCategory[cat] = txs.sort((a, b) => b.amount - a.amount).slice(0, 5)
  }
  return byCategory
}

/**
 * Aggregate transactions by BOTH category and month within a single document.
 * Returns { category: { monthNum: [transactions] } }
 */
function _aggregateDocumentTransactionsByMonthAndCategory(doc) {
  const transactions = doc.transactions || []
  const result = {}
  
  for (const tx of transactions) {
    const processed = _processTransaction(tx)
    if (!processed) continue
    
    const cat = tx.category || 'Other'
    const dateStr = tx.date || ''
    // Extract month number (1-12) from date string (YYYY-MM-DD format)
    let monthNum = 1
    if (dateStr.match(/\d{4}-(\d{2})-\d{2}/)) {
      monthNum = parseInt(dateStr.substring(5, 7))
    }
    
    if (!result[cat]) result[cat] = {}
    if (!result[cat][monthNum]) result[cat][monthNum] = []
    result[cat][monthNum].push(processed)
  }
  
  // Sort and keep top 5 per category-month
  for (const [cat, months] of Object.entries(result)) {
    for (const [monthNum, txs] of Object.entries(months)) {
      result[cat][monthNum] = txs.sort((a, b) => b.amount - a.amount).slice(0, 5)
    }
  }
  
  return result
}

/**
 * Accumulate category data across analysis documents (3-doc window).
 */
function _buildMonthlySummary(analysisDocs) {
  // Build monthlySummary from transactions in analysisDocs
  const monthlySummary = {}
  let debugTxCount = 0
  for (let docIdx = 0; docIdx < analysisDocs.length; docIdx++) {
    const doc = analysisDocs[docIdx]
    const txns = doc.transactions || []
    debugTxCount += txns.length
    for (const txn of txns) {
      const dateStr = txn.date || ''
      if (!dateStr) continue
      // Extract YYYY-MM from date string
      const month = dateStr.substring(0, 7) // "2025-12" format
      if (!monthlySummary[month]) {
        monthlySummary[month] = { income: 0, expenses: 0, net: 0, byCategory: {} }
      }
      const amount = Number(txn.amount) || 0
      const category = txn.category || 'Other'
      if (amount > 0) {
        monthlySummary[month].income += amount
      } else {
        monthlySummary[month].expenses += Math.abs(amount)
      }
      if (!monthlySummary[month].byCategory[category]) {
        monthlySummary[month].byCategory[category] = 0
      }
      monthlySummary[month].byCategory[category] += Math.abs(amount)
    }
  }
  console.log(`[buildMonthlySummary] Processed ${debugTxCount} transactions, built ${Object.keys(monthlySummary).length} months`, monthlySummary)
  // Calculate net for each month
  for (const month in monthlySummary) {
    monthlySummary[month].net = monthlySummary[month].income - monthlySummary[month].expenses
  }
  console.log(`[buildMonthlySummary] COMPLETE monthlySummary with byCategory breakdown:`, JSON.stringify(monthlySummary, null, 2))
  return monthlySummary
}

function _accumulateCategoryData(analysisDocs) {
  const byCategory = {}
  const byCategoryByMonth = {}
  const transactionsByMonthAndCategory = {}
  
  for (let docIdx = 0; docIdx < analysisDocs.length; docIdx++) {
    const doc = analysisDocs[docIdx]
    const catMap = getDocumentCategoryTotals(doc)
    
    // Get transactions grouped by BOTH category and month
    const txsByMonthAndCategory = _aggregateDocumentTransactionsByMonthAndCategory(doc)
    
    // Accumulate transactions by category and month
    for (const [cat, monthsData] of Object.entries(txsByMonthAndCategory)) {
      if (!transactionsByMonthAndCategory[cat]) transactionsByMonthAndCategory[cat] = []
      
      for (const [monthNum, txs] of Object.entries(monthsData)) {
        // Check if we already have this month for this category
        const existing = transactionsByMonthAndCategory[cat].find(m => m.month === parseInt(monthNum))
        if (existing) {
          // Merge with existing
          existing.transactions = [...existing.transactions, ...txs]
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5)
        } else {
          // Add new month entry
          transactionsByMonthAndCategory[cat].push({ 
            month: parseInt(monthNum), 
            transactions: txs 
          })
        }
      }
    }
    
    // Accumulate category totals
    for (const [cat, amt] of Object.entries(catMap)) {
      byCategory[cat] = (byCategory[cat] || 0) + amt
      if (!byCategoryByMonth[cat]) byCategoryByMonth[cat] = []
      byCategoryByMonth[cat][docIdx] = Math.round(amt * 100) / 100
    }
  }
  
  // Sort months within each category for consistent ordering
  for (const [cat, monthsArray] of Object.entries(transactionsByMonthAndCategory)) {
    transactionsByMonthAndCategory[cat] = monthsArray.sort((a, b) => a.month - b.month)
  }
  
  return { byCategory, byCategoryByMonth, transactionsByMonthAndCategory }
}

module.exports = async function (context, req) {
  const userId = req.query.userId || 'local-user'
  const lang   = req.query.lang   || 'en'
  let docs  // let so we can reassign after dedup
  try {
    docs = await getDocuments(userId)
  } catch (err) {
    context.log.warn('[insights-api] DB read failed: ' + err.message)
    docs = []
  }

  if (!docs || !docs.length) {
    context.res = {
      status: 200,
      body: { documents: [], summary: null, documentCount: 0, message: 'No documents analyzed yet.' }
    }
    return
  }

  // Deduplicate by filename — keep latest per filename to handle duplicate uploads
  const seenFilenames = new Map()
  for (const doc of docs) {
    const key = doc.filename || doc.id
    const existing = seenFilenames.get(key)
    if (!existing || (doc.analyzedAt || '') > (existing.analyzedAt || '')) {
      seenFilenames.set(key, doc)
    }
  }
  docs = Array.from(seenFilenames.values())

  // Sort by analyzedAt ascending for timeline and focus dashboard on latest 3 statements
  docs.sort((a, b) => (a.analyzedAt || '').localeCompare(b.analyzedAt || ''))
  const analysisDocs = docs.slice(-3)
  const latestDoc = analysisDocs[analysisDocs.length - 1]
  const twin      = latestDoc.agentResult?.agents?.digitalTwin
  const latestByCategory = getDocumentCategoryTotals(latestDoc)

  // Aggregate spending by category and transactions across the analysis window (latest 3 docs)
  // Fallback: compute directly from transactions if agent didn't run
  const { byCategory, byCategoryByMonth, transactionsByMonthAndCategory } = _accumulateCategoryData(analysisDocs)
  context.log(`[insights-api] All categories found:`, Object.keys(byCategory))
  context.log(`[insights-api] byCategory amounts:`, byCategory)
  context.log(`[insights-api] transactionsByMonthAndCategory keys:`, Object.keys(transactionsByMonthAndCategory))
  for (const [cat, monthData] of Object.entries(transactionsByMonthAndCategory)) {
    const totalTxs = monthData.reduce((sum, m) => sum + (m.transactions?.length || 0), 0)
    context.log(`[insights-api] Category "${cat}": ${monthData.length} months, ${totalTxs} total transactions`)
  }
  
  // Build monthlySummary from transactions (dynamic fallback if documentIntelligence not in agentResult)
  let monthlySummaryBuilt = _buildMonthlySummary(analysisDocs)
  
  // FALLBACK: If monthlySummary is empty, build it from available data using document dates
  if (Object.keys(monthlySummaryBuilt).length === 0 && analysisDocs.length > 0) {
    console.log(`[MONTHLY_SUMMARY_FALLBACK] monthlySummaryBuilt was empty, building from analysisDocs...`)
    // Use each document's analyzedAt date to assign categories to a month
    for (let docIdx = 0; docIdx < analysisDocs.length; docIdx++) {
      const doc = analysisDocs[docIdx]
      const analyzedAt = doc.analyzedAt || ''
      // Extract YYYY-MM from analyzedAt (e.g., "2026-03-26T..." → "2026-03")
      const month = analyzedAt.substring(0, 7)
      if (!month || month.length !== 7) continue
      
      if (!monthlySummaryBuilt[month]) {
        monthlySummaryBuilt[month] = { income: 0, expenses: 0, net: 0, byCategory: {} }
      }
      
      // Use category data from this document
      const catData = getDocumentCategoryTotals(doc)
      for (const [cat, amt] of Object.entries(catData)) {
        monthlySummaryBuilt[month].expenses += amt
        if (!monthlySummaryBuilt[month].byCategory[cat]) {
          monthlySummaryBuilt[month].byCategory[cat] = 0
        }
        monthlySummaryBuilt[month].byCategory[cat] += amt
      }
    }
    
    // Calculate net for each month
    for (const month in monthlySummaryBuilt) {
      monthlySummaryBuilt[month].net = monthlySummaryBuilt[month].income - monthlySummaryBuilt[month].expenses
    }
    console.log(`[MONTHLY_SUMMARY_FALLBACK] rebuilt with ${Object.keys(monthlySummaryBuilt).length} months:`, monthlySummaryBuilt)
  }

  // Average habit score across the analysis window
  const scores = analysisDocs.map(d =>
    d.agentResult?.summary?.habitWealthScore ?? d.insights?.habitWealthScore ?? 50
  )
  const habitScore = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)

  // Latest nudges from CBT agent — pick Spanish if requested and available
  const nudges_en = latestDoc.agentResult?.agents?.cbtIntervention?.nudges || []
  const nudges_es = latestDoc.agentResult?.agents?.cbtIntervention?.nudges_es || []
  const nudges = lang === 'es' && nudges_es.length > 0 ? nudges_es : nudges_en

  // Trend data from current analysis window
  const trendScores = analysisDocs.map(d =>
    d.agentResult?.summary?.habitWealthScore ?? d.insights?.habitWealthScore ?? 50
  )

  // Aggregate financial totals across the current analysis window
  const totalExpensesAll = analysisDocs.reduce((sum, d) =>
    sum + (d.agentResult?.agents?.documentIntelligence?.totalExpenses || 0), 0)
  const totalIncomeAll = analysisDocs.reduce((sum, d) =>
    sum + (d.agentResult?.agents?.documentIntelligence?.totalIncome || 0), 0)
  // FIX: netCashFlow should be recalculated from aggregated totals, not summed
  const netCashFlowAll = totalIncomeAll - totalExpensesAll
  
  // Calculate average monthly savings across all documents in analysis window
  // (not just the latest month, which would be unreliable)
  const totalSavingsAllMonths = analysisDocs.reduce((sum, doc) => {
    const docByCategory = getDocumentCategoryTotals(doc)
    return sum + getMonthlySavings(docByCategory, doc.transactions || [], doc)
  }, 0)
  const savingsMonthly = Math.round((totalSavingsAllMonths / analysisDocs.length) * 100) / 100
  const goalSummaries = buildGoalSummaries(
    latestDoc.goals || [],
    latestDoc.agentResult?.agents?.goalAlignment?.goals,
    savingsMonthly
  )
  const goalAlignmentScore = deriveGoalAlignmentScore(latestDoc.agentResult?.summary?.goalAlignmentScore, goalSummaries)
  
  let optimizationSummary = buildOptimizationSummary(
    latestDoc.agentResult?.agents?.goalOptimization,
    goalSummaries,
    savingsMonthly,
    latestDoc.agentResult?.summary?.fsiLevel || latestDoc.insights?.fsiLevel || 'Medium'
  )

  // If only fallback is available from historical docs, try AI generation on-demand.
  if (optimizationSummary.source === 'api-fallback') {
    const aiOptimization = await generateGoalOptimization({
      byCategory,
      weekendSpend: latestDoc.agentResult?.agents?.emotionalPattern?.weekendSpend || 0,
      primaryPattern: latestDoc.agentResult?.agents?.cbtIntervention?.primaryPattern || 'none',
      fsiLevel: latestDoc.agentResult?.summary?.fsiLevel || latestDoc.insights?.fsiLevel || 'Medium',
      goals: goalSummaries,
      currentMonthlySavings: savingsMonthly,
    })
    if (aiOptimization?.actions?.length) {
      optimizationSummary = aiOptimization
      context.log(`[insights-api] optimization generated on-demand (source: ${aiOptimization.source})`)
    }
  }

  // Score explanation — bilingual, pick correct language
  const scoreExpRaw = latestDoc.agentResult?.agents?.cbtIntervention?.scoreExplanation
  let scoreExplanation = (lang === 'es' ? scoreExpRaw?.es ?? scoreExpRaw?.en : scoreExpRaw?.en) ?? null

  // If explanation is missing (older docs), generate it via AI (or static fallback)
  if (!scoreExplanation) {
    scoreExplanation = await generateScoreExplanation({
      habitWealthScore: habitScore,
      netCashFlow:      netCashFlowAll,
      byCategory,
      fsiLevel:         latestDoc.agentResult?.summary?.fsiLevel || latestDoc.insights?.fsiLevel || 'Medium',
      dominantPattern:  latestDoc.agentResult?.agents?.cbtIntervention?.primaryPattern || 'none',
      weekendSpendAlert: latestDoc.agentResult?.agents?.cbtIntervention?.weekendSpendAlert || false,
    }, lang)
    context.log(`[insights-api] scoreExplanation generated on-demand (source: ${scoreExplanation?.source})`)
  }

  context.res = {
    status: 200,
    body: {
      userId,
      documentCount: analysisDocs.length,
      totalDocumentCount: docs.length,
      summary: {
        habitWealthScore:   habitScore,
        financialPersona:   twin?.financialPersona || 'Conscious Spender',
        fsiLevel:           latestDoc.agentResult?.summary?.fsiLevel || latestDoc.insights?.fsiLevel || 'Medium',
        goalAlignmentScore,
        topNudge:           latestDoc.agentResult?.summary?.topNudge || '',
        totalExpenses:      totalExpensesAll || Object.values(byCategory).reduce((s, v) => s + v, 0),
        totalIncome:        totalIncomeAll,
        netCashFlow:        netCashFlowAll,
        byCategory,
        byCategoryByMonth,  // Monthly breakdown: { "Utilities": [€950, €920, €891], ... }
        transactionsByMonthAndCategory,  // Top 5 transactions per category per month
        // Extract month from filename or analyzedAt date
        documentMonths: analysisDocs.map(d => _extractMonthFromFilename(d.filename, d.analyzedAt)),
        emotionVector:      twin?.emotionVector || {},
        weekendSpend:       latestDoc.agentResult?.agents?.emotionalPattern?.weekendSpend || 0,
        nudges,
        nudgeSource:        latestDoc.agentResult?.agents?.cbtIntervention?.nudgeSource || 'static',
        scoreExplanation,
        primaryPattern:     latestDoc.agentResult?.agents?.cbtIntervention?.primaryPattern || '',
        weekendSpendAlert:  latestDoc.agentResult?.agents?.cbtIntervention?.weekendSpendAlert || false,
        interventionUrgency: latestDoc.agentResult?.agents?.cbtIntervention?.interventionUrgency || 'Low',
        trendScores,
        goals: goalSummaries,
        optimization: optimizationSummary,  // NEW: Goal optimization recommendations
        // Include documentIntelligence with monthlySummary for frontend (built from transactions)
        documentIntelligence: {
          monthlySummary: monthlySummaryBuilt,
          transactionCount: analysisDocs.reduce((s, d) => s + (d.transactions || []).length, 0),
          totalIncome: totalIncomeAll,
          totalExpenses: totalExpensesAll,
          netCashFlow: netCashFlowAll,
          byCategory: byCategory,
          topMerchants: latestDoc.agentResult?.agents?.documentIntelligence?.topMerchants || []
        },
        agents: {
          documentIntelligence: latestDoc.agentResult?.agents?.documentIntelligence || {
            monthlySummary: monthlySummaryBuilt,
            transactionCount: analysisDocs.reduce((s, d) => s + (d.transactions || []).length, 0),
            totalIncome: totalIncomeAll,
            totalExpenses: totalExpensesAll,
            netCashFlow: netCashFlowAll,
            byCategory: byCategory,
            topMerchants: []
          }
        }
      },
      recentTransactions: (latestDoc.transactions || []).slice(0, 20),
      documents: analysisDocs.map(d => ({
        id:         d.id,
        filename:   d.filename,
        analyzedAt: d.analyzedAt,
        habitScore: d.agentResult?.summary?.habitWealthScore ?? d.insights?.habitWealthScore ?? 50,
        persona:    d.agentResult?.agents?.digitalTwin?.financialPersona || 'Unknown'
      }))
    }
  }
}
