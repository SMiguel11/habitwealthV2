# HabitWealth - Testing & Deployment Guide

## Local Development Setup

### Prerequisites
- Node.js 18+ with npm/pnpm
- Azure Functions Core Tools
- Docker Desktop (for container agent testing)
- Azure CLI

### Step 1: Start Azure Functions Locally

```bash
cd azure/sas-function
npm install  # if not already done
func start
```

Output should show:
```
Functions:
  insights-api: [GET] http://localhost:7071/api/insights-api
  mock-analyze: [POST] http://localhost:7071/api/mock-analyze
  sas-function: [GET] http://localhost:7071/api/sas-function

For detailed output, run func with --verbose flag.
```

### Step 2: Start Enrichment Agent (Optional - for real analysis)

If you want actual enrichment pipeline results instead of mock data:

```bash
cd enrichment-agent
python -m venv venv  # create virtual environment
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py
```

The agent will run on `http://localhost:8001` and Nuxt dev server will automatically use it via proxy.

### Step 3: Start Frontend Dev Server

```bash
npm install  # if not already done
npm run dev
```

Server will be available at `http://localhost:3000`

## Testing the Complete Flow

### Test Scenario 1: Basic 3-Step Workflow

1. **Open Application**
   - Navigate to `http://localhost:3000`
   - Should see landing page with "Welcome!" message
   - Enter your name (e.g., "Alice") and click "Get Started"

2. **Step 1 - Upload Files**
   - On get-started page, click the blue circle "1"
   - Upload modal should open with file input area
   - Drag and drop 1-3 PDF files (can be any PDFs for testing)
   - Click "Upload" button
   - Verify:
     - Files show status "Uploading…" (with animated text)
     - Status changes to "Done ✓" after completion
     - Green banner appears: "✓ Files uploaded successfully!"
     - Modal closes after 1.5 seconds
     - Step 1 circle shows checkmark ✓ (green background)

3. **Step 2 - Survey**
   - Circle 2 should now be blue (enabled)
   - Click "2" to open survey modal
   - Answer all 7 questions:
     - Questions 1-5: Click 1/2/3/4 buttons for Likert scale
     - Question 6 & 7: Select from multiple choice options
   - Verify: "Enviar" button is disabled until ALL questions answered
   - Click "Enviar"
   - Verify:
     - Green banner: "✓ Survey completed!"
     - Modal closes
     - Step 2 shows checkmark ✓

4. **Step 3 - Goals**
   - Circle 3 should now be blue (enabled)
   - Click "3" to open goals modal
   - Enter financial goal (e.g., "COMPRAR COMPUTADORA → $1,200 EN 6 MESES")
   - Verify: "»" button is disabled if textarea is empty
   - Click "»" button
   - Verify:
     - Green banner: "✓ Goals saved!"
     - Modal closes
     - Step 3 shows checkmark ✓

5. **View Results**
   - "Next: View Your Insights →" button should now be enabled
   - Click button
   - Navigate to `/insights` page
   - Verify data display:
     - HabitWealth Score displays (number 0-100)
     - Financial Stress Index shows
     - Spending categories listed
     - Recent transactions visible
     - Recommendations/nudges displayed

### Test Scenario 2: Sequential Enforcement

1. **Start from Step 1** (Upload modal open)
2. **Try to click Step 2** before uploading
   - Circle 2 should be grayed out, disabled
   - Red banner should appear: "⚠ Complete Step 1 first!"
   - Modal should NOT open
3. **Complete Step 1** (upload + success message)
4. **Try to click Step 3** before survey
   - Circle 3 should be grayed out
   - Red banner: "⚠ Complete Step 2 first!"
5. **Complete Step 2** (survey)
6. **Now Step 3 is enabled** - clicking works
7. **Verify "Next" button** is disabled until all 3 steps complete

### Test Scenario 3: Error Handling

1. **Upload Error Simulation**
   - Select files and click Upload
   - If upload fails (e.g., network error), red banner shows error message
   - Upload status shows "Failed ✗" for affected files
   - Can click "Clear" and retry

2. **Survey Validation**
   - Open survey, answer 6 questions
   - Leave 1 question blank
   - "Enviar" button stays disabled
   - Answer all questions → button becomes enabled

3. **Goals Validation**
   - Open goals modal
   - Leave textarea empty
   - "»" button stays disabled

## API Testing (Advanced)

### Test SAS Token Generation
```bash
curl -X GET "http://localhost:7071/api/sas-function"
```

Expected response:
```json
{
  "uploadUrl": "https://.../uploads/file.pdf?sv=...",
  "blobUrl": "https://.../uploads/file.pdf",
  "expiresOn": "2025-01-25T12:30:00.000Z"
}
```

### Test Mock Analyze
```bash
curl -X POST "http://localhost:7071/api/mock-analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "statement.pdf",
    "userId": "local-user",
    "surveyAnswers": [1,2,3,2,1,0,1],
    "goals": "Save $1000 in 3 months"
  }'
```

### Test Insights API
```bash
curl -X GET "http://localhost:7071/api/insights-api?userId=local-user"
```

Expected response includes:
- `habitWealthScore`: 0-100
- `fsiLevel`: "Low", "Medium", or "High"
- `byCategory`: spending breakdown
- `nudges`: recommendations array
- `recentTransactions`: transaction list

## Production Deployment

### Prerequisites
- Azure subscription with resources created (from previous Bicep deployment)
- GitHub repository with proper permissions
- Azure Static Web App connected

### Step 1: Build Frontend
```bash
npm run build
```

Output: `.output/public/` directory with pre-rendered HTML

### Step 2: Deploy to Azure Static Web App
Deployment is automatic via GitHub Actions when you push to main branch.

Verify deployment:
1. Check GitHub Actions workflow status
2. Visit Static Web App URL (e.g., `https://hwbase-swa-00211.graymeadow-....azurecontainerapps.io`)
3. Test complete flow end-to-end

### Step 3: Verify Azure Functions
```bash
# Check Function App status
az functionapp list -g habitwealthtest-rg

# Check app settings
az functionapp config appsettings list -g habitwealthtest-rg -n hwbase-fn-sas-00211
az functionapp config appsettings list -g habitwealthtest-rg -n hwbase-fn-di-00211

# Verify ENRICHMENT_AGENT_URL is set
az functionapp config appsettings list -g habitwealthtest-rg -n hwbase-fn-sas-00211 | grep ENRICHMENT
```

### Step 4: Test Container App
```bash
# Get container app URL
az containerapp show -n hwbase-agent-00211 -g habitwealthtest-rg | grep fqdn

# Test health endpoint
curl https://<FQDN>/health
```

Expected response:
```json
{
  "message": "Welcome to the HabitWealth Enrichment Agent API",
  "version": "2.0.0"
}
```

## Troubleshooting

### Issue: "Cannot find module" errors
**Solution:** 
```bash
npm install  # reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: Azure Functions not running
**Solution:**
```bash
func --version  # verify Azure Functions Core Tools installed
func start --verbose  # run with verbose output to see errors
```

### Issue: Enrichment Agent not responding
**Solution:**
```bash
# Check if Python is installed
python --version

# Install dependencies
pip install -r enrichment-agent/requirements.txt

# Run with debug output
python enrichment-agent/main.py
# Look for "Uvicorn running on http://127.0.0.1:8001"
```

### Issue: CORS errors when calling API
**Solution:**
The dev server proxies `/api/*` to Functions. Ensure:
1. Functions running on `http://localhost:7071`
2. Nuxt dev server running on `http://localhost:3000`
3. Check console for actual error URL and verify endpoint exists

### Issue: Files not uploading to blob storage
**Solution:**
1. Check SAS function response: `curl http://localhost:7071/api/sas-function`
2. Verify Azurite running (or Azure Storage accessible)
3. Check browser console for upload error details
4. Verify `uploadedFiles` array shows "queued" status initially

## Browser DevTools Tips

### Vue DevTools
Install Vue DevTools extension to inspect component state:
- Check `uploadCompleted`, `surveyCompleted`, `goalsCompleted` states
- Verify computed properties calculate correctly
- Monitor event handler execution

### Network Tab
- Monitor `/api/sas-function` call when uploading
- Monitor `/api/mock-analyze` call for enrichment
- Monitor `/api/insights-api` call on insights page
- Check response payloads for expected structure

### Console Tab
- Watch for JavaScript errors (should be none)
- Monitor fetch request logs if enabled
- Check for timing information

## Performance Testing

### Local Development
```bash
# Monitor local-db.json size as you add documents
ls -lh azure/sas-function/local-db.json

# Typical sizes:
# 1 document: ~5KB
# 5 documents: ~25KB
# 20 documents: ~100KB
```

### Production (Cosmos DB)
```bash
# Check Cosmos DB query metrics
az cosmosdb query "SELECT COUNT(1) FROM c" \
  -a habitwealthtest-cosmos-00211 \
  -d HabitWealthDB \
  -c documents
```

## Cleanup & Reset

### Reset Local Data
```bash
# Delete local database
rm azure/sas-function/local-db.json

# Recreate on next flow
# (File auto-created when first document saved)
```

### Reset Blob Storage (locally)
```bash
# Stop Azure Functions
# Delete Azurite data
rm -rf __blobstorage__ __queuestorage__ __azurite*

# Restart Functions
func start
```

## Security Notes

### Local Development
- ✅ Uses local authentication
- ✅ No secrets required for testing
- ⚠️ Mock analyzer generates fake transaction data

### Production
- ✅ Key Vault stores all secrets (storage keys, etc.)
- ✅ Managed Identity for Azure Function auth
- ✅ Static Web App has GitHub Actions auth
- ✅ Container App requires ACR credentials
- ⚠️ Consider adding API authentication (Api Key, JWT, etc.)

## Next Steps

1. **End-to-End Testing**: Run complete flow locally
2. **Performance Testing**: Time each step, measure data sizes
3. **Production Deployment**: Push to GitHub main branch
4. **Monitoring**: Check Azure Application Insights
5. **Cost Tracking**: Monitor Azure costs in Azure Portal
6. **User Testing**: Get feedback from real users

## References

- Nuxt Documentation: https://nuxt.com/docs
- Azure Functions: https://learn.microsoft.com/azure/azure-functions/
- Azure Static Web Apps: https://learn.microsoft.com/azure/static-web-apps/
- Azure Storage: https://learn.microsoft.com/azure/storage/
- Python FastAPI: https://fastapi.tiangolo.com/
