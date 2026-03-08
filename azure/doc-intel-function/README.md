# Document Intelligence Azure Function (Blob Trigger)

This Azure Function is triggered when a new blob is uploaded to the `uploads/` container (see `function.json`). It analyzes PDF/PNG/JPG documents using Azure Document Intelligence (formerly Form Recognizer) and optionally persists the structured result to Cosmos DB.

Requirements

- Node 18+ runtime for Azure Functions
- Environment variables (see `local.settings.json.sample`):
  - `DOCUMENT_INTELLIGENCE_ENDPOINT` — your Document Intelligence endpoint
  - `DOCUMENT_INTELLIGENCE_KEY` — API key
  - (optional) `COSMOS_CONNECTION_STRING`, `COSMOS_DB`, `COSMOS_CONTAINER` to persist analysis

Install & run locally

```bash
cd azure/doc-intel-function
npm install
func start
```

How it works

- The function receives the blob content via the `blobTrigger` binding (path `uploads/{name}`).
- It initializes `DocumentAnalysisClient` and calls `beginAnalyzeDocument('prebuilt-layout', blobStream)` to extract tables and layout.
- If Cosmos configuration is present, it upserts a document with the analysis results.

Deployment notes

- Grant the Function app access to the Storage account used for `AzureWebJobsStorage`.
- For production, prefer Managed Identity access patterns instead of using keys in environment variables.
- Tune the prebuilt model (`prebuilt-layout`, `prebuilt-invoice`...) depending on document types.

Security

- Keep keys secret; use Key Vault or Managed Identity.
- If persisting to Cosmos DB, restrict IP ranges and enable firewall if needed.

