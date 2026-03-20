// infra/functions.bicep — Azure Functions (Consumption Plan) for HabitWealth
// Hosts two function apps:
//   • sas-function app  — SAS token generation, insights-api, mock-analyze
//   • doc-intel app     — Blob trigger → Azure Document Intelligence pipeline
//
// Cost: $0 — Consumption plan includes 1M calls + 400K GB-s free every month.

@description('Azure region for all resources')
param location string

@description('Base name used to generate resource names')
param baseName string

@description('4-8 char unique suffix to avoid naming conflicts')
@minLength(4)
@maxLength(8)
param uniqueSuffix string

@description('Storage Account connection string (AzureWebJobsStorage)')
param storageConnectionString string

@description('Storage account name')
param storageAccountName string

@description('Storage account primary key')
param storageAccountKey string

@description('Cosmos DB endpoint URL')
param cosmosEndpoint string

@description('Cosmos DB primary master key')
param cosmosPrimaryKey string

@description('Azure Key Vault URI')
param keyVaultUri string

@description('User-Assigned Managed Identity resource ID')
param managedIdentityId string

@description('User-Assigned Managed Identity client ID')
param managedIdentityClientId string

@description('Document Intelligence endpoint URL')
param docIntelEndpoint string

@description('Document Intelligence primary key')
param docIntelKey string

@description('Enrichment Agent Container App URL — update after container-apps deploy')
param enrichmentAgentUrl string = 'http://placeholder-update-after-deploy'

@description('Tags applied to all resources')
param tags object = {}

// ─── Log Analytics Workspace (shared — also used by Container Apps) ────────────
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name:     '${baseName}-logs-${uniqueSuffix}'
  location: location
  tags:     tags
  properties: {
    sku:             { name: 'PerGB2018' }
    retentionInDays: 30  // Minimum. First 5 GB/month per workspace is free.
  }
}

// ─── Application Insights (workspace-based) ────────────────────────────────────
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name:     '${baseName}-ai-${uniqueSuffix}'
  location: location
  tags:     tags
  kind:     'web'
  properties: {
    Application_Type:    'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

// ─── Consumption App Service Plan (Serverless) ────────────────────────────────
resource consumptionPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name:     '${baseName}-plan-${uniqueSuffix}'
  location: location
  tags:     tags
  kind:     'functionapp'
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {
    reserved: true  // Required for Linux-based function apps
  }
}

// ─── App settings shared by both function apps ────────────────────────────────
var commonSettings = [
  { name: 'AzureWebJobsStorage',                  value: storageConnectionString }
  { name: 'FUNCTIONS_EXTENSION_VERSION',           value: '~4' }
  { name: 'FUNCTIONS_WORKER_RUNTIME',              value: 'node' }
  { name: 'WEBSITE_NODE_DEFAULT_VERSION',          value: '~20' }
  { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
  { name: 'AZURE_KEY_VAULT_URI',                   value: keyVaultUri }
  { name: 'AZURE_CLIENT_ID',                       value: managedIdentityClientId }
  { name: 'AZURE_STORAGE_ACCOUNT_NAME',            value: storageAccountName }
  { name: 'AZURE_STORAGE_ACCOUNT_KEY',             value: storageAccountKey }
  { name: 'ENRICHMENT_AGENT_URL',                  value: enrichmentAgentUrl }
]

// ─── SAS Function App (sas-function + insights-api + mock-analyze) ────────────
resource sasFunctionApp 'Microsoft.Web/sites@2023-12-01' = {
  name:     '${baseName}-fn-sas-${uniqueSuffix}'
  location: location
  tags:     tags
  kind:     'functionapp,linux'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${managedIdentityId}': {} }
  }
  properties: {
    serverFarmId:       consumptionPlan.id
    httpsOnly:          true
    clientCertEnabled:  true
    clientCertMode:     'Required'
    siteConfig: {
      linuxFxVersion: 'NODE|20'
      appSettings: concat(commonSettings, [
        { name: 'SAS_CONTAINER',    value: 'uploads' }
        { name: 'SAS_EXPIRES_MINUTES', value: '15' }
        { name: 'COSMOS_ENDPOINT',  value: cosmosEndpoint }
        { name: 'COSMOS_KEY',       value: cosmosPrimaryKey }
        { name: 'COSMOS_DATABASE',  value: 'habitwealth' }
        { name: 'COSMOS_CONTAINER', value: 'documents' }
      ])
    }
  }
}

// ─── Document Intelligence Function App (blob trigger) ────────────────────────
resource docIntelFunctionApp 'Microsoft.Web/sites@2023-12-01' = {
  name:     '${baseName}-fn-di-${uniqueSuffix}'
  location: location
  tags:     tags
  kind:     'functionapp,linux'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${managedIdentityId}': {} }
  }
  properties: {
    serverFarmId:       consumptionPlan.id
    httpsOnly:          true
    clientCertEnabled:  true
    clientCertMode:     'Required'
    siteConfig: {
      linuxFxVersion: 'NODE|20'
      appSettings: concat(commonSettings, [
        { name: 'AZURE_STORAGE_CONTAINER_NAME',         value: 'uploads' }
        { name: 'AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT', value: docIntelEndpoint }
        { name: 'AZURE_DOCUMENT_INTELLIGENCE_KEY',      value: docIntelKey }
      ])
    }
  }
}

// ─── Outputs ──────────────────────────────────────────────────────────────────
output sasFunctionAppName      string = sasFunctionApp.name
output sasFunctionAppUrl       string = 'https://${sasFunctionApp.properties.defaultHostName}'
output docIntelFunctionAppName string = docIntelFunctionApp.name
output docIntelFunctionAppUrl  string = 'https://${docIntelFunctionApp.properties.defaultHostName}'
output logAnalyticsWorkspaceId string = logAnalytics.id
output logAnalyticsCustomerId  string = logAnalytics.properties.customerId
output logAnalyticsSharedKey   string = logAnalytics.listKeys().primarySharedKey
