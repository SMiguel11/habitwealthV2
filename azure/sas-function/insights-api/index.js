/**
 * insights-api/index.js
 * Returns aggregated Digital Twin insights for a userId.
 * Uses Cosmos DB in production, falls back to /tmp JSON locally.
 */
const { getDocuments } = require('../shared/cosmos-db')

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

  // Score explanation — bilingual, pick correct language
  const scoreExpRaw = latestDoc.agentResult?.agents?.cbtIntervention?.scoreExplanation
  const scoreExplanation = (lang === 'es' ? scoreExpRaw?.es ?? scoreExpRaw?.en : scoreExpRaw?.en) ?? null

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
