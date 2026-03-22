// infra/container-apps.bicep — Container Registry + Container Apps Environment
// Hosts: HabitWealth Enrichment Agent (Python FastAPI, multi-agent pipeline)
//
// Cost:
//   Container Registry Basic   ~$5/month  (only paid service in this stack)
//   Container Apps Consumption  $0        (180K vCPU-s + 360K GiB-s + 2M requests free monthly)
//
// ─── Image deployment workflow ────────────────────────────────────────────────
//   After first Bicep deploy, build and push the real image:
//
//   az acr login --name <registryName>
//   docker build -t <registryLoginServer>/habitwealth-enrichment-agent:latest ./enrichment-agent
//   docker push <registryLoginServer>/habitwealth-enrichment-agent:latest
//
//   Then update the container app image:
//   az containerapp update \
//     -n <containerAppName> -g <resourceGroup> \
//     --image <registryLoginServer>/habitwealth-enrichment-agent:latest
// ─────────────────────────────────────────────────────────────────────────────

@description('Azure region for all resources')
param location string

@description('Base name used to generate resource names')
param baseName string

@description('4-8 char unique suffix to avoid naming conflicts')
@minLength(4)
@maxLength(8)
param uniqueSuffix string

@description('Log Analytics Workspace customerId (from functions module output)')
param logAnalyticsCustomerId string

@description('Log Analytics Workspace primary shared key (from functions module output)')
param logAnalyticsSharedKey string

@description('User-Assigned Managed Identity resource ID')
param managedIdentityId string

@description('User-Assigned Managed Identity client ID')
param managedIdentityClientId string

@description('Azure Key Vault URI')
param keyVaultUri string

@description('Cosmos DB endpoint URL')
param cosmosEndpoint string

@description('Cosmos DB primary key')
param cosmosPrimaryKey string

@description('Storage Account name')
param storageAccountName string

@description('Storage Account primary key')
param storageAccountKey string

@description('Tags applied to all resources')
param tags object = {}

// Container Registry name: 5-50 chars, alphanumeric only
var registryName = toLower('${take(replace(baseName, '-', ''), 42)}${uniqueSuffix}')

// ─── Azure Container Registry (Basic) ─────────────────────────────────────────
resource registry 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name:     registryName
  location: location
  tags:     tags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled:    false      // Disabled — Container Apps uses Managed Identity via RBAC
    publicNetworkAccess: 'Disabled' // Internal-only registry; Container Apps accesses via VNet
  }
}

// ─── Grant Managed Identity AcrPull role on registry ────────────────────────────
resource acrPullRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, managedIdentityId, '/subscriptions/${subscription().subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/7f951dda-4ed3-4680-a7ca-40881f42e221')
  scope: registry
  properties: {
    roleDefinitionId: '/subscriptions/${subscription().subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/7f951dda-4ed3-4680-a7ca-40881f42e221'
    principalId: reference(managedIdentityId, '2023-01-31', 'Full').properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// ─── Container Apps Environment ───────────────────────────────────────────────
resource cae 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name:     '${baseName}-cae-${uniqueSuffix}'
  location: location
  tags:     tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsCustomerId
        sharedKey:  logAnalyticsSharedKey
      }
    }
  }
}

// ─── Enrichment Agent Container App ───────────────────────────────────────────
// Uses a Microsoft placeholder image on first deploy.
// Replace with the real image after building and pushing (see header comments).
resource enrichmentAgent 'Microsoft.App/containerApps@2024-03-01' = {
  name:     '${baseName}-agent-${uniqueSuffix}'
  location: location
  tags:     tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${managedIdentityId}': {} }
  }
  properties: {
    environmentId: cae.id
    configuration: {
      ingress: {
        external:            true
        targetPort:          8001
        transport:           'http'
        clientCertificateMode: 'require'
      }
      registries: [
        {
          server: registry.properties.loginServer
          identity: managedIdentityId  // Use Managed Identity instead of admin credentials
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'enrichment-agent'
          // Replace after building the real image:
          //   <registryLoginServer>/habitwealth-enrichment-agent:latest
          image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
          resources: {
            cpu:    '0.5'
            memory: '1Gi'
          }
          env: [
            { name: 'AZURE_KEY_VAULT_URI',  value: keyVaultUri }
            { name: 'AZURE_CLIENT_ID',       value: managedIdentityClientId }
            { name: 'COSMOS_ENDPOINT',       value: cosmosEndpoint }
            { name: 'COSMOS_KEY',            value: cosmosPrimaryKey }
            { name: 'COSMOS_DATABASE',       value: 'habitwealth' }
            { name: 'COSMOS_CONTAINER',      value: 'documents' }
            { name: 'STORAGE_ACCOUNT_NAME',  value: storageAccountName }
            { name: 'STORAGE_ACCOUNT_KEY',   value: storageAccountKey }
            { name: 'LOG_LEVEL',             value: 'INFO' }
          ]
        }
      ]
      scale: {
        minReplicas: 0  // Scale to zero when idle — $0 compute when not in use
        maxReplicas: 3
        rules: [
          {
            name: 'http-scaling'
            http: { metadata: { concurrentRequests: '10' } }
          }
        ]
      }
    }
  }
}

// ─── Outputs ──────────────────────────────────────────────────────────────────
output registryName        string = registry.name
output registryLoginServer string = registry.properties.loginServer
output containerAppName    string = enrichmentAgent.name
output containerAppFqdn    string = enrichmentAgent.properties.configuration.ingress.fqdn
output enrichmentAgentUrl  string = 'https://${enrichmentAgent.properties.configuration.ingress.fqdn}'
