const { BlobServiceClient, generateBlobSASQueryParameters, StorageSharedKeyCredential } = require("@azure/storage-blob");

module.exports = async function (context, req) {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

    if (!accountName || !accountKey || !containerName) {
        context.res = {
            status: 500,
            body: "Missing Azure Storage configuration in environment variables.",
        };
        return;
    }

    const blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        new StorageSharedKeyCredential(accountName, accountKey)
    );

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = req.query.filename || "default.txt";
    const blobClient = containerClient.getBlockBlobClient(blobName);

    const sasToken = generateBlobSASQueryParameters(
        {
            containerName,
            blobName,
            permissions: "w",
            startsOn: new Date(),
            expiresOn: new Date(new Date().valueOf() + 3600 * 1000), // 1 hour
        },
        blobServiceClient.credential
    ).toString();

    context.res = {
        status: 200,
        body: {
            sasUrl: `${blobClient.url}?${sasToken}`,
        },
    };
};
