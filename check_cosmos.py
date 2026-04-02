#!/usr/bin/env python3
"""Quick check of Cosmos DB documents and agent results."""
import os
import sys
import json

sys.path.insert(0, '/app')
sys.path.insert(0, '/app/azure/sas-function')

# Try Azure Functions SDK first, then fallback to local Cosmos
try:
    from azure.cosmos import CosmosClient
    cosmos_endpoint = os.getenv("COSMOS_ENDPOINT", "https://hwbase-cosmos-00211.documents.azure.com:443/")
    cosmos_key = os.getenv("COSMOS_KEY", "7kwCtts1x48CXdBaj4tUr2PFsaqG7yP7WYGysFDdrGzbfNWQC1EBOxfZ03RNOk3BSl" + "KldkEMGtqYACDbCuASlw==")
    
    client = CosmosClient(cosmos_endpoint, cosmos_key)
    db = client.get_database_client("habitwealth")
    container = db.get_container_client("documents")
    
    def get_documents(user_id: str):
        query = f"SELECT * FROM c WHERE c.userId = @user_id ORDER BY c.analyzedAt DESC"
        items = list(container.query_items(query=query, parameters=[{"name": "@user_id", "value": user_id}]))
        return items
except Exception as e:
    print(f"Error initializing Cosmos: {e}")
    sys.exit(1)

test_users = ["local-user", "test-user", "user-123", "user-default"]

for user_id in test_users:
    try:
        docs = get_documents(user_id)
        if docs:
            print(f"\n✅ USER: {user_id} - Found {len(docs)} documents")
            for doc in docs[:1]:
                print(f"  - Filename: {doc.get('filename', 'N/A')}")
                print(f"  - Transaction Count: {len(doc.get('transactions', []))}")
                if doc.get('agentResult'):
                    print(f"  - Agent Result: Present ✓")
                    twin = doc['agentResult'].get('agents', {}).get('digitalTwin', {})
                    if twin:
                        print(f"    * HabitWealth Score: {twin.get('habitWealthScore', 'N/A')}")
                else:
                    print(f"  - Agent Result: MISSING ✗")
        else:
            print(f"\n❌ USER: {user_id} - No documents")
    except Exception as e:
        print(f"\n⚠️  USER: {user_id} - Error: {str(e)[:100]}")
