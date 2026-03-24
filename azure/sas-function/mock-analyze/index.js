/**
 * mock-analyze/index.js - HabitWealth
 * Extracts transactions from uploaded PDF via Azure Document Intelligence.
 * Falls back to generated mock data if DI credentials are not configured.
 */
const http = require('node:http')
const https = require('node:https')
const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob')
const { upsertDocument } = require('../shared/cosmos-db')

const ENRICHMENT_AGENT = process.env.ENRICHMENT_AGENT_URL || 'http://127.0.0.1:8001'

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
  if (!endpoint || !key) {
    context.log('[DI] Skipped: endpoint or key not configured')
    return null
  }

  context.log('[DI] Starting Document Intelligence analysis...')
  context.log('[DI] Endpoint: ' + endpoint)
  context.log('[DI] PDF Buffer size: ' + pdfBuffer.length + ' bytes')

  const submitUrl = new URL(`${endpoint}/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=2024-11-30`)
  const submitRes = await httpRaw(submitUrl, 'POST', {
    'Content-Type': 'application/pdf',
    'Ocp-Apim-Subscription-Key': key
  }, pdfBuffer)

  if (submitRes.status !== 202) {
    context.log.warn('[DI] Submit failed: ' + submitRes.status + ' ' + submitRes.body.slice(0, 200))
    return null
  }

  context.log('[DI] PDF submitted successfully, polling for results...')
  const operationUrl = new URL(submitRes.headers['operation-location'])
  
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000))
    const poll = await httpRaw(operationUrl, 'GET', { 'Ocp-Apim-Subscription-Key': key })
    const data = JSON.parse(poll.body)
    context.log('[DI] Poll ' + (i+1) + '/20 — status: ' + data.status)
    
    if (data.status === 'succeeded') {
      context.log('[DI] SUCCESS! Analysis complete')
      context.log('[DI] Pages: ' + (data.analyzeResult?.pages?.length || 0))
      context.log('[DI] Tables: ' + (data.analyzeResult?.tables?.length || 0))
      context.log('[DI] Paragraphs: ' + (data.analyzeResult?.paragraphs?.length || 0))
      return data.analyzeResult
    }
    if (data.status === 'failed') { 
      context.log.warn('[DI] Analysis FAILED: ' + JSON.stringify(data.errors || []).slice(0, 300))
      return null 
    }
  }
  context.log.warn('[DI] Analysis TIMED OUT after 60 seconds')
  return null
}

// ── Parse DI table result into transactions ───────────────────────────────────
const CATEGORY_MAP = {
  // Income — must be first so salary/freelance are never flipped to expenses
  'ingresos':       'Income',
  'nómin':          'Income',   'nomina':     'Income',
  'salario':        'Income',   'sueldo':     'Income',
  'freelance':      'Income',
  'transferencia recib': 'Income',
  'abono':          'Income',
  // Expenses
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
  const s = (str || '').replaceAll(/\s|€|\$/g, '')
  const negative = s.startsWith('-') || s.includes('−')
  let numStr = s.replaceAll(/[+\-−]/g, '').trim()

  const lastDot   = numStr.lastIndexOf('.')
  const lastComma = numStr.lastIndexOf(',')

  if (lastDot !== -1 && lastComma !== -1) {
    // Both separators present — the LAST one is the decimal separator
    if (lastDot > lastComma) {
      // Anglo-Saxon: 2,800.00 — comma=thousands, dot=decimal
      numStr = numStr.replaceAll(',', '')
    } else {
      // European: 2.800,00 — dot=thousands, comma=decimal
      numStr = numStr.replaceAll('.', '').replace(',', '.')
    }
  } else if (lastComma !== -1) {
    // Only comma: decimal if ≤2 digits after it, thousands otherwise
    const afterComma = numStr.slice(lastComma + 1)
    numStr = afterComma.length <= 2
      ? numStr.replace(',', '.')   // 22,08 → 22.08
      : numStr.replaceAll(',', '')   // 1,234 → 1234
  }
  // Only dot: already valid JS float (e.g. 22.08 or 1234.56)

  const num = Number.parseFloat(numStr)
  const signedNum = negative ? -num : num
  return Number.isNaN(num) ? 0 : signedNum
}

// Rows that are balance/summary lines — not real transactions
const SKIP_DESC_PREFIXES = ['saldo', 'total', 'balance', 'subtotal', 'resumen']

/**
 * Build header map from first row of a table.
 */
function _buildHeaderMap(table) {
  const headers = {}
  let maxCol = 0
  for (const cell of table.cells) {
    if (cell.columnIndex > maxCol) maxCol = cell.columnIndex
    if (cell.rowIndex === 0) headers[cell.columnIndex] = cell.content.toLowerCase()
  }
  return { headers, colCount: maxCol + 1 }
}

/**
 * Determine which headers to use (new or continuation) and whether to skip row 0.
 */
function _determineActiveHeaders(headers, hasDate, lastHeaders, colCount, lastColCount) {
  if (hasDate) {
    return { activeHeaders: headers, skipRow0: true, shouldProcess: true }
  }
  if (lastHeaders && colCount >= lastColCount - 1) {
    return { activeHeaders: lastHeaders, skipRow0: false, shouldProcess: true }
  }
  return { activeHeaders: null, skipRow0: false, shouldProcess: false }
}

/**
 * Find a column index by matching header content against search terms.
 */
function _findColumnIndex(activeHeaders, searchTerms) {
  const idx = Object.keys(activeHeaders).find(i => 
    searchTerms.some(term => activeHeaders[i].includes(term))
  )
  return idx ? +idx : Number.NaN
}

/**
 * Collect all rows from a table, skipping row 0 if needed.
 */
function _collectTableRows(table, skipRow0) {
  const rows = {}
  for (const cell of table.cells) {
    if (skipRow0 && cell.rowIndex === 0) continue
    if (!rows[cell.rowIndex]) rows[cell.rowIndex] = {}
    rows[cell.rowIndex][cell.columnIndex] = cell.content
  }
  return rows
}

/**
 * Normalize amount sign based on category (Income positive, others negative).
 */
function _normalizeAmountSign(amount, category) {
  if (category === 'Income') {
    return amount < 0 ? Math.abs(amount) : amount
  }
  // Savings transfers (ahorro, ETF) are debits — keep them negative
  return amount > 0 ? -amount : amount
}

/**
 * Parse a single table row into a transaction.
 */
function _parseRowTransaction(row, dateCol, descCol, catCol, amtCol) {
  const desc = (row[descCol] || '').trim()
  if (!desc) return null

  // Skip balance/summary rows
  const descLower = desc.toLowerCase()
  if (SKIP_DESC_PREFIXES.some(p => descLower.startsWith(p))) return null

  const dateRaw = row[dateCol] || ''
  // Skip rows without recognizable date
  if (!dateRaw.match(/\d{1,2}[/ -]\d{1,2}[/ -]\d{4}/)) return null

  const dateParts = dateRaw.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  const date = dateParts
    ? `${dateParts[3]}-${dateParts[2].padStart(2,'0')}-${dateParts[1].padStart(2,'0')}`
    : dateRaw

  let amount = parseAmount(row[amtCol] || '0')
  const category = mapCategory(row[catCol] || desc)
  amount = _normalizeAmountSign(amount, category)

  return { date, merchant: desc, category, amount, currency: 'EUR' }
}

/**
 * Process all table-based transactions.
 */
function _processTableTransactions(analyzeResult) {
  const transactions = []
  let lastHeaders = null
  let lastColCount = 0
  let tableCount = 0

  for (const table of (analyzeResult.tables || [])) {
    tableCount++
    const { headers, colCount } = _buildHeaderMap(table)
    const hasDate = Object.values(headers).some(h => h.includes('fecha') || h === 'date')

    console.log(`[TABLE ${tableCount}] Headers: ${JSON.stringify(headers).slice(0, 100)}`)
    console.log(`[TABLE ${tableCount}] Has date? ${hasDate}, ColCount: ${colCount}`)

    const { activeHeaders, skipRow0, shouldProcess } = _determineActiveHeaders(
      headers, hasDate, lastHeaders, colCount, lastColCount
    )
    if (!shouldProcess) {
      console.log(`[TABLE ${tableCount}] SKIPPED — no active headers`)
      continue
    }

    if (hasDate) {
      lastHeaders = headers
      lastColCount = colCount
    }

    const dateCol = _findColumnIndex(activeHeaders, ['fecha', 'date'])
    const descCol = _findColumnIndex(activeHeaders, ['descripci', 'desc', 'concepto'])
    const catCol = _findColumnIndex(activeHeaders, ['categor'])
    const amtCol = _findColumnIndex(activeHeaders, ['importe', 'amount'])

    console.log(`[TABLE ${tableCount}] Columns: dateCol=${dateCol} descCol=${descCol} catCol=${catCol} amtCol=${amtCol}`)

    const rows = _collectTableRows(table, skipRow0)
    let txCount = 0
    for (const row of Object.values(rows)) {
      const tx = _parseRowTransaction(row, dateCol, descCol, catCol, amtCol)
      if (tx) {
        transactions.push(tx)
        txCount++
        console.log(`[TABLE ${tableCount}] TX ${txCount}: ${tx.date} | ${tx.merchant.slice(0, 30)} | ${tx.category} | €${tx.amount}`)
      }
    }
    console.log(`[TABLE ${tableCount}] Extracted ${txCount} transactions`)
  }

  console.log(`[TABLES] Total transactions extracted: ${transactions.length}`)
  return transactions
}

/**
 * Extract all lines from all pages.
 */
function _extractPageLines(analyzeResult) {
  const allLines = []
  for (const page of (analyzeResult.pages || [])) {
    for (const line of (page.lines || [])) {
      allLines.push((line.content || '').trim())
    }
  }
  return allLines
}

/**
 * Parse a single line-based transaction.
 */
function _parseLineTransaction(i, allLines, known, normalizeFunc) {
  const DATE_RE = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
  const AMT_RE = /^[+\-−]?\d/

  const dm = allLines[i].match(DATE_RE)
  if (!dm) return { tx: null, skip: 0 }

  const desc = allLines[i + 1] || ''
  const catRaw = allLines[i + 2] || ''

  // Try amount at i+3 or fused into catRaw
  let amtStr = allLines[i + 3] || ''
  let skip = 4

  if (!AMT_RE.test(amtStr)) {
    const fused = catRaw.match(/([+\-−]\d[\d.,]*)/)
    if (fused) {
      amtStr = fused[1]
      skip = 3
    } else {
      return { tx: null, skip: 0 }
    }
  }

  // Skip summary rows
  const descLower = desc.toLowerCase()
  if (SKIP_DESC_PREFIXES.some(p => descLower.startsWith(p))) {
    return { tx: null, skip }
  }

  const date = `${dm[3]}-${dm[2].padStart(2,'0')}-${dm[1].padStart(2,'0')}`
  let amount = parseAmount(amtStr)
  if (amount === 0) return { tx: null, skip }

  const category = mapCategory(catRaw.replaceAll(/[+\-−][\d.,]+.*/, '').trim() || desc)
  const key = `${date}|${normalizeFunc(desc)}|${Math.abs(amount).toFixed(2)}`
  
  if (known.has(key)) return { tx: null, skip }
  known.add(key)

  amount = _normalizeAmountSign(amount, category)
  return { tx: { date, merchant: desc, category, amount, currency: 'EUR' }, skip }
}

/**
 * Process all line-based transactions (fallback for lines not in tables).
 */
function _processLineTransactions(analyzeResult, knownTransactions, normalizeFunc) {
  const transactions = []
  const known = new Set(knownTransactions)
  const allLines = _extractPageLines(analyzeResult)

  for (let i = 0; i < allLines.length - 2; i++) {
    const { tx, skip } = _parseLineTransaction(i, allLines, known, normalizeFunc)
    if (tx) transactions.push(tx)
    if (skip > 0) i += skip - 1
  }

  return transactions
}

/**
 * Deduplicate salary entries: keep only one per date+amount.
 */
function _deduplicateSalaryEntries(transactions) {
  const incomeByDate = {}
  const finalTransactions = []

  for (const tx of transactions) {
    if (tx.category === 'Income' && (tx.merchant.toLowerCase().includes('nómin') || tx.merchant.toLowerCase().includes('salario'))) {
      const dateAmtKey = `${tx.date}|${tx.amount}`
      if (incomeByDate[dateAmtKey]) {
        console.log(`[DeduP] Filtered duplicate salary: ${tx.date} ${tx.merchant} €${tx.amount}`)
        continue
      }
      incomeByDate[dateAmtKey] = true
    }
    finalTransactions.push(tx)
  }

  return finalTransactions
}

/**
 * Normalize description for deduplication key generation.
 */
function normalizeForDedup(desc) {
  return (desc || '')
    .toLowerCase()
    .trim()
    .replaceAll(/\s+/g, ' ')
    .replaceAll(/[.,]/g, '')
}

function parseTransactionsFromDI(analyzeResult) {
  // ── Process tables first
  console.log('[PARSE] Starting transaction parsing from DI result...')
  const transactions = _processTableTransactions(analyzeResult)
  console.log(`[PARSE] Tables extraction complete: ${transactions.length} transactions`)

  // ── Dedup key from table transactions
  const knownKeys = transactions.map(t => 
    `${t.date}|${normalizeForDedup(t.merchant)}|${Math.abs(t.amount).toFixed(2)}`
  )

  // ── Process page lines (fallback for missed transactions)
  const lineTransactions = _processLineTransactions(analyzeResult, knownKeys, normalizeForDedup)
  console.log(`[PARSE] Lines extraction complete: ${lineTransactions.length} additional transactions`)
  transactions.push(...lineTransactions)

  // ── Final dedup pass for salary entries
  const finalTransactions = _deduplicateSalaryEntries(transactions)
  console.log(`[PARSE] After deduplication: ${finalTransactions.length} transactions`)
  
  // Log summary
  let incomeCount = 0, expenseCount = 0, incomeTotal = 0, expenseTotal = 0
  for (const tx of finalTransactions) {
    if (tx.category === 'Income') {
      incomeCount++
      incomeTotal += tx.amount
    } else {
      expenseCount++
      expenseTotal += Math.abs(tx.amount)
    }
  }
  console.log(`[PARSE] SUMMARY: ${incomeCount} income txs (€${incomeTotal.toFixed(2)}) + ${expenseCount} expense txs (€${expenseTotal.toFixed(2)})`)
  
  return finalTransactions
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
  const txCount = 18 + Math.floor(Math.random() * 10) // NOSONAR: Mock data generation, not cryptographic context
  const transactions = []
  const now = new Date()
  for (let i = 0; i < txCount; i++) {
    const cat      = categories[Math.floor(Math.random() * categories.length)] // NOSONAR: Mock data
    const merchant = merchants[cat][Math.floor(Math.random() * merchants[cat].length)] // NOSONAR: Mock data
    const daysAgo  = Math.floor(Math.random() * 90) // NOSONAR: Mock data
    const txDate   = new Date(now - daysAgo * 86400000).toISOString().split('T')[0]
    const amount   = -(Math.round((5 + Math.random() * 195) * 100) / 100) // NOSONAR: Mock data
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
        catch (e) {
          console.error('[callEnrichmentAgent] JSON parse error:', e.message)
          reject(new Error('Invalid JSON from agent: ' + data.slice(0, 200)))
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(60000, () => { req.destroy(new Error('Enrichment agent timeout')) })
    req.write(body)
    req.end()
  })
}

/**
 * Check if Document Intelligence can be used.
 */
function _canUseDI(blobUrl) {
  return !!(blobUrl && process.env.DOCUMENT_INTELLIGENCE_ENDPOINT && process.env.DOCUMENT_INTELLIGENCE_KEY)
}

/**
 * Extract transactions via Document Intelligence (or return null).
 */
async function _extractWithDI(blobUrl, context) {
  try {
    context.log('[mock-analyze] Downloading blob for DI analysis: ' + blobUrl)
    const pdfBuffer = await downloadBlobBuffer(blobUrl)
    const analyzeResult = await analyzeWithDocumentIntelligence(pdfBuffer, context)
    if (analyzeResult) {
      const txs = parseTransactionsFromDI(analyzeResult)
      context.log('[mock-analyze] DI extracted ' + txs.length + ' transactions')
      return txs
    }
  } catch (err) {
    context.log.warn('[mock-analyze] DI failed: ' + err.message)
  }
  return null
}

/**
 * Run enrichment agent (optional). Returns null if unavailable.
 */
async function _enrichWithAgent(userId, filename, blobUrl, transactions, goals, surveyAnswers, context) {
  try {
    return await callEnrichmentAgent({ userId, filename, blobUrl, transactions, goals, surveyAnswers })
  } catch (err) {
    context.log.warn('[mock-analyze] Enrichment Agent unavailable: ' + err.message)
    return null
  }
}

module.exports = async function analyzeMockTransactions(context, req) {
  const body = req.body || {}
  const blobUrl       = body.blobUrl || null
  const filename      = body.filename || null
  const userId        = body.userId || 'local-user'
  const goals         = body.goals || []
  const surveyAnswers = body.surveyAnswers || []

  context.log('[mock-analyze] ═══════════════════════════════════════════════════')
  context.log('[mock-analyze] TRANSACTION ANALYSIS START')
  context.log('[mock-analyze] UserId: ' + userId)
  context.log('[mock-analyze] Filename: ' + filename)
  context.log('[mock-analyze] BlobUrl: ' + (blobUrl ? 'yes' : 'no'))

  if (!filename && !blobUrl) {
    context.res = { status: 400, body: { error: 'Provide filename or blobUrl' } }
    return
  }

  // Try Document Intelligence first; fall back to fake transactions
  context.log('[mock-analyze] Checking if DI is available...')
  let transactions = _canUseDI(blobUrl)
    ? await _extractWithDI(blobUrl, context)
    : null

  if (!transactions?.length) {
    context.log('[mock-analyze] ⚠️  DI extraction failed or not available, using FAKE transactions')
    transactions = generateFakeTransactions(filename || blobUrl)
    context.log('[mock-analyze] Generated ' + transactions.length + ' fake transactions')
  } else {
    context.log('[mock-analyze] ✅ DI extracted ' + transactions.length + ' transactions')
  }

  // Try enrichment agent (optional)
  context.log('[mock-analyze] Calling enrichment agent...')
  const agentResult = await _enrichWithAgent(userId, filename, blobUrl, transactions, goals, surveyAnswers, context)
  const insights = agentResult?.summary || { habitWealthScore: 50, fsiLevel: 'Medium', byCategory: {} }
  
  if (agentResult?.agents?.documentIntelligence) {
    const di = agentResult.agents.documentIntelligence
    context.log('[mock-analyze] Agent Results:')
    context.log('[mock-analyze]   Income: €' + di.totalIncome)
    context.log('[mock-analyze]   Expenses: €' + di.totalExpenses)
    context.log('[mock-analyze]   Net Cash Flow: €' + di.netCashFlow)
    context.log('[mock-analyze]   Categories: ' + Object.keys(di.byCategory).join(', '))
  }
  context.log('[mock-analyze] Agent score: ' + (agentResult?.summary?.habitWealthScore || 'n/a'))

  const docFilename = filename || blobUrl
  await upsertDocument(userId, docFilename, {
    analyzedAt: new Date().toISOString(),
    transactions,
    goals,
    agentResult: agentResult || null,
    insights
  })
  context.log('[mock-analyze] Document saved to Cosmos DB')
  context.log('[mock-analyze] ═══════════════════════════════════════════════════')

  context.res = {
    status: 200,
    body: {
      success:      true,
      filename,
      transactions,
      agentPipeline: agentResult || null,
      insights:      agentResult?.summary || null
    }
  }
}