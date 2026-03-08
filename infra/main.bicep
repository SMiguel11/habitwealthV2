 

targetScope = 'resourceGroup'

// ─── Parameters ───────────────────────────────────────────────────────────────

@description('Azure region for most resources. Static Web App uses swaLocation.')
param location string = resourceGroup().location

@description('Base name used across all resource names (e.g. "habitwealth")')
@minLength(3)
@maxLength(20)
param baseName string = 'habitwealth'

@description('4-8 char unique lowercase alphanumeric suffix — ensures globally unique resource names')
@minLength(4)
@maxLength(8)
param uniqueSuffix string

@description('Azure AD Object ID of the principal running this deployment (for Key Vault admin access)')
param deployerObjectId string

@description('Enable Cosmos DB Free Tier — only one allowed per Azure subscription')
param enableCosmosFreeOffer bool = true

@description('Azure region for Static Web App — must be one of the supported SWA regions')
@allowed([ 'westus2', 'centralus', 'eastus2', 'westeurope', 'eastasia' ])
param swaLocation string = 'westeurope'

@description('Tags applied to all resources')
param tags object = {
  project:     'HabitWealth'
  environment: 'production'
  managedBy:   'bicep'
}

// ─── Modules ──────────────────────────────────────────────────────────────────

module kv 'keyvault.bicep' = {
  name: 'keyvault'
  params: {
    location:         location
    baseName:         baseName
    deployerObjectId: deployerObjectId
    tags:             tags
  }
}

module storage 'storage.bicep' = {
  name: 'storage'
  params: {
    location:     location
    baseName:     baseName
    uniqueSuffix: uniqueSuffix
    tags:         tags
  }
}

module cosmos 'cosmos.bicep' = {
  name: 'cosmos'
  params: {
    location:        location
    baseName:        baseName
    uniqueSuffix:    uniqueSuffix
    enableFreeOffer: enableCosmosFreeOffer
    tags:            tags
  }
}

module docIntel 'document-intelligence.bicep' = {
  name: 'document-intelligence'
  params: {
    location:     location
    baseName:     baseName
    uniqueSuffix: uniqueSuffix
    tags:         tags
  }
}


// functions depends on: kv, storage, cosmos, docIntel (inferred by Bicep)
module functions 'functions.bicep' = {
  name: 'functions'
  params: {
    location:                location
    baseName:                baseName
    uniqueSuffix:            uniqueSuffix
    storageConnectionString: storage.outputs.connectionString
    storageAccountName:      storage.outputs.accountName
    storageAccountKey:       storage.outputs.primaryKey
    cosmosEndpoint:          cosmos.outputs.endpoint
    cosmosPrimaryKey:        cosmos.outputs.primaryKey
    keyVaultUri:             kv.outputs.keyVaultUri
    managedIdentityId:       kv.outputs.managedIdentityId
    managedIdentityClientId: kv.outputs.managedIdentityClientId
    docIntelEndpoint:        docIntel.outputs.endpoint
    docIntelKey:             docIntel.outputs.primaryKey
    tags:                    tags
  }
}

// containerApps depends on: functions (for Log Analytics), kv, cosmos, storage
module containerApps 'container-apps.bicep' = {
  name: 'container-apps'
  params: {
    location:                location
    baseName:                baseName
    uniqueSuffix:            uniqueSuffix
    logAnalyticsCustomerId:  functions.outputs.logAnalyticsCustomerId
    logAnalyticsSharedKey:   functions.outputs.logAnalyticsSharedKey
    managedIdentityId:       kv.outputs.managedIdentityId
    managedIdentityClientId: kv.outputs.managedIdentityClientId
    keyVaultUri:             kv.outputs.keyVaultUri
    cosmosEndpoint:          cosmos.outputs.endpoint
    cosmosPrimaryKey:        cosmos.outputs.primaryKey
    storageAccountName:      storage.outputs.accountName
    storageAccountKey:       storage.outputs.primaryKey
    tags:                    tags
  }
}

// Static Web App has no dependencies — can deploy in parallel
module swa 'static-web-app.bicep' = {
  name: 'static-web-app'
  params: {
    location:     swaLocation
    baseName:     baseName
    uniqueSuffix: uniqueSuffix
    tags:         tags
  }
}

// ─── Outputs ──────────────────────────────────────────────────────────────────

output keyVaultUri              string = kv.outputs.keyVaultUri
output storageAccountName       string = storage.outputs.accountName
output cosmosEndpoint           string = cosmos.outputs.endpoint
output docIntelEndpoint         string = docIntel.outputs.endpoint
output sasFunctionAppName       string = functions.outputs.sasFunctionAppName
output sasFunctionAppUrl        string = functions.outputs.sasFunctionAppUrl
output docIntelFunctionAppName  string = functions.outputs.docIntelFunctionAppName
output containerRegistryName    string = containerApps.outputs.registryName
output containerRegistryServer  string = containerApps.outputs.registryLoginServer
output containerAppName         string = containerApps.outputs.containerAppName
output enrichmentAgentUrl       string = containerApps.outputs.enrichmentAgentUrl
output staticWebAppUrl          string = 'https://${swa.outputs.defaultHostname}'
