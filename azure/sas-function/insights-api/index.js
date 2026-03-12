/**
 * insights-api/index.js
 * Returns aggregated Digital Twin insights for a userId.
 * Uses Cosmos DB in production, falls back to /tmp JSON locally.
 */
const { getDocuments } = require('../shared/cosmos-db')
const https = require('https')

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
  const hasSavings = (byCategory?.Savings || byCategory?.savings || 0) > 0
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

  // Sort by analyzedAt ascending for timeline
  docs.sort((a, b) => (a.analyzedAt || '').localeCompare(b.analyzedAt || ''))
  const latestDoc = docs[docs.length - 1]
  const twin      = latestDoc.agentResult?.agents?.digitalTwin

  // Aggregate spending by category across all docs
  // Fallback: compute directly from transactions if agent didn't run
  const byCategory = {}
  for (const doc of docs) {
    const catMap = doc.agentResult?.agents?.documentIntelligence?.byCategory || null
    if (catMap && Object.keys(catMap).length > 0) {
      for (const [cat, amt] of Object.entries(catMap)) {
        byCategory[cat] = (byCategory[cat] || 0) + amt
      }
    } else {
      // Compute from raw transactions
      for (const tx of (doc.transactions || [])) {
        if (tx.amount < 0) {
          const cat = tx.category || 'Other'
          byCategory[cat] = (byCategory[cat] || 0) + Math.abs(tx.amount)
        }
      }
    }
  }

  // Average habit score across docs
  const scores = docs.map(d =>
    d.agentResult?.summary?.habitWealthScore ?? d.insights?.habitWealthScore ?? 50
  )
  const habitScore = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)

  // Latest nudges from CBT agent — pick Spanish if requested and available
  const nudges_en = latestDoc.agentResult?.agents?.cbtIntervention?.nudges || []
  const nudges_es = latestDoc.agentResult?.agents?.cbtIntervention?.nudges_es || []
  const nudges = lang === 'es' && nudges_es.length > 0 ? nudges_es : nudges_en

  // Trend data (last 7 scores)
  const trendScores = docs.slice(-7).map(d =>
    d.agentResult?.summary?.habitWealthScore ?? d.insights?.habitWealthScore ?? 50
  )

  // Aggregate financial totals across ALL documents (not just latest)
  const totalExpensesAll = docs.reduce((sum, d) =>
    sum + (d.agentResult?.agents?.documentIntelligence?.totalExpenses || 0), 0)
  const totalIncomeAll = docs.reduce((sum, d) =>
    sum + (d.agentResult?.agents?.documentIntelligence?.totalIncome || 0), 0)
  const netCashFlowAll = docs.reduce((sum, d) =>
    sum + (d.agentResult?.agents?.documentIntelligence?.netCashFlow || 0), 0)

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
      documentCount: docs.length,
      summary: {
        habitWealthScore:   habitScore,
        financialPersona:   twin?.financialPersona || 'Conscious Spender',
        fsiLevel:           latestDoc.agentResult?.summary?.fsiLevel || latestDoc.insights?.fsiLevel || 'Medium',
        goalAlignmentScore: latestDoc.agentResult?.summary?.goalAlignmentScore || 0,
        topNudge:           latestDoc.agentResult?.summary?.topNudge || '',
        totalExpenses:      totalExpensesAll || Object.values(byCategory).reduce((s, v) => s + v, 0),
        totalIncome:        totalIncomeAll,
        netCashFlow:        netCashFlowAll,
        byCategory,
        emotionVector:      twin?.emotionVector || {},
        weekendSpend:       latestDoc.agentResult?.agents?.emotionalPattern?.weekendSpend || 0,
        nudges,
        nudgeSource:        latestDoc.agentResult?.agents?.cbtIntervention?.nudgeSource || 'static',
        scoreExplanation,
        primaryPattern:     latestDoc.agentResult?.agents?.cbtIntervention?.primaryPattern || '',
        weekendSpendAlert:  latestDoc.agentResult?.agents?.cbtIntervention?.weekendSpendAlert || false,
        interventionUrgency: latestDoc.agentResult?.agents?.cbtIntervention?.interventionUrgency || 'Low',
        trendScores,
        goals: latestDoc.agentResult?.agents?.goalAlignment?.goals
            || (latestDoc.goals || []).map(g => ({
                goal: g.description,
                monthlyNeeded: Math.round(g.targetAmount / Math.max(g.deadlineMonths, 1) * 100) / 100,
                currentSavings: 0,
                onTrack: false,
                projectedMonths: null
               })),
        goalAlignmentScore: latestDoc.agentResult?.summary?.goalAlignmentScore || 0,
      },
      recentTransactions: (latestDoc.transactions || []).slice(0, 20),
      documents: docs.map(d => ({
        id:         d.id,
        filename:   d.filename,
        analyzedAt: d.analyzedAt,
        habitScore: d.agentResult?.summary?.habitWealthScore ?? d.insights?.habitWealthScore ?? 50,
        persona:    d.agentResult?.agents?.digitalTwin?.financialPersona || 'Unknown'
      }))
    }
  }
}
