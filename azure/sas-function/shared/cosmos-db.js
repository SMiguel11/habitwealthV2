/**
 * shared/cosmos-db.js
 * Cosmos DB helper — used by mock-analyze (write) and insights-api (read).
 * Falls back to /tmp JSON file when COSMOS_ENDPOINT is not set (local dev).
 */
const fs   = require('fs')
const path = require('path')
const os   = require('os')

const DB_PATH = path.join(os.tmpdir(), 'habitwealth-db.json')

let _container = null

function getContainer() {
  if (_container) return _container
  const endpoint = process.env.COSMOS_ENDPOINT
  const key      = process.env.COSMOS_KEY
  const database = process.env.COSMOS_DATABASE || 'habitwealth'
  const container = process.env.COSMOS_CONTAINER || 'documents'
  if (!endpoint || !key) return null
  const { CosmosClient } = require('@azure/cosmos')
  const client = new CosmosClient({ endpoint, key })
  _container = client.database(database).container(container)
  return _container
}

// ── Cosmos operations ─────────────────────────────────────────────────────────

async function upsertDocument(userId, filename, doc) {
  const container = getContainer()
  if (container) {
    const id = `${userId}__${filename}`.replace(/[^a-zA-Z0-9_.-]/g, '_')
    const item = { id, userId, filename, ...doc }
    await container.items.upsert(item)
    return
  }
  // Fallback: local /tmp
  const db = loadLocalDb()
  if (!db.users[userId]) db.users[userId] = { documents: [] }
  const existingIdx = db.users[userId].documents.findIndex(d => d.filename === filename)
  if (existingIdx >= 0) {
    db.users[userId].documents[existingIdx] = { filename, ...doc }
  } else {
    db.users[userId].documents.push({ filename, ...doc })
  }
  saveLocalDb(db)
}

async function getDocuments(userId) {
  const container = getContainer()
  if (container) {
    const query = {
      query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.analyzedAt DESC',
      parameters: [{ name: '@userId', value: userId }]
    }
    const { resources } = await container.items.query(query).fetchAll()
    return resources
  }
  // Fallback: local /tmp
  const db = loadLocalDb()
  return (db.users[userId]?.documents) || []
}

// ── Local fallback ────────────────────────────────────────────────────────────
function loadLocalDb() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) } catch { return { users: {} } }
}
function saveLocalDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
}

module.exports = { upsertDocument, getDocuments }
