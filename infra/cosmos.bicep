// infra/cosmos.bicep — Azure Cosmos DB (NoSQL API) for HabitWealth
// Free Tier: 1,000 RU/s shared + 25 GB — $0/month permanently (1 per subscription).
// Container layout mirrors cosmos-schema.json exactly.

@description('Azure region for all resources')
param location string

@description('Base name used to generate resource names')
param baseName string

@description('4-8 char unique suffix to avoid naming conflicts')
@minLength(4)
@maxLength(8)
param uniqueSuffix string

@description('Enable Cosmos DB Free Tier — requires only one free account per Azure subscription')
param enableFreeOffer bool = true

@description('Tags applied to all resources')
param tags object = {}

var accountName = '${baseName}-cosmos-${uniqueSuffix}'

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name:     accountName
  location: location
  tags:     tags
  kind:     'GlobalDocumentDB'
  identity: {
    type: 'SystemAssigned'  // Enable Managed Identity for credential-free authentication
  }
  properties: {
    databaseAccountOfferType: 'Standard'
    enableFreeTier:           enableFreeOffer
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName:     location
        failoverPriority: 0
        isZoneRedundant:  false
      }
    ]
    enableAutomaticFailover:      false
    enableMultipleWriteLocations: false
    backupPolicy: {
      type: 'Periodic'
      periodicModeProperties: {
        backupIntervalInMinutes:        240
        backupRetentionIntervalInHours: 720  // 30 days retention for enhanced disaster recovery
        backupStorageRedundancy:        'Local'
      }
    }
  }
}

// ─── Database with 1,000 RU/s shared throughput (covered by Free Tier) ────────
resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmosAccount
  name:   'habitwealth'
  properties: {
    resource: { id: 'habitwealth' }
    options:  { throughput: 1000 }
  }
}

var defaultIndexingPolicy = {
  indexingMode:  'consistent'
  includedPaths: [ { path: '/*' } ]
  excludedPaths: [ { path: '/_etag/?' } ]
}

// ─── users container ──────────────────────────────────────────────────────────
resource usersContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name:   'users'
  properties: {
    resource: {
      id:           'users'
      partitionKey: { paths: [ '/userId' ], kind: 'Hash' }
      defaultTtl:   -1
      indexingPolicy: defaultIndexingPolicy
    }
  }
}

// ─── documents container ──────────────────────────────────────────────────────
resource documentsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name:   'documents'
  properties: {
    resource: {
      id:           'documents'
      partitionKey: { paths: [ '/userId' ], kind: 'Hash' }
      defaultTtl:   -1
      indexingPolicy: {
        indexingMode:  'consistent'
        includedPaths: [ { path: '/*' } ]
        // Exclude large text fields from indexing — matches cosmos-schema.json
        excludedPaths: [
          { path: '/rawText/?' }
          { path: '/transactions/*' }
          { path: '/_etag/?' }
        ]
      }
    }
  }
}

// ─── goals container ──────────────────────────────────────────────────────────
resource goalsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name:   'goals'
  properties: {
    resource: {
      id:           'goals'
      partitionKey: { paths: [ '/userId' ], kind: 'Hash' }
      defaultTtl:   -1
      indexingPolicy: defaultIndexingPolicy
    }
  }
}

// ─── habitPoints container ────────────────────────────────────────────────────
resource habitPointsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name:   'habitPoints'
  properties: {
    resource: {
      id:           'habitPoints'
      partitionKey: { paths: [ '/userId' ], kind: 'Hash' }
      defaultTtl:   -1
      indexingPolicy: defaultIndexingPolicy
    }
  }
}

// ─── interventionLogs container ───────────────────────────────────────────────
resource interventionLogsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name:   'interventionLogs'
  properties: {
    resource: {
      id:           'interventionLogs'
      partitionKey: { paths: [ '/userId' ], kind: 'Hash' }
      defaultTtl:   7776000  // 90 days — matches cosmos-schema.json
      indexingPolicy: defaultIndexingPolicy
    }
  }
}

// ─── Outputs ──────────────────────────────────────────────────────────────────
output endpoint    string = cosmosAccount.properties.documentEndpoint
output primaryKey  string = cosmosAccount.listKeys().primaryMasterKey
output accountName string = cosmosAccount.name
