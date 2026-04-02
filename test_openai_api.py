#!/usr/bin/env python3
"""Test Azure OpenAI API connectivity"""
import http.client
import json
import os

endpoint = "swedencentral.api.cognitive.microsoft.com"
api_key = "0f31bda9ef9d4ada866a4b1bb3ec65f4"
deployment = "gpt-4o-mini"

url = f"/openai/deployments/{deployment}/chat/completions?api-version=2024-02-01"

payload = {
    "messages": [
        {"role": "user", "content": "Say hello in single word"}
    ],
    "temperature": 0.6,
    "max_tokens": 10
}

headers = {
    "Content-Type": "application/json",
    "api-key": api_key
}

print(f"Testing Azure OpenAI endpoint...")
print(f"Endpoint: {endpoint}")
print(f"Deployment: {deployment}")
print(f"API Key: {api_key[:10]}...{api_key[-4:]}")
print()

try:
    conn = http.client.HTTPSConnection(endpoint, timeout=10)
    conn.request("POST", url, json.dumps(payload), headers)
    response = conn.getresponse()
    
    print(f"✓ Status Code: {response.status}")
    data = response.read().decode()
    print(f"Response body (first 1000 chars):")
    print(data[:1000])
    
    if response.status == 200:
        response_json = json.loads(data)
        if "choices" in response_json and len(response_json["choices"]) > 0:
            message = response_json["choices"][0].get("message", {}).get("content", "")
            print(f"\n✓✓✓ SUCCESS! OpenAI response:")
            print(f"    {message}")
        else:
            print(f"\n✗ Response structure unexpected: {list(response_json.keys())}")
    
except Exception as e:
    print(f"✗ ERROR: {type(e).__name__}: {str(e)}")
finally:
    try:
        conn.close()
    except:
        pass
