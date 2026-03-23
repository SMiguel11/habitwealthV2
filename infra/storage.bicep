// infra/storage.bicep — Azure Storage Account for HabitWealth
// Standard LRS, Hot tier — 5 GB free for 12 months in new Azure accounts.
// Hosts: PDF bank statement uploads and Azure Functions internal storage.

@description('Azure region for the storage account')
param location string

@description('Base name used to generate resource names (e.g. "habitwealth")')
param baseName string

@description('4-8 char unique lowercase alphanumeric suffix to avoid global naming conflicts')
@minLength(4)
@maxLength(8)
param uniqueSuffix string

@description('Tags applied to all resources')
param tags object = {}

// Storage account: max 24 chars, only lowercase letters and numbers
var accountName = toLower('${take(replace(baseName, '-', ''), 16)}${uniqueSuffix}')

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name:     accountName
  location: location
  tags:     tags
  kind:     'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  properties: {
    accessTier:               'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion:        'TLS1_2'
    allowBlobPublicAccess:    false
    allowSharedKeyAccess:     true   // Required — Functions generate SAS tokens via shared key
    encryption: {
      requireInfrastructureEncryption: true  // Double encryption at infrastructure + service level
    }
  }

  resource blobService 'blobServices' = {
    name: 'default'

    // Bank statement PDFs uploaded by users before Document Intelligence processing
    resource uploadsContainer 'containers' = {
      name: 'uploads'
      properties: { publicAccess: 'None' }
    }

    // Documents after Document Intelligence analysis (optional archive)
    resource processedContainer 'containers' = {
      name: 'processed'
      properties: { publicAccess: 'None' }
    }
  }
}

// ─── Outputs ──────────────────────────────────────────────────────────────────
output accountName      string = storageAccount.name
output accountId        string = storageAccount.id
output primaryKey       string = storageAccount.listKeys().keys[0].value
output connectionString string = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
