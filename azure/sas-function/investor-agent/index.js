'use strict'
/**
 * investor-agent/index.js
 * Fetches live financial data from Yahoo Finance and generates
 * a bilingual investment analysis (BUY / HOLD / SELL) via Azure OpenAI.
 *
 * Scoring model:
 *   Financial Health  0-10  (currentRatio, D/E, freeCashflow, grossMargins)
 *   Growth            0-10  (revenueGrowth, earningsGrowth)
 *   Valuation         0-10  (P/E, PEG — lower = better value)
 *   Risk              0-10  (beta, leverage, negative growth — higher = riskier)
 *   Final = Health×0.30 + Growth×0.30 + Valuation×0.25 + (10-Risk)×0.15
 *
 * Recommendation: ≥7 → BUY | 5-6.9 → HOLD | <5 → SELL
 */

const https = require('node:https')

// ─── HTTP helper ───────────────────────────────────────────────────────────────
function _request(opts, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const req = https.request(opts, (res) => {
      let body = ''
      res.on('data', d => { body += d })
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }))
    })
    req.on('error', () => resolve({ status: 0, headers: {}, body: '' }))
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve({ status: 0, headers: {}, body: '' }) })
    req.end()
  })
}

// ─── Yahoo Finance: crumb auth ─────────────────────────────────────────────────
async function _getYFCrumb() {
  // Step 1: get cookie from Yahoo Finance consent endpoint
  const cookieRes = await _request({
    hostname: 'fc.yahoo.com',
    port: 443,
    path: '/',
    method: 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  }, 5000)
  const rawCookies = cookieRes.headers['set-cookie'] || []
  const cookie = (Array.isArray(rawCookies) ? rawCookies : [rawCookies])
    .map(c => (c || '').split(';')[0])
    .filter(Boolean)
    .join('; ')

  // Step 2: get crumb using that cookie
  const crumbRes = await _request({
    hostname: 'query2.finance.yahoo.com',
    port: 443,
    path: '/v1/test/getcrumb',
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ...(cookie ? { Cookie: cookie } : {}),
    },
  }, 5000)
  return { crumb: crumbRes.body.trim() || null, cookie }
}

// ─── Yahoo Finance: quoteSummary ───────────────────────────────────────────────
async function fetchYahooFinance(ticker) {
  const sym = encodeURIComponent(ticker.toUpperCase().trim())
  const modules = 'financialData,defaultKeyStatistics,summaryDetail,assetProfile'

  const { crumb, cookie } = await _getYFCrumb()
  const crumbQS = crumb ? `&crumb=${encodeURIComponent(crumb)}` : ''

  const tryFetch = async (withCrumb) => {
    const path = `/v10/finance/quoteSummary/${sym}?modules=${modules}&formatted=false&lang=en-US&region=US${withCrumb ? crumbQS : ''}`
    const res = await _request({
      hostname: 'query2.finance.yahoo.com',
      port: 443,
      path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        ...(cookie && withCrumb ? { Cookie: cookie } : {}),
      },
    }, 12000)
    try {
      const parsed = JSON.parse(res.body)
      if (parsed?.quoteSummary?.error) {
        return { _error: parsed.quoteSummary.error.description || 'Ticker not found' }
      }
      return parsed?.quoteSummary?.result?.[0] || null
    } catch { return null }
  }

  // Try with crumb first, then without as fallback
  let result = await tryFetch(true)
  if (!result && crumb) result = await tryFetch(false)
  return result
}

// ─── Scoring ───────────────────────────────────────────────────────────────────
function computeScores(yfData) {
  if (!yfData) {
    // Neutral baseline when no live data is available
    return { health: 5, growth: 5, valuation: 5, risk: 5, finalScore: 5.0, recommendation: 'HOLD' }
  }

  const fd = yfData.financialData || {}
  const ks = yfData.defaultKeyStatistics || {}
  const sd = yfData.summaryDetail || {}

  // ── Financial Health (0–10) ────────────────────────────────────────────────
  let health = 0
  const currentRatio  = Number(fd.currentRatio)  || 0
  const debtEquityPct = Number(fd.debtToEquity)  || 0   // Yahoo returns %, e.g. 150 = 1.5×
  const deRatio       = debtEquityPct / 100
  const freeCashflow  = Number(fd.freeCashflow)  || 0
  const grossMargins  = Number(fd.grossMargins)  || 0

  if (currentRatio > 2)   health += 3
  else if (currentRatio > 1.5) health += 2
  else if (currentRatio > 1)   health += 1

  if (deRatio < 0.5)  health += 3
  else if (deRatio < 1) health += 2
  else if (deRatio < 2) health += 1

  if (freeCashflow > 0)     health += 2
  if (grossMargins > 0.4)   health += 2
  else if (grossMargins > 0.2) health += 1

  health = Math.min(10, Math.max(0, health))

  // ── Growth (0–10) ──────────────────────────────────────────────────────────
  let growth = 0
  const revGrowth  = Number(fd.revenueGrowth)  || 0   // decimal, e.g. 0.12 = 12%
  const earnGrowth = Number(fd.earningsGrowth) || 0

  for (const g of [revGrowth, earnGrowth]) {
    if (g > 0.20)      growth += 5
    else if (g > 0.10) growth += 4
    else if (g > 0.05) growth += 3
    else if (g > 0)    growth += 2
  }
  growth = Math.min(10, Math.max(0, growth))

  // ── Valuation (0–10, lower P/E = higher score) ─────────────────────────────
  let valuation = 0
  const fwdPE = Number(ks.forwardPE)  || 0
  const trlPE = Number(sd.trailingPE) || 0
  const pe    = fwdPE || trlPE || 0
  const peg   = Number(ks.pegRatio)   || 0

  if (pe > 0) {
    if (pe < 12)       valuation += 5
    else if (pe < 20)  valuation += 4
    else if (pe < 30)  valuation += 3
    else if (pe < 50)  valuation += 1
  } else { valuation += 3 }   // unknown → neutral

  if (peg > 0) {
    if (peg < 1)       valuation += 5
    else if (peg < 2)  valuation += 3
    else if (peg < 3)  valuation += 1
  } else { valuation += 3 }   // unknown → neutral

  valuation = Math.min(10, Math.max(0, valuation))

  // ── Risk (0–10, higher = riskier) ─────────────────────────────────────────
  let risk = 0
  const beta = Number(ks.beta) || 1

  if (beta > 2.0)      risk += 4
  else if (beta > 1.5) risk += 3
  else if (beta > 1.2) risk += 2
  else if (beta > 1.0) risk += 1

  if (deRatio > 3)       risk += 3
  else if (deRatio > 2)  risk += 2
  else if (deRatio > 1)  risk += 1

  if (revGrowth < -0.1)   risk += 3
  else if (revGrowth < 0) risk += 1

  risk = Math.min(10, Math.max(0, risk))

  // ── Final weighted score ─────────────────────────────────────────────────
  const finalScore = Math.round(
    (health * 0.30 + growth * 0.30 + valuation * 0.25 + (10 - risk) * 0.15) * 10
  ) / 10

  const recommendation = finalScore >= 7 ? 'BUY' : finalScore >= 5 ? 'HOLD' : 'SELL'

  return { health, growth, valuation, risk, finalScore, recommendation }
}

// ─── Azure OpenAI helpers ──────────────────────────────────────────────────────
function _callOpenAI(endpoint, deployment, apiKey, prompt, opts = {}) {
  return new Promise((resolve) => {
    try {
      const url = new URL(
        `/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`,
        endpoint
      )
      const payload = {
        messages: [{ role: 'user', content: prompt }],
        temperature: Number(opts.temperature ?? 0.3),
        max_tokens: Number(opts.maxTokens ?? 700),
        response_format: opts.responseFormat === 'json_object' ? { type: 'json_object' } : undefined,
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
        res.on('data', d => { data += d })
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data)
            resolve(parsed.choices?.[0]?.message?.content || null)
          } catch { resolve(null) }
        })
      })
      req.on('error', () => resolve(null))
      req.setTimeout(Number(opts.timeout ?? 30000), () => { req.destroy(); resolve(null) })
      req.write(body)
      req.end()
    } catch { resolve(null) }
  })
}

function _extractJson(raw) {
  if (!raw || typeof raw !== 'string') return null
  const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
  try { return JSON.parse(cleaned) } catch { /* fallthrough */ }
  try {
    const i = cleaned.indexOf('{')
    const j = cleaned.lastIndexOf('}')
    if (i >= 0 && j > i) return JSON.parse(cleaned.slice(i, j + 1))
  } catch { /* fallthrough */ }
  return null
}

// ─── AI narrative generation ───────────────────────────────────────────────────
async function generateAnalysis(ticker, yfData, scores) {
  const endpoint   = (process.env.AZURE_OPENAI_ENDPOINT   || '').replace(/\/$/, '')
  const apiKey     = process.env.AZURE_OPENAI_KEY          || ''
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT   || 'gpt-4o-mini'

  if (!endpoint || !apiKey) return null

  const fd = yfData?.financialData        || {}
  const ks = yfData?.defaultKeyStatistics || {}
  const ap = yfData?.assetProfile         || {}
  const sd = yfData?.summaryDetail        || {}

  const companyName = ap.longName || ap.shortName || ticker
  const sector      = ap.sector   || 'Unknown'
  const industry    = ap.industry || ''

  const liveMetrics = yfData
    ? [
        `Revenue growth YoY: ${((fd.revenueGrowth || 0) * 100).toFixed(1)}%`,
        `Earnings growth: ${((fd.earningsGrowth || 0) * 100).toFixed(1)}%`,
        `Gross margin: ${((fd.grossMargins || 0) * 100).toFixed(1)}%`,
        `Net margin: ${((fd.profitMargins || 0) * 100).toFixed(1)}%`,
        `Current ratio: ${(fd.currentRatio || 0).toFixed(2)}`,
        `Debt/Equity: ${(fd.debtToEquity || 0).toFixed(0)}%`,
        `ROE: ${((fd.returnOnEquity || 0) * 100).toFixed(1)}%`,
        `Free cash flow: $${((fd.freeCashflow || 0) / 1e9).toFixed(1)}B`,
        `Forward P/E: ${ks.forwardPE ? Number(ks.forwardPE).toFixed(1) : 'N/A'}`,
        `PEG ratio: ${ks.pegRatio ? Number(ks.pegRatio).toFixed(2) : 'N/A'}`,
        `Beta: ${(ks.beta || 0).toFixed(2)}`,
        `Market cap: $${((sd.marketCap || 0) / 1e9).toFixed(0)}B`,
        `Current price: $${fd.currentPrice ? Number(fd.currentPrice).toFixed(2) : 'N/A'}`,
        `Shares outstanding: ${ks.sharesOutstanding ? (ks.sharesOutstanding / 1e9).toFixed(2) + 'B' : 'N/A'}`,
      ].join('\n')
    : 'No live data — use your training knowledge for this ticker.'

  const prompt =
    'You are a professional financial analyst specializing in equity valuation. ' +
    'Be rational, data-based, and prudent. NEVER promise returns. Always acknowledge uncertainty.\n\n' +
    `Ticker: ${ticker.toUpperCase()}\n` +
    `Company: ${companyName}\n` +
    `Sector: ${sector}${industry ? ' / ' + industry : ''}\n\n` +
    `Live financial metrics (Yahoo Finance):\n${liveMetrics}\n\n` +
    `Quantitative scores (DO NOT change these values — explain why):\n` +
    `- Financial health: ${scores.health}/10\n` +
    `- Growth: ${scores.growth}/10\n` +
    `- Valuation: ${scores.valuation}/10\n` +
    `- Risk: ${scores.risk}/10 (higher = riskier)\n` +
    `- Final score: ${scores.finalScore}/10\n` +
    `- Algorithmic recommendation: ${scores.recommendation}\n\n` +
    'Write a concise analysis specific to this company. Be concrete — reference actual business details.\n\n' +
    'Return ONLY valid JSON (no markdown):\n' +
    '{"en":{"companyName":"...","sector":"...","rationale":"2-3 sentences on the investment case","positives":["3 concrete strengths"],"risks":["2-3 key risks"],"conclusion":"1-2 sentence summary","disclaimer":"This is not financial advice. Past performance does not guarantee future results."},' +
    '"es":{"companyName":"...","sector":"...","rationale":"2-3 frases sobre el caso de inversión","positives":["3 fortalezas concretas"],"risks":["2-3 riesgos clave"],"conclusion":"1-2 frases resumen","disclaimer":"Esto no es asesoramiento financiero. Rentabilidades pasadas no garantizan resultados futuros."}}'

  try {
    const raw = await _callOpenAI(endpoint, deployment, apiKey, prompt, {
      responseFormat: 'json_object',
      maxTokens: 900,
      temperature: 0.3,
      timeout: 30000,
    })
    return _extractJson(raw)
  } catch { return null }
}

// ─── Safe number extraction ────────────────────────────────────────────────────
function _n(val, multiplier = 1, decimals = 2) {
  const v = Number(val)
  if (!isFinite(v)) return null
  const f = Math.pow(10, decimals)
  return Math.round(v * multiplier * f) / f
}

// ─── Main handler ──────────────────────────────────────────────────────────────
module.exports = async function (context, req) {
  const rawTicker = (req.query.ticker || '').trim().toUpperCase()
  const lang      = req.query.lang || 'en'

  if (!rawTicker) {
    context.res = { status: 400, body: { error: 'ticker query parameter is required' } }
    return
  }
  // Validate: 1-10 chars, alphanumeric + dot + dash (covers BRK.B, SAN.MC, etc.)
  if (!/^[A-Z0-9.\-]{1,10}$/.test(rawTicker)) {
    context.res = { status: 400, body: { error: 'Invalid ticker format' } }
    return
  }

  context.log(`[investor-agent] Analyzing: ${rawTicker}`)

  // 1. Fetch Yahoo Finance data (may return null if blocked)
  const yfData = await fetchYahooFinance(rawTicker)

  if (yfData?._error) {
    // Ticker genuinely not found
    context.res = {
      status: 404,
      body: { error: `Ticker not found: ${yfData._error}` },
    }
    return
  }

  // 2. Compute quantitative scores
  const scores = computeScores(yfData)

  // 3. Generate AI narrative (bilingual)
  const narrative = await generateAnalysis(rawTicker, yfData, scores)

  // 4. Build response
  const ap = yfData?.assetProfile        || {}
  const ks = yfData?.defaultKeyStatistics || {}
  const fd = yfData?.financialData        || {}
  const sd = yfData?.summaryDetail        || {}

  const localNarrative = narrative
    ? (lang === 'es' ? (narrative.es || narrative.en) : narrative.en)
    : null

  const fallbackDisclaimer = lang === 'es'
    ? 'Esto no es asesoramiento financiero. Rentabilidades pasadas no garantizan resultados futuros.'
    : 'This is not financial advice. Past performance does not guarantee future results.'

  context.res = {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: {
      ticker: rawTicker,
      companyName: localNarrative?.companyName || ap.longName || ap.shortName || rawTicker,
      sector:      localNarrative?.sector      || ap.sector   || '',
      industry:    ap.industry || '',
      scores,
      recommendation: scores.recommendation,
      narrative: localNarrative || {
        companyName: ap.longName || rawTicker,
        sector: ap.sector || '',
        rationale:  lang === 'es' ? 'Análisis basado en métricas cuantitativas.' : 'Analysis based on quantitative metrics.',
        positives:  [],
        risks:      [],
        conclusion: lang === 'es' ? 'Consulte las puntuaciones arriba.' : 'See scores above.',
        disclaimer: fallbackDisclaimer,
      },
      // Live metrics for the UI table (null if not available)
      metrics: yfData ? {
        currentRatio:  _n(fd.currentRatio,  1,    2),
        debtToEquity:  _n(fd.debtToEquity,  1,    0),
        roe:           _n(fd.returnOnEquity, 100,  1),
        revenueGrowth: _n(fd.revenueGrowth,  100, 1),
        grossMargins:  _n(fd.grossMargins,   100, 1),
        netMargins:    _n(fd.profitMargins,  100, 1),
        forwardPE:     _n(ks.forwardPE,      1,   1),
        pegRatio:      _n(ks.pegRatio,       1,   2),
        beta:          _n(ks.beta,           1,   2),
        currentPrice:  fd.currentPrice != null ? Math.round(Number(fd.currentPrice) * 100) / 100 : null,
        marketCapB:    _n(sd.marketCap,    1/1e9,  1),
        sharesB:       _n(ks.sharesOutstanding, 1/1e9, 2),
        freeCashflowB: _n(fd.freeCashflow, 1/1e9,  2),
      } : null,
      dataSource: yfData ? 'yahoo-finance' : 'openai-knowledge',
    },
  }
}
