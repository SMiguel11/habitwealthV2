#!/usr/bin/env node
/**
 * Test if Cosmos query with parameters works correctly
 */
import { CosmosClient } from '@azure/cosmos'

const endpoint = 'https://hwbase-cosmos-00211.documents.azure.com:443/'
const key = '7kwCtts1x48CXdBaj4tUr2PFsaqG7yP7WYGysFDdrGzbfNWQC1EBOxfZ03RNOk3BSlKldkEMGtqYACDbCuASlw=='
const database = 'habitwealth'
const containerName = 'documents'
const userId = 'local-user'

async function test() {
  console.log('Testing Cosmos query with parameters...')
  console.log(`Endpoint: ${endpoint}`)
  console.log(`Database: ${database}`)
  console.log(`Container: ${containerName}`)
  console.log(`UserId: ${userId}`)
  console.log('')

  try {
    const client = new CosmosClient({ endpoint, key })
    const container = client.database(database).container(containerName)

    // Test 1: Query with parameters
    console.log('TEST 1: Named parameters (@userId)')
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.analyzedAt DESC',
      parameters: [{ name: '@userId', value: userId }]
    }
    console.log(`  Query: ${querySpec.query}`)
    console.log(`  Params: ${JSON.stringify(querySpec.parameters)}`)
    
    const { resources: results1 } = await container.items.query(querySpec).fetchAll()
    console.log(`  Result: Found ${results1.length} documents`)
    if (results1.length > 0) {
      console.log(`    First doc: ${results1[0].id}`)
    }

    // Test 2: Query without parameters (direct)
    console.log('\nTEST 2: Direct userId in query')
    const querySpec2 = {
      query: `SELECT * FROM c WHERE c.userId = '${userId}' ORDER BY c.analyzedAt DESC`
    }
    console.log(`  Query: ${querySpec2.query}`)
    
    const { resources: results2 } = await container.items.query(querySpec2).fetchAll()
    console.log(`  Result: Found ${results2.length} documents`)
    if (results2.length > 0) {
      console.log(`    First doc: ${results2[0].id}`)
    }

    if (results1.length > 0 && results2.length > 0) {
      console.log('\n success! Both queries work!')
    } else if (results2.length > 0) {
      console.log('\nWARNING: Named parameters not working - use direct query')
    }

  } catch (err) {
    console.error(`ERROR: ${err.message}`)
    console.error(`Type: ${err.constructor.name}`)
    if (err.code) console.error(`Code: ${err.code}`)
  }
}

test()
