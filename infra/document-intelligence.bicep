// infra/document-intelligence.bicep — Azure AI Document Intelligence
// SKU F0 (free): 500 pages/month — sufficient for demo/hackathon use.
// Note: Only one F0 instance allowed per Azure subscription per region.
// To process more pages, change sku.name to 'S0' (~$1.50 per 1,000 pages).

@description('Azure region for the resource')
param location string

@description('Base name used to generate resource names')
param baseName string

@description('4-8 char unique suffix to avoid naming conflicts')
@minLength(4)
@maxLength(8)
param uniqueSuffix string

@description('Tags applied to all resources')
param tags object = {}

resource docIntel 'Microsoft.CognitiveServices/accounts@2024-04-01-preview' = {
  name:     '${baseName}-di-${uniqueSuffix}'
  location: location
  tags:     tags
  kind:     'FormRecognizer'
  sku: {
    name: 'S0'  // Paid tier — costs only ~$1.50 per 1,000 pages. No "one free per subscription" limit.
  }
  properties: {
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
    }
  }
}

// ─── Outputs ──────────────────────────────────────────────────────────────────
output endpoint   string = docIntel.properties.endpoint
output primaryKey string = docIntel.listKeys().key1
output resourceId string = docIntel.id
