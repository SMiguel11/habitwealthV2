/**
 * sas-function-upload/index.js
 * Receives base64-encoded file from frontend and uploads to Azure Blob Storage.
 * Expects JSON body: { fileBase64, filename, userId }
 */
const { BlobServiceClient } = require('@azure/storage-blob')

module.exports = async function (context, req) {
  try {
    context.log('[Upload] Received file upload request')

    const connStr = process.env.AzureWebJobsStorage
    if (!connStr) {
      context.log.error('[Upload] AzureWebJobsStorage not configured')
      context.res = { status: 500, body: { error: 'Storage connection not configured' } }
      return
    }

    const { fileBase64, filename, userId = 'local-user' } = req.body || {}

    if (!fileBase64 || !filename) {
      context.res = { status: 400, body: { error: 'fileBase64 and filename are required' } }
      return
    }

    // Decode base64 to buffer
    const base64Data = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64
    const fileBuffer = Buffer.from(base64Data, 'base64')

    const blobServiceClient = BlobServiceClient.fromConnectionString(connStr)
    const containerName = process.env.SAS_CONTAINER || 'uploads'
    const containerClient = blobServiceClient.getContainerClient(containerName)

    await containerClient.createIfNotExists()

    const blobName = `${userId}/${Date.now()}-${filename}`
    context.log(`[Upload] Uploading ${filename} (${fileBuffer.length} bytes) → ${containerName}/${blobName}`)

    const blockBlobClient = containerClient.getBlockBlobClient(blobName)
    await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
      blobHTTPHeaders: {
        blobContentType: filename.endsWith('.pdf') ? 'application/pdf' : 'text/csv'
      }
    })

    const blobUrl = `${blobServiceClient.url}${containerName}/${blobName}`
    context.log(`[Upload✓] Uploaded: ${blobUrl}`)

    context.res = {
      status: 200,
      body: { success: true, blobUrl, filename, userId }
    }
  } catch (err) {
    context.log.error(`[Upload✗] ${err.message}`)
    context.log.error(err.stack)
    context.res = {
      status: 500,
      body: { error: err.message, details: err.stack }
    }
  }
}

