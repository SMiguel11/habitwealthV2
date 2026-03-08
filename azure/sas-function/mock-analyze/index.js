/**
 * mock-analyze/index.js - HabitWealth
 * Local stub for Azure Document Intelligence + Event Grid.
 */
const fs   = require('fs')
const path = require('path')
const http = require('http')
const https = require('https')

const DB_PATH          = path.join(__dirname, '..', 'local-db.json')
const ENRICHMENT_AGENT = process.env.ENRICHMENT_AGENT_URL || 'http://127.0.0.1:8001'

function loadDb() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) } catch (e) { return { users: {} } }
}
function saveDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
}

function generateFakeTransactions(filename) {
  const categories = ['Food','Transport','Entertainment','Shopping','Health','Utilities','Savings']
  const merchants = {
    Food:          ["McDonald's",'Starbucks','Mercadona','Walmart','Sushi Bar'],
    Transport:     ['Uber','Renfe','Gas Station','Parking','Bolt'],
    Entertainment: ['Netflix','Spotify','Cinema','Steam','Twitch'],
    Shopping:      ['Amazon','Zara','IKEA','AliExpress','El Corte Ingles'],
    Health:        ['Pharmacy','Gym','Doctor','Dentist'],
    Utilities:     ['Electric Bill','Water Bill','Internet','Phone Bill'],
    Savings:       ['Bank Transfer - Savings','Investment Fund']
  }
  const txCount = 18 + Math.floor(Math.random() * 10)
  const transactions = []
  const now = new Date()
  for (let i = 0; i < txCount; i++) {
    const cat      = categories[Math.floor(Math.random() * categories.length)]
    const merchant = merchants[cat][Math.floor(Math.random() * merchants[cat].length)]
    const daysAgo  = Math.floor(Math.random() * 90)
    const txDate   = new Date(now - daysAgo * 86400000).toISOString().split('T')[0]
    const amount   = -(Math.round((5 + Math.random() * 195) * 100) / 100)
    transactions.push({ date: txDate, merchant, category: cat, amount, currency: 'EUR' })
  }
  return transactions.sort((a, b) => b.date.localeCompare(a.date))
}

function callEnrichmentAgent(payload) {
  return new Promise((resolve, reject) => {
    const body     = JSON.stringify(payload)
    const agentUrl = new URL(ENRICHMENT_AGENT)
    const driver   = agentUrl.protocol === 'https:' ? https : http
    const opts = {
      hostname: agentUrl.hostname,
      port:     agentUrl.port || (agentUrl.protocol === 'https:' ? 443 : 80),
      path:     '/enrich',
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }
    const req = driver.request(opts, res => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch (e) { reject(new Error('Invalid JSON from agent: ' + data.slice(0, 200))) }
      })
    })
    req.on('error', reject)
    req.setTimeout(10000, () => { req.destroy(new Error('Enrichment agent timeout')) })
    req.write(body)
    req.end()
  })
}

module.exports = async function (context, req) {
  const body = req.body || {}
  const blobUrl      = body.blobUrl || null
  const filename     = body.filename || null
  const userId       = body.userId || 'local-user'
  const goals        = body.goals || []
  const surveyAnswers = body.surveyAnswers || []

  if (!filename && !blobUrl) {
    context.res = { status: 400, body: { error: 'Provide filename or blobUrl' } }
    return
  }

  const transactions = generateFakeTransactions(filename || blobUrl)
  context.log('[mock-analyze] Extracted ' + transactions.length + ' transactions from ' + filename)

  let agentResult = null
  try {
    agentResult = await callEnrichmentAgent({ userId, filename, blobUrl, transactions, goals, surveyAnswers })
    context.log('[mock-analyze] Agent score: ' + (agentResult && agentResult.summary ? agentResult.summary.habitWealthScore : 'n/a'))
  } catch (err) {
    context.log.warn('[mock-analyze] Enrichment Agent unavailable: ' + err.message)
  }

  const db = loadDb()
  if (!db.users[userId]) db.users[userId] = { documents: [] }
  db.users[userId].documents.push({
    id:         Date.now().toString(),
    filename:   filename || blobUrl,
    analyzedAt: new Date().toISOString(),
    transactions,
    agentResult: agentResult || null,
    insights:   (agentResult && agentResult.summary) ? agentResult.summary : { habitWealthScore: 50, fsiLevel: 'Medium', byCategory: {} }
  })
  saveDb(db)

  context.res = {
    status: 200,
    body: {
      success:      true,
      filename,
      transactions,
      agentPipeline: agentResult || null,
      insights:      (agentResult && agentResult.summary) ? agentResult.summary : null
    }
  }
}