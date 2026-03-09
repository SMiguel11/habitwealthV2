// Helper to request SAS from backend and upload a file
// Usage: const { uploadUrl, blobUrl } = await getSasToken(apiUrl, filename)
//        await uploadWithSas(uploadUrl, file)

export async function getSasToken(apiUrl, filename) {
  const url = new URL(apiUrl, window.location.origin)
  url.searchParams.set('filename', filename)
  
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })
  if (!res.ok) throw new Error(`SAS token request failed: ${res.statusText}`)
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
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Upload failed (${res.status}): ${errText || res.statusText}`)
  }
  return true
}

export async function uploadFile(apiUrl, file) {
  const { uploadUrl, blobUrl } = await getSasToken(apiUrl, file.name)
  await uploadWithSas(uploadUrl, file)
  return blobUrl
}
