// infra/static-web-app.bicep — Azure Static Web Apps (Free tier) for Nuxt frontend
// Cost: $0 — always free, no expiry.
//
// ─── IMPORTANT: Nuxt configuration before deploying ────────────────────────────
// The current nuxt.config.ts only pre-renders '/'. For SWA to serve all pages
// statically, add the remaining routes to the prerender list:
//
//   routeRules: {
//     '/':           { prerender: true },
//     '/get-started': { prerender: true },
//     '/insights':    { prerender: true },
//   }
//
// Then build the static output:  pnpm generate
// Output will be in: .output/public/
//
// ─── CI/CD via GitHub Actions ────────────────────────────────────────────────
// SWA can auto-generate a GitHub Actions workflow. Provide repositoryUrl and
// branch params, or leave empty and deploy manually with the Azure SWA CLI:
//   npm install -g @azure/static-web-apps-cli
//   swa deploy .output/public --deployment-token <deploymentToken>
// ─────────────────────────────────────────────────────────────────────────────

@description('Azure region — SWA has limited regions; must be one of the allowed values')
param location string = 'westeurope'

@description('Base name used to generate resource names')
param baseName string

@description('4-8 char unique suffix to avoid naming conflicts')
@minLength(4)
@maxLength(8)
param uniqueSuffix string

@description('GitHub repository URL — optional, for auto CI/CD workflow generation')
param repositoryUrl string = ''

@description('GitHub branch to deploy from (used only when repositoryUrl is provided)')
param branch string = 'main'

@description('Tags applied to all resources')
param tags object = {}

// Build the properties object by merging an optional repo section when repositoryUrl is provided
var repoProps = empty(repositoryUrl) ? {} : {
  repositoryUrl: repositoryUrl
  branch:        branch
}

var swaProperties = union(repoProps, {
  buildProperties: {
    appLocation:    '/'              // Root of the Nuxt project
    outputLocation: '.output/public' // Output of `pnpm generate`
    apiLocation:    ''               // Azure Functions are deployed separately
  }
})

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name:       '${baseName}-swa-${uniqueSuffix}'
  location:   location
  tags:       tags
  identity: {
    type: 'SystemAssigned'  // Enable Managed Identity for secure authentication
  }
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: swaProperties
}

// ─── Outputs ──────────────────────────────────────────────────────────────────
output defaultHostname  string = staticWebApp.properties.defaultHostname
output staticWebAppName string = staticWebApp.name
// deploymentToken is intentionally omitted to avoid exposing a secret; use
// `az staticwebapp list-secrets` if you need it.
