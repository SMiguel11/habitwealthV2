/**
 * insights-api/index.js
 * Returns aggregated Digital Twin insights for a userId from local-db.json.
 * In production this queries Cosmos DB (API NoSQL).
 */
const fs   = require('fs')
const path = require('path')
const os   = require('os')

const DB_PATH = path.join(os.tmpdir(), 'habitwealth-db.json')

function loadDb() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) } catch { return { users: {} } }
}

module.exports = async function (context, req) {
  const userId   = req.query.userId || 'local-user'
  const db       = loadDb()
  const userData = db.users[userId]

  if (!userData || !userData.documents.length) {
    context.res = {
      status: 200,
      body: { documents: [], summary: null, message: 'No documents analyzed yet.' }
    }
    return
  }

  const docs      = userData.documents
  const latestDoc = docs[docs.length - 1]
  const twin      = latestDoc.agentResult?.agents?.digitalTwin

  // Aggregate spending by category across all docs
  const byCategory = {}
  for (const doc of docs) {
    const catMap = doc.agentResult?.agents?.documentIntelligence?.byCategory
                || doc.insights?.byCategory
                || {}
    for (const [cat, amt] of Object.entries(catMap)) {
      byCategory[cat] = (byCategory[cat] || 0) + amt
    }
  }

  // Average habit score across docs
  const scores = docs.map(d =>
    d.agentResult?.summary?.habitWealthScore ?? d.insights?.habitWealthScore ?? 50
  )
  const habitScore = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)

  // Latest nudges from CBT agent
  const nudges = latestDoc.agentResult?.agents?.cbtIntervention?.nudges || []

  // Trend data (last 7 scores)
  const trendScores = docs.slice(-7).map(d =>
    d.agentResult?.summary?.habitWealthScore ?? d.insights?.habitWealthScore ?? 50
  )

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
        totalExpenses:      latestDoc.agentResult?.agents?.documentIntelligence?.totalExpenses || 0,
        netCashFlow:        latestDoc.agentResult?.agents?.documentIntelligence?.netCashFlow || 0,
        byCategory,
        emotionVector:      twin?.emotionVector || {},
        weekendSpend:       latestDoc.agentResult?.agents?.emotionalPattern?.weekendSpend || 0,
        nudges,
        trendScores,
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
