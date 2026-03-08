# SAS Generator Azure Function

This Azure Function returns a short-lived SAS upload URL for a blob.

Usage

1. Set environment variables (locally use `local.settings.json`):
   - `AZURE_STORAGE_ACCOUNT_NAME`
   - `AZURE_STORAGE_ACCOUNT_KEY`
   - `SAS_CONTAINER` (optional, default `uploads`)
   - `SAS_EXPIRES_MINUTES` (optional, default `15`)

2. Install dependencies and run locally:

```bash
cd azure/sas-function
npm install
func start
```

3. Example request (POST JSON):

```bash
curl -X POST http://localhost:7071/api/sas-function -H "Content-Type: application/json" -d '{"filename":"stmt.pdf"}'
```

Response:

```json
{ "uploadUrl": "https://<account>.blob.core.windows.net/uploads/stmt.pdf?sv=...", "blobUrl": "https://<account>.blob.core.windows.net/uploads/stmt.pdf", "expiresOn": "..." }
```

4. Upload file using the `uploadUrl` with an HTTP PUT. Example upload:

```bash
curl -X PUT "<uploadUrl>" -H "x-ms-blob-type: BlockBlob" -H "Content-Type: application/pdf" --data-binary @stmt.pdf
```

Notes & Security

- This function uses account key to generate SAS. For production prefer using a Managed Identity + Azure AD for higher security.
- Keep SAS expiry short and container with restricted access.
- Add CORS restrictions or an auth layer (Azure AD) in front of the function.

Frontend example

See `app/utils/sasUpload.js` in the repo for a small helper showing how to call the function and PUT the file.
