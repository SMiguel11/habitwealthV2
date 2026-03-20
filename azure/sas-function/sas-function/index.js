const { StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } = require('@azure/storage-blob')
const crypto = require('crypto')

module.exports = async function (context, req) {
  try {
    const account = process.env.AZURE_STORAGE_ACCOUNT_NAME
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY
    if (!account || !accountKey) {
      context.res = { status: 500, body: { error: 'Missing AZURE_STORAGE_ACCOUNT_NAME or AZURE_STORAGE_ACCOUNT_KEY' } }
      return
    }

    const containerName = (req.body && req.body.container) || process.env.SAS_CONTAINER || 'uploads'
    const filename = (req.body && req.body.filename) || `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.pdf`
    const expiresInMinutes = Number(process.env.SAS_EXPIRES_MINUTES || 15)

    const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey)

    const expiresOn = new Date(new Date().valueOf() + expiresInMinutes * 60 * 1000)

    const sasOptions = {
      containerName,
      blobName: filename,
      permissions: BlobSASPermissions.parse('cw'), // create + write
      startsOn: new Date(new Date().valueOf() - 5 * 60 * 1000),
      expiresOn
    }

    const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString()

    // Use custom endpoint (e.g. Azurite) when AZURE_STORAGE_BLOB_ENDPOINT is set
    const blobBase = process.env.AZURE_STORAGE_BLOB_ENDPOINT
      || `https://${account}.blob.core.windows.net`

    const uploadUrl = `${blobBase}/${containerName}/${encodeURIComponent(filename)}?${sasToken}`
    const blobUrl   = `${blobBase}/${containerName}/${encodeURIComponent(filename)}`

    context.res = {
      status: 200,
      body: { uploadUrl, blobUrl, expiresOn }
    }
  } catch (err) {
    context.log.error(err)
    context.res = { status: 500, body: { error: err.message } }
  }
}