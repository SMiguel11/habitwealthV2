#!/usr/bin/env python3
"""
Test script for /enrich endpoint with utility anomaly detection.
Tests that new utility alert fields are present in the API response.
"""

import requests
import json
from datetime import datetime, timedelta

# Backend URL - updated to production Container App
BACKEND_URL = "https://hwbase-agent-00211.graymeadow-30edd248.westeurope.azurecontainerapps.io"
ENRICH_ENDPOINT = f"{BACKEND_URL}/enrich"

def create_test_payload():
    """Create test payload with utility transactions to trigger anomaly detection."""
    
    # Generate dates for last 3 months
    today = datetime.now()
    month_3_ago = today - timedelta(days=90)
    month_2_ago = today - timedelta(days=60)
    month_1_ago = today - timedelta(days=30)
    
    transactions = [
        # Rent - stable
        {"date": month_3_ago.strftime("%Y-%m-%d"), "merchant": "Landlord Payments", "category": "Alquiler", "amount": -950.00},
        {"date": month_2_ago.strftime("%Y-%m-%d"), "merchant": "Landlord Payments", "category": "Alquiler", "amount": -950.00},
        {"date": month_1_ago.strftime("%Y-%m-%d"), "merchant": "Landlord Payments", "category": "Alquiler", "amount": -950.00},
        
        # Electricity - with PRICE INCREASE (will trigger alert)
        {"date": month_3_ago.strftime("%Y-%m-%d"), "merchant": "Endesa Electricity", "category": "Electricidad", "amount": -85.00},
        {"date": month_2_ago.strftime("%Y-%m-%d"), "merchant": "Endesa Electricity", "category": "Electricidad", "amount": -92.50},
        {"date": month_1_ago.strftime("%Y-%m-%d"), "merchant": "Endesa Electricity", "category": "Electricidad", "amount": -105.00},
        
        # Water - stable
        {"date": month_3_ago.strftime("%Y-%m-%d"), "merchant": "Water Company", "category": "Agua", "amount": -45.00},
        {"date": month_2_ago.strftime("%Y-%m-%d"), "merchant": "Water Company", "category": "Agua", "amount": -45.00},
        {"date": month_1_ago.strftime("%Y-%m-%d"), "merchant": "Water Company", "category": "Agua", "amount": -45.00},
        
        # Internet - duplicate detection (2x in same month)
        {"date": month_1_ago.strftime("%Y-%m-%d"), "merchant": "Vodafone Internet", "category": "Internet", "amount": -55.00},
        {"date": (month_1_ago + timedelta(days=3)).strftime("%Y-%m-%d"), "merchant": "Vodafone Internet", "category": "Internet", "amount": -55.00},
        
        # Regular expenses (non-utility)
        {"date": month_1_ago.strftime("%Y-%m-%d"), "merchant": "Amazon", "category": "Shopping", "amount": -25.50},
        {"date": month_1_ago.strftime("%Y-%m-%d"), "merchant": "Groceries Store", "category": "Food", "amount": -75.00},
        
        # Income
        {"date": month_1_ago.strftime("%Y-%m-%d"), "merchant": "Employer Salary", "category": "Income", "amount": 2500.00},
    ]
    
    payload = {
        "userId": "test-user-001",
        "filename": "test_statement.pdf",
        "transactions": transactions,
        "goals": [
            {
                "description": "Save for emergency fund",
                "targetAmount": 5000.00,
                "deadlineMonths": 12,
                "savedAmount": 1500.00
            }
        ],
        "surveyAnswers": [3, 2, 4, 2, 3]  # FSI stress scores
    }
    
    return payload


def test_enrich_endpoint():
    """Test the /enrich endpoint and validate response structure."""
    
    print("=" * 70)
    print("Testing HabitWealth Enrichment Agent API")
    print("=" * 70)
    print(f"\n📍 Backend URL: {BACKEND_URL}")
    print(f"📍 Endpoint: POST {ENRICH_ENDPOINT}\n")
    
    # Step 1: Check health endpoint
    print("1️⃣  Checking /health endpoint...")
    try:
        health_resp = requests.get(f"{BACKEND_URL}/health", timeout=10)
        health_resp.raise_for_status()
        health_data = health_resp.json()
        print(f"   ✅ Service is healthy: {health_data}")
        print(f"   📊 Number of agents: {health_data.get('agents', '?')}\n")
    except Exception as e:
        print(f"   ❌ Health check failed: {e}\n")
        return False
    
    # Step 2: Create test payload
    print("2️⃣  Creating test payload with utility transactions...")
    payload = create_test_payload()
    print(f"   📦 Transactions: {len(payload['transactions'])}")
    print(f"   👤 User ID: {payload['userId']}")
    print(f"   🎯 Goals: {len(payload['goals'])}")
    print(f"   🔍 Survey responses: {len(payload['surveyAnswers'])}\n")
    
    # Step 3: Call /enrich endpoint
    print("3️⃣  Calling /enrich endpoint...")
    try:
        response = requests.post(
            ENRICH_ENDPOINT,
            json=payload,
            timeout=30,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        result = response.json()
        print(f"   ✅ Response received (HTTP {response.status_code})\n")
    except Exception as e:
        print(f"   ❌ Request failed: {e}\n")
        return False
    
    # Step 4: Validate response structure
    print("4️⃣  Validating response structure...")
    
    # Check top-level fields
    required_fields = ["userId", "filename", "processedAt", "agents", "summary"]
    for field in required_fields:
        if field in result:
            print(f"   ✅ {field}: present")
        else:
            print(f"   ❌ {field}: MISSING")
            return False
    
    print()
    
    # Step 5: Check agents object
    print("5️⃣  Checking agents object...")
    agents = result.get("agents", {})
    expected_agents = [
        "documentIntelligence",
        "emotionalPattern",
        "financialStress",
        "goalAlignment",
        "goalOptimization",
        "utilityAnomalyDetector",  # NEW
        "cbtIntervention",
        "digitalTwin"
    ]
    
    for agent_name in expected_agents:
        if agent_name in agents:
            print(f"   ✅ {agent_name}")
        else:
            print(f"   ❌ {agent_name}: MISSING")
            return False
    
    print()
    
    # Step 6: Validate utilityAnomalyDetector output
    print("6️⃣  Validating utilityAnomalyDetector output...")
    utility_agent = agents.get("utilityAnomalyDetector", {})
    
    utility_fields = ["agent", "hasAlerts", "criticalAlerts", "warningAlerts", "allAlerts", "summaryMessage", "totalAlertsFound"]
    for field in utility_fields:
        if field in utility_agent:
            print(f"   ✅ {field}")
        else:
            print(f"   ❌ {field}: MISSING")
            return False
    
    print(f"\n   📊 Alerts found: {utility_agent.get('totalAlertsFound', 0)}")
    print(f"   🚨 Critical: {len(utility_agent.get('criticalAlerts', []))}")
    print(f"   ⚠️  Warning: {len(utility_agent.get('warningAlerts', []))}")
    
    if utility_agent.get('allAlerts'):
        print(f"\n   Alert details:")
        for i, alert in enumerate(utility_agent.get('allAlerts', []), 1):
            print(f"     {i}. [{alert.get('severity', '?').upper()}] {alert.get('message', '?')}")
    
    print()
    
    # Step 7: Validate summary section
    print("7️⃣  Validating summary fields...")
    summary = result.get("summary", {})
    
    summary_fields = ["habitWealthScore", "financialPersona", "fsiLevel", "topNudge", "goalAlignmentScore", "utilityAlert", "hasUtilityAlerts"]
    all_present = True
    for field in summary_fields:
        if field in summary:
            value = summary[field]
            if isinstance(value, str) and len(value) > 50:
                print(f"   ✅ {field}: '{value[:50]}...'")
            else:
                print(f"   ✅ {field}: {value}")
        else:
            print(f"   ❌ {field}: MISSING")
            all_present = False
    
    print()
    
    # Step 8: Display key metrics
    print("8️⃣  Key metrics:")
    print(f"   Score: {summary.get('habitWealthScore', '?')}/100")
    print(f"   Persona: {summary.get('financialPersona', '?')}")
    print(f"   FSI Level: {summary.get('fsiLevel', '?')}")
    print(f"   Utility Alerts: {summary.get('hasUtilityAlerts', False)}")
    if summary.get('utilityAlert'):
        print(f"   Alert Message: {summary.get('utilityAlert')}")
    
    print()
    print("=" * 70)
    print("✅ ALL TESTS PASSED - API is working correctly!")
    print("=" * 70)
    
    # Save full response for debugging
    with open("test_response.json", "w") as f:
        json.dump(result, f, indent=2)
    print("\n💾 Full response saved to test_response.json")
    
    return True


if __name__ == "__main__":
    success = test_enrich_endpoint()
    exit(0 if success else 1)
