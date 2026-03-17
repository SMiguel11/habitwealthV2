/**
 * insights-api/index.js
 * Returns aggregated Digital Twin insights for a userId.
 * Uses Cosmos DB in production, falls back to /tmp JSON locally.
 */
const { getDocuments } = require('../shared/cosmos-db')
const https = require('https')

function getMonthlySavings(byCategory = {}, transactions = []) {
  for (const [key, value] of Object.entries(byCategory || {})) {
    const normalized = String(key || '').trim().toLowerCase()
    if (normalized === 'savings' || normalized === 'saving' || normalized === 'ahorros' || normalized === 'ahorro' || normalized.includes('saving') || normalized.includes('ahorr') || normalized.includes('invers')) {
      return Math.round(Math.abs(Number(value) || 0) * 100) / 100
    }
  }

  return Math.round(
    (transactions || []).reduce((sum, tx) => {
      const amount = Number(tx?.amount) || 0
      const category = String(tx?.category || '').toLowerCase()
      const merchant = String(tx?.merchant || '').toLowerCase()
      const looksLikeSavings = category.includes('saving') || category.includes('ahorr') || merchant.includes('ahorro') || merchant.includes('myinvestor') || merchant.includes('etf') || merchant.includes('investment')
      return looksLikeSavings && amount < 0 ? sum + Math.abs(amount) : sum
    }, 0) * 100
  ) / 100
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
function _callOpenAI(endpoint, deployment, apiKey, prompt) {
  return new Promise((resolve) => {
    try {
      const url = new URL(`/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`, endpoint)
      const body = JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 350,
      })
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

/**
 * Build a rule-based explanation (bilingual) from summary data.
 * Used as fallback when Azure OpenAI is not configured.
 */
function _staticExplanation(score, netFlow, hasSavings, fsiLevel, weekendAlert, dominant, lang) {
  const es = lang === 'es'
  const pos = []
  const warn = []
  if (netFlow > 0)   pos.push(es ? 'Tus ingresos superaron tus gastos este período' : 'Your income exceeded your spending this period')
  if (hasSavings)    pos.push(es ? 'Realizaste una aportación a ahorros o inversión' : 'You made a savings or investment contribution')
  if (score >= 70)   pos.push(es ? 'Tus hábitos financieros están por encima de la media' : 'Your overall financial habits are above average')
  if (!weekendAlert && dominant === 'none') pos.push(es ? 'No se detectaron patrones de gasto impulsivo' : 'No significant impulse-spending patterns detected')
  if (pos.length === 0) pos.push(es ? 'Estás haciendo seguimiento activo de tus finanzas' : 'You are actively tracking your finances — great first step')
  if (weekendAlert)       warn.push(es ? 'Se detectó gasto elevado los fines de semana' : 'High weekend spending pattern detected')
  else if (fsiLevel === 'High') warn.push(es ? 'Tu índice de estrés financiero es elevado — revisa tus gastos fijos' : 'Your financial stress index is elevated — review fixed costs')
  return { positives: pos.slice(0, 3), warnings: warn.slice(0, 1), source: 'static' }
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

  // Aggregate spending by category across the analysis window (latest 3 docs)
  // Fallback: compute directly from transactions if agent didn't run
  const byCategory = {}
  const byCategoryByMonth = {}  // Monthly breakdown per category
  const transactionsByMonthAndCategory = {}  // Detailed transactions: { "Utilities": [{ month: 2, txs: [...] }, ...] }
  
  for (let docIdx = 0; docIdx < analysisDocs.length; docIdx++) {
    const doc = analysisDocs[docIdx]
    const catMap = getDocumentCategoryTotals(doc)
    const transactions = doc.transactions || []
    
    // Extract month from filename/analyzedAt (use same logic as frontend)
    let monthNum = null
    const filename = (doc.filename || '').toLowerCase()
    
    // Try filename patterns
    const monthMatch = filename.match(/_(\d{1,2})_/)
    if (monthMatch) monthNum = parseInt(monthMatch[1], 10)
    
    // Try Spanish month names
    if (!monthNum) {
      if (filename.includes('diciembre')) monthNum = 12
      else if (filename.includes('enero')) monthNum = 1
      else if (filename.includes('febrero')) monthNum = 2
      // ... other months
    }
    
    // Try English month names
    if (!monthNum) {
      if (filename.includes('january') || filename.includes('jan')) monthNum = 1
      else if (filename.includes('february') || filename.includes('feb')) monthNum = 2
      else if (filename.includes('december') || filename.includes('dec')) monthNum = 12
      // ... other months
    }
    
    // Fallback to analyzedAt month
    if (!monthNum && doc.analyzedAt) {
      try {
        const date = new Date(doc.analyzedAt)
        monthNum = date.getMonth() + 1
      } catch { /* use null */ }
    }
    
    // Group transactions by category for this month
    const txsByCategory = {}
    for (const tx of transactions) {
      const cat = tx.category || 'Other'
      const amount = Math.abs(Number(tx.amount) || 0)
      if (amount > 0) {  // only expenses (negative amounts)
        if (!txsByCategory[cat]) txsByCategory[cat] = []
        txsByCategory[cat].push({
          merchant: tx.merchant,
          amount: Math.round(amount * 100) / 100
        })
      }
    }
    
    // Sort by amount desc and keep top 5 per category
    for (const [cat, txs] of Object.entries(txsByCategory)) {
      const sorted = txs.sort((a, b) => b.amount - a.amount).slice(0, 5)
      if (!transactionsByMonthAndCategory[cat]) {
        transactionsByMonthAndCategory[cat] = []
      }
      transactionsByMonthAndCategory[cat].push({
        month: monthNum,
        transactions: sorted
      })
    }
    
    if (Object.keys(catMap).length > 0) {
      for (const [cat, amt] of Object.entries(catMap)) {
        byCategory[cat] = (byCategory[cat] || 0) + amt
        // Track monthly breakdown
        if (!byCategoryByMonth[cat]) byCategoryByMonth[cat] = []
        byCategoryByMonth[cat][docIdx] = Math.round(amt * 100) / 100
      }
    }
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
    return sum + getMonthlySavings(docByCategory, doc.transactions || [])
  }, 0)
  const savingsMonthly = Math.round((totalSavingsAllMonths / analysisDocs.length) * 100) / 100
  const goalSummaries = buildGoalSummaries(
    latestDoc.goals || [],
    latestDoc.agentResult?.agents?.goalAlignment?.goals,
    savingsMonthly
  )
  const goalAlignmentScore = deriveGoalAlignmentScore(latestDoc.agentResult?.summary?.goalAlignmentScore, goalSummaries)
  
  const optimizationSummary = buildOptimizationSummary(
    latestDoc.agentResult?.agents?.goalOptimization,
    goalSummaries,
    savingsMonthly,
    latestDoc.agentResult?.summary?.fsiLevel || latestDoc.insights?.fsiLevel || 'Medium'
  )

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
        // Extract month from filename, with fallback to analyzedAt date
        documentMonths: analysisDocs.map(d => {
          const filename = (d.filename || '').toLowerCase()
          
          // Try to extract month number from filename patterns like "_12_"
          const monthMatch = filename.match(/_(\d{1,2})_/)
          if (monthMatch) return parseInt(monthMatch[1], 10)
          
          // Try Spanish month names in filename
          if (filename.includes('diciembre')) return 12
          if (filename.includes('enero')) return 1
          if (filename.includes('febrero')) return 2
          if (filename.includes('marzo')) return 3
          if (filename.includes('abril')) return 4
          if (filename.includes('mayo')) return 5
          if (filename.includes('junio')) return 6
          if (filename.includes('julio')) return 7
          if (filename.includes('agosto')) return 8
          if (filename.includes('septiembre') || filename.includes('setiembre')) return 9
          if (filename.includes('octubre')) return 10
          if (filename.includes('noviembre')) return 11
          
          // Try English month names in filename
          if (filename.includes('january') || filename.includes('jan')) return 1
          if (filename.includes('february') || filename.includes('feb')) return 2
          if (filename.includes('march') || filename.includes('mar')) return 3
          if (filename.includes('april') || filename.includes('apr')) return 4
          if (filename.includes('may')) return 5
          if (filename.includes('june') || filename.includes('jun')) return 6
          if (filename.includes('july') || filename.includes('jul')) return 7
          if (filename.includes('august') || filename.includes('aug')) return 8
          if (filename.includes('september') || filename.includes('sept')) return 9
          if (filename.includes('october') || filename.includes('oct')) return 10
          if (filename.includes('november') || filename.includes('nov')) return 11
          if (filename.includes('december') || filename.includes('dec')) return 12
          
          // Fallback: extract month from analyzedAt date (YYYY-MM-DDTHH:mm:ss.sssZ)
          if (d.analyzedAt) {
            try {
              const date = new Date(d.analyzedAt)
              return date.getMonth() + 1  // getMonth() returns 0-11, so add 1
            } catch { /* fall through */ }
          }
          
          return null  // Could not determine month
        }),
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
