// infra/keyvault.bicep
// Provisions Azure Key Vault + User-Assigned Managed Identity for HabitWealth.
// All secrets are set post-deploy via `az keyvault secret set`.
//
// Deploy: az deployment group create -g <rg> -f infra/keyvault.bicep -p @infra/keyvault.params.json

@description('Location for all resources')
param location string = resourceGroup().location

@description('Base name used to generate resource names (e.g. "habitwealth")')
param baseName string = 'habitwealth'

@description('Azure AD Object ID of the deployment principal (for admin access)')
param deployerObjectId string

@description('Tags to apply to all resources')
param tags object = {
  project:     'HabitWealth'
  environment: 'production'
}

// ─── User-Assigned Managed Identity ──────────────────────────────────────────
resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name:     '${baseName}-identity'
  location: location
  tags:     tags
}

// ─── Key Vault ────────────────────────────────────────────────────────────────
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name:     '${baseName}-kv'
  location: location
  tags:     tags

  properties: {
    sku: {
      family: 'A'
      name:   'standard'
    }
    tenantId:               subscription().tenantId
    enableRbacAuthorization: true        // Use RBAC instead of access policies
    enableSoftDelete:        true
    softDeleteRetentionInDays: 90
    enablePurgeProtection:   true
    networkAcls: {
      defaultAction: 'Allow'             // Tighten to 'Deny' + virtualNetworkRules in prod
      bypass:        'AzureServices'
    }
  }
}

// ─── RBAC: Managed Identity → Key Vault Secrets User ─────────────────────────
var kvSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'

resource miKvSecretUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name:  guid(keyVault.id, managedIdentity.id, kvSecretsUserRoleId)
  scope: keyVault

  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsUserRoleId)
    principalId:      managedIdentity.properties.principalId
    principalType:    'ServicePrincipal'
  }
}

// ─── RBAC: Deployer → Key Vault Secrets Officer (for initial secret seeding) ─
var kvSecretsOfficerRoleId = 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7'

resource deployerKvOfficer 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name:  guid(keyVault.id, deployerObjectId, kvSecretsOfficerRoleId)
  scope: keyVault

  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsOfficerRoleId)
    principalId:      deployerObjectId
    principalType:    'User'
  }
}

// ─── Secret placeholders (values set post-deploy) ────────────────────────────
// az keyvault secret set --vault-name ${baseName}-kv --name storage-key   --value <storage-account-key>
// az keyvault secret set --vault-name ${baseName}-kv --name cosmos-key    --value <cosmos-primary-key>
// az keyvault secret set --vault-name ${baseName}-kv --name openai-key    --value <azure-openai-key>
// az keyvault secret set --vault-name ${baseName}-kv --name di-key        --value <document-intelligence-key>

// ─── Outputs ─────────────────────────────────────────────────────────────────
output keyVaultUri        string = keyVault.properties.vaultUri
output keyVaultName       string = keyVault.name
output managedIdentityId  string = managedIdentity.id
output managedIdentityClientId string = managedIdentity.properties.clientId
output managedIdentityPrincipalId string = managedIdentity.properties.principalId
