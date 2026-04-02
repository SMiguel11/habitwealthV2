#!/usr/bin/env python3
"""Check agent results detail."""
import os
import sys
import json
from azure.cosmos import CosmosClient

cosmos_endpoint = os.getenv("COSMOS_ENDPOINT", "https://hwbase-cosmos-00211.documents.azure.com:443/")
cosmos_key = os.getenv("COSMOS_KEY", "7kwCtts1x48CXdBaj4tUr2PFsaqG7yP7WYGysFDdrGzbfNWQC1EBOxfZ03RNOk3BSlKldkEMGtqYACDbCuASlw==")

client = CosmosClient(cosmos_endpoint, cosmos_key)
db = client.get_database_client("habitwealth")
container = db.get_container_client("documents")

query = "SELECT * FROM c WHERE c.userId = @user_id ORDER BY c.analyzedAt DESC OFFSET 0 LIMIT 1"
docs = list(container.query_items(query=query, parameters=[{"name": "@user_id", "value": "local-user"}]))

if docs:
    doc = docs[0]
    
    # Check what agents ran
    agents = doc.get('agentResult', {}).get('agents', {})
    print("🤖 AGENTS EXECUTED:")
    for agent_name, result in agents.items():
        print(f"\n✅ {agent_name}:")
        if agent_name == 'documentIntelligence':
            print(f"   - Total Income: €{result.get('totalIncome', 0)}")
            print(f"   - Total Expenses: €{result.get('totalExpenses', 0)}")
            print(f"   - Categories: {list(result.get('byCategory', {}).keys())}")
        elif agent_name == 'emotionalPattern':
            print(f"   - Dominant Pattern: {result.get('dominantPattern', 'none')}")
            print(f"   - Emotional Scores: {result.get('emotionalSpendScores', {})}")
        elif agent_name == 'cbtIntervention':
            nudges = result.get('nudges', [])
            print(f"   - Nudges Count: {len(nudges)}")
            if nudges:
                print(f"   - Sample: {nudges[0][:60]}...")
        elif agent_name == 'digitalTwin':
            print(f"   - Financial Persona: {result.get('financialPersona', 'Unknown')}")
            print(f"   - HabitWealth Score: {result.get('habitWealthScore', 0)}")
        elif agent_name == 'goalOptimization':
            actions = result.get('actions', [])
            print(f"   - Actions: {len(actions)} recommendations")
        elif agent_name == 'utilityAnomalyDetector':
            alerts = result.get('allAlerts', [])
            print(f"   - Price Alerts: {len(alerts)}")
    
    # Check transaction categories
    print("\n💰 TRANSACTION BREAKDOWN:")
    by_cat = agents.get('documentIntelligence', {}).get('byCategory', {})
    for cat, amt in sorted(by_cat.items(), key=lambda x: -x[1])[:8]:
        pct = (amt / doc.get('agentResult', {}).get('agents', {}).get('documentIntelligence', {}).get('totalExpenses', 1)) * 100
        print(f"   {cat}: €{amt:.2f} ({pct:.1f}%)")
else:
    print("No document found")
