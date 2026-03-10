/**
 * mock-analyze/index.js - HabitWealth
 * Extracts transactions from uploaded PDF via Azure Document Intelligence.
 * Falls back to generated mock data if DI credentials are not configured.
 */
const fs   = require('fs')
const path = require('path')
const http = require('http')
const https = require('https')
const os   = require('os')
const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob')

const DB_PATH          = path.join(os.tmpdir(), 'habitwealth-db.json')
const ENRICHMENT_AGENT = process.env.ENRICHMENT_AGENT_URL || 'http://127.0.0.1:8001'

function loadDb() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) } catch (e) { return { users: {} } }
}
function saveDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
}

// ── Download blob bytes from Azure Storage ────────────────────────────────────
async function downloadBlobBuffer(blobUrl) {
  const accountName  = process.env.AZURE_STORAGE_ACCOUNT_NAME
  const accountKey   = process.env.AZURE_STORAGE_ACCOUNT_KEY
  const blobEndpoint = process.env.AZURE_STORAGE_BLOB_ENDPOINT || `https://${accountName}.blob.core.windows.net`
  const credential   = new StorageSharedKeyCredential(accountName, accountKey)
  const client       = new BlobServiceClient(blobEndpoint, credential)

  // blobUrl: https://account.blob.core.windows.net/container/blobname
  const url   = new URL(blobUrl)
  const parts = url.pathname.split('/').filter(Boolean)
  const containerName = parts[0]
  const blobName      = parts.slice(1).join('/')

  return client.getContainerClient(containerName).getBlockBlobClient(blobName).downloadToBuffer()
}

// ── Low-level HTTP helper (supports binary body) ──────────────────────────────
function httpRaw(url, method, headers, body) {
  return new Promise((resolve, reject) => {
    const driver = url.protocol === 'https:' ? https : http
    const req = driver.request({
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname + (url.search || ''),
      method,
      headers:  { ...headers, 'Content-Length': body ? Buffer.byteLength(body) : 0 }
    }, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end',  () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }))
    })
    req.on('error', reject)
    req.setTimeout(60000, () => req.destroy(new Error('DI request timeout')))
    if (body) req.write(body)
    req.end()
  })
}

// ── Call Document Intelligence (prebuilt-layout) ─────────────────────────────
async function analyzeWithDocumentIntelligence(pdfBuffer, context) {
  const endpoint = (process.env.DOCUMENT_INTELLIGENCE_ENDPOINT || '').replace(/\/$/, '')
  const key      = process.env.DOCUMENT_INTELLIGENCE_KEY
  if (!endpoint || !key) return null

  const submitUrl = new URL(`${endpoint}/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=2024-11-30`)
  const submitRes = await httpRaw(submitUrl, 'POST', {
    'Content-Type': 'application/pdf',
    'Ocp-Apim-Subscription-Key': key
  }, pdfBuffer)

  if (submitRes.status !== 202) {
    context.log.warn('[DI] Submit failed: ' + submitRes.status + ' ' + submitRes.body.slice(0, 200))
    return null
  }

  const operationUrl = new URL(submitRes.headers['operation-location'])
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000))
    const poll = await httpRaw(operationUrl, 'GET', { 'Ocp-Apim-Subscription-Key': key })
    const data = JSON.parse(poll.body)
    if (data.status === 'succeeded') return data.analyzeResult
    if (data.status === 'failed') { context.log.warn('[DI] Analysis failed'); return null }
  }
  context.log.warn('[DI] Analysis timed out')
  return null
}

// ── Parse DI table result into transactions ───────────────────────────────────
const CATEGORY_MAP = {
  'ingresos':       'Income',
  'hogar':          'Utilities', 'suministro': 'Utilities',
  'salud':          'Health',
  'transporte':     'Transport',
  'restaurante':    'Food',      'alimentaci': 'Food',
  'entretenimiento':'Entertainment',
  'compra':         'Shopping',
  'ahorro':         'Savings',   'inversi':    'Savings'
}

function mapCategory(raw) {
  const lower = (raw || '').toLowerCase()
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return val
  }
  return 'Other'
}

function parseAmount(str) {
  const s = (str || '').replace(/\s|€|\$/g, '')
  const negative = s.startsWith('-') || s.includes('−')
  const num = parseFloat(s.replace(/[+\-−]/g, '').replace(/,/g, ''))
  return isNaN(num) ? 0 : (negative ? -num : num)
}

function parseTransactionsFromDI(analyzeResult) {
  const transactions = []
  for (const table of (analyzeResult.tables || [])) {
    const headers = {}
    for (const cell of table.cells) {
      if (cell.rowIndex === 0) headers[cell.columnIndex] = cell.content.toLowerCase()
    }
    const hasDate = Object.values(headers).some(h => h.includes('fecha') || h === 'date')
    if (!hasDate) continue

    const dateCol = +Object.keys(headers).find(i => headers[i].includes('fecha') || headers[i] === 'date')
    const descCol = +Object.keys(headers).find(i => headers[i].includes('descripci') || headers[i].includes('desc') || headers[i].includes('concepto'))
    const catCol  = +Object.keys(headers).find(i => headers[i].includes('categor'))
    const amtCol  = +Object.keys(headers).find(i => headers[i].includes('importe') || headers[i].includes('amount'))

    const rows = {}
    for (const cell of table.cells) {
      if (cell.rowIndex === 0) continue
      if (!rows[cell.rowIndex]) rows[cell.rowIndex] = {}
      rows[cell.rowIndex][cell.columnIndex] = cell.content
    }

    for (const row of Object.values(rows)) {
      const desc   = (row[descCol] || '').trim()
      if (!desc) continue
      const dateRaw  = row[dateCol] || ''
      const dateParts = dateRaw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
      const date     = dateParts ? `${dateParts[3]}-${dateParts[2].padStart(2,'0')}-${dateParts[1].padStart(2,'0')}` : dateRaw
      let amount     = parseAmount(row[amtCol] || '0')
      const category = mapCategory(row[catCol] || desc)
      // If amount is positive and not Income/Savings, treat as expense (negative)
      // Many bank statements show expenses as positive numbers in a "Cargo" column
      if (amount > 0 && category !== 'Income' && category !== 'Savings') {
        amount = -amount
      }
      transactions.push({ date, merchant: desc, category, amount, currency: 'EUR' })
    }
  }
  return transactions
}

// ── Fallback: random mock transactions ────────────────────────────────────────
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
  const blobUrl       = body.blobUrl || null
  const filename      = body.filename || null
  const userId        = body.userId || 'local-user'
  const goals         = body.goals || []
  const surveyAnswers = body.surveyAnswers || []

  if (!filename && !blobUrl) {
    context.res = { status: 400, body: { error: 'Provide filename or blobUrl' } }
    return
  }

  // Try Document Intelligence first; fall back to fake transactions
  let transactions = null
  if (blobUrl && process.env.DOCUMENT_INTELLIGENCE_ENDPOINT && process.env.DOCUMENT_INTELLIGENCE_KEY) {
    try {
      context.log('[mock-analyze] Downloading blob for DI analysis: ' + blobUrl)
      const pdfBuffer    = await downloadBlobBuffer(blobUrl)
      const analyzeResult = await analyzeWithDocumentIntelligence(pdfBuffer, context)
      if (analyzeResult) {
        transactions = parseTransactionsFromDI(analyzeResult)
        context.log('[mock-analyze] DI extracted ' + transactions.length + ' transactions')
      }
    } catch (err) {
      context.log.warn('[mock-analyze] DI failed, using fake data: ' + err.message)
    }
  }
  if (!transactions || transactions.length === 0) {
    transactions = generateFakeTransactions(filename || blobUrl)
    context.log('[mock-analyze] Using fake transactions (' + transactions.length + ')')
  }

  let agentResult = null
  try {
    agentResult = await callEnrichmentAgent({ userId, filename, blobUrl, transactions, goals, surveyAnswers })
    context.log('[mock-analyze] Agent score: ' + (agentResult && agentResult.summary ? agentResult.summary.habitWealthScore : 'n/a'))
  } catch (err) {
    context.log.warn('[mock-analyze] Enrichment Agent unavailable: ' + err.message)
  }

  const db = loadDb()
  if (!db.users[userId]) db.users[userId] = { documents: [] }
  const newDoc = {
    id:         Date.now().toString(),
    filename:   filename || blobUrl,
    analyzedAt: new Date().toISOString(),
    transactions,
    agentResult: agentResult || null,
    insights:   (agentResult && agentResult.summary) ? agentResult.summary : { habitWealthScore: 50, fsiLevel: 'Medium', byCategory: {} }
  }
  // Upsert: replace existing document with same filename instead of duplicating
  const existingIdx = db.users[userId].documents.findIndex(d => d.filename === newDoc.filename)
  if (existingIdx >= 0) {
    db.users[userId].documents[existingIdx] = newDoc
  } else {
    db.users[userId].documents.push(newDoc)
  }
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