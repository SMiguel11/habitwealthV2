#!/usr/bin/env python3
"""
Call insights API and immediately fetch Function App logs to see what happened
"""
import subprocess
import json
import time
import requests
from datetime import datetime

def call_api():
    """Makes API call to insights endpoint"""
    url = "https://hwbase-fn-sas-00211.azurewebsites.net/api/insights-api?userId=local-user&lang=es"
    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Calling insights API...")
    try:
        response = requests.get(url, timeout=15)
        print(f"[✓] API Status: {response.status_code}")
        data = response.json()
        print(f"[✓] Habit Score: {data.get('summary', {}).get('habitWealthScore', 'N/A')}")
        opt = data.get('summary', {}).get('optimization', {})
        if opt:
            print(f"[✓] Optimization Source: {opt.get('source', 'N/A')}")
            actions = opt.get('actions', [])
            if actions:
                print(f"[✓] Actions: {len(actions)} found")
                print(f"    First: {actions[0].get('title', 'N/A')}")
        return True
    except Exception as e:
        print(f"[✗] API Error: {str(e)}")
        return False

def get_logs():
    """Get recent Function App logs"""
    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Checking Function logs...")
    try:
        result = subprocess.run(
            ["az", "functionapp", "log", "download", 
             "--name", "hwbase-fn-sas-00211",
             "--resource-group", "habitwealthtest-rg",
             "--output-file", "logs.zip"],
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0:
            print("[✓] Logs downloaded to logs.zip")
            print("\nTo view logs, run:")
            print("  unzip -p logs.zip | grep -i 'openai\\|error\\|optimization'")
        else:
            print(f"[✗] Log download failed: {result.stderr[:200]}")
    except Exception as e:
        print(f"[✗] Error getting logs: {str(e)}")

if __name__ == "__main__":
    print("=" * 60)
    print("HabitWealth - Insights API Test with Logging")
    print("=" * 60)
    
    call_api()
    time.sleep(2)
    get_logs()
    
    print("\n" + "=" * 60)
