// Example helper to request SAS from backend and upload a file
// Usage: await uploadFile(file)

export async function getSasToken(apiUrl, filename) {
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename })
  })
  if (!res.ok) throw new Error('Failed to get SAS')
  return res.json()
}

export async function uploadWithSas(uploadUrl, file) {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': file.type || 'application/octet-stream'
    },
    body: file
  })
  if (!res.ok) throw new Error('Upload failed')
  return true
}

export async function uploadFile(apiUrl, file) {
  const { uploadUrl, blobUrl } = await getSasToken(apiUrl, file.name)
  await uploadWithSas(uploadUrl, file)
  return blobUrl
}
