import os
from azure.cosmos import CosmosClient

# ── Configuration ─────────────────────────────────────────────────────────────
# Local dev:  set COSMOS_ENDPOINT + COSMOS_KEY in your .env / local.settings.json
# Production: values are injected automatically via Managed Identity + Key Vault
#             (no secrets in source code)
#
# To get these values after creating Cosmos DB in Azure:
#   1. Azure Portal → your Cosmos DB account → Keys → URI + Primary Key
#   2. Or: az cosmosdb show -n <account> -g <rg> --query documentEndpoint -o tsv
#          az cosmosdb keys list -n <account> -g <rg> --query primaryMasterKey -o tsv

COSMOS_ENDPOINT = os.environ.get("COSMOS_ENDPOINT", "")
COSMOS_KEY      = os.environ.get("COSMOS_KEY", "")

if not COSMOS_ENDPOINT:
    raise EnvironmentError(
        "COSMOS_ENDPOINT is not set. "
        "Add it to your .env file or azure/sas-function/local.settings.json for local dev."
    )

DATABASE_NAME  = os.environ.get("COSMOS_DATABASE", "HabitWealthDB")
CONTAINER_NAME = os.environ.get("COSMOS_CONTAINER", "Documents")

# Use key auth locally; in production DefaultAzureCredential via Managed Identity is preferred
if COSMOS_KEY:
    client = CosmosClient(COSMOS_ENDPOINT, credential=COSMOS_KEY)
else:
    # Managed Identity path (production — no key needed)
    from azure.identity import DefaultAzureCredential
    client = CosmosClient(COSMOS_ENDPOINT, credential=DefaultAzureCredential())
database = client.create_database_if_not_exists(id=DATABASE_NAME)
container = database.create_container_if_not_exists(
    id=CONTAINER_NAME,
    partition_key={"path": "/userId", "kind": "Hash"},  # partición por usuario
    offer_throughput=400
)

def save_document(document: dict):
    """Save a document to Cosmos DB."""
    container.upsert_item(document)

def get_document(document_id: str, user_id: str):
    """Retrieve a document by ID. Requires userId for partition key routing."""
    return container.read_item(item=document_id, partition_key=user_id)

def query_user_documents(user_id: str) -> list:
    """Return all documents for a given user."""
    query = "SELECT * FROM c WHERE c.userId = @userId ORDER BY c.analyzedAt DESC"
    params = [{"name": "@userId", "value": user_id}]
    return list(container.query_items(query=query, parameters=params, partition_key=user_id))
