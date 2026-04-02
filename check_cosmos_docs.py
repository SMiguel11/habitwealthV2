#!/usr/bin/env python3
"""Check if documents exist in Cosmos DB for local-user"""
import json
import os
from azure.cosmos import CosmosClient

# Read Cosmos credentials from env
cosmos_endpoint = os.getenv("COSMOS_DB_ENDPOINT", "https://hwbase-cosmos-00211.documents.azure.com:443/")
cosmos_key = os.getenv("COSMOS_DB_KEY", "")
cosmos_database = "habitwealth"
cosmos_container = "documents"

print(f"Connecting to Cosmos DB...")
print(f"Endpoint: {cosmos_endpoint}")

try:
    client = CosmosClient(cosmos_endpoint, cosmos_key)
    database = client.get_database_client(cosmos_database)
    container = database.get_container_client(cosmos_container)
    
    # Query for local-user documents (partition key is userId)
    query = "SELECT * FROM c ORDER BY c.analyzedAt DESC"
    print(f"\nQuerying with partition key: local-user")
    
    items = list(container.query_items(query=query, partition_key="local-user"))
    print(f"\nFound {len(items)} documents for local-user")
    
    if items:
        for i, doc in enumerate(items):
            print(f"\n[DOC {i+1}]")
            print(f"  ID: {doc.get('id', 'N/A')}")
            print(f"  Filename: {doc.get('filename', 'N/A')}")
            print(f"  Analyzed: {doc.get('analyzedAt', 'N/A')}")
            print(f"  Has agentResult: {'agentResult' in doc}")
            if 'agentResult' in doc:
                agents = doc.get('agentResult', {}).get('agents', {})
                print(f"  Agents: {list(agents.keys())}")
                if 'documentIntelligence' in agents:
                    di = agents['documentIntelligence']
                    print(f"    Income: {di.get('totalIncome')}")
                    print(f"    Expenses: {di.get('totalExpenses')}")
    else:
        print("NO DOCUMENTS FOUND - Database might be empty or query failed")
        
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {str(e)}")
    print("\nMake sure COSMOS_DB_KEY environment variable is set!")
