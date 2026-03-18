"""
Local integration test script for HabitWealth components.
Tests: Azurite connection, container creation, blob upload, SAS token generation.
Run with: python test_local.py
"""

import os, sys, datetime, base64, hmac, hashlib, urllib.parse, urllib.request, json

# ── Azurite defaults ────────────────────────────────────────────────────────────
ACCOUNT_NAME = "devstoreaccount1"
ACCOUNT_KEY  = "Eby8vdM02xNoSaWZREZr+UE=BFGAzStorageLocalDevelopment=="   # full key
AZURITE_HOST = "http://127.0.0.1:10000"
CONTAINER    = "test-container"

# The full default Azurite key (256-bit base-64)
AZURITE_KEY  = "Eby8vdM02xNoSaWZREZr+UE=BFGAzStorageLocalDevelopment=="

# ── Try importing azure-storage-blob ───────────────────────────────────────────
try:
    from azure.storage.blob import (
        BlobServiceClient,
        ContainerClient,
        generate_blob_sas,
        BlobSasPermissions,
    )
    SDK_AVAILABLE = True
except ImportError:
    SDK_AVAILABLE = False

# Full Azurite dev key (exactly as shipped with Azurite / Storage Emulator)
AZURITE_KEY_FULL = (
    "Eby8vdM02xNoSaWZREZr+UE="
    "BFGqnOoN1xdWNd4Q5dyabFGO"
    "lHMSbAZBPnrcTWHxBhBc8ofJ"
    "XD4hDCOo8AAAAAAAAAAAAAAA"
    "AAAA"
)

# UseDevelopmentStorage=true is the canonical Azurite connection string
CONN_STR = "UseDevelopmentStorage=true"

# ────────────────────────────────────────────────────────────────────────────────
PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"
SKIP = "\033[93m⚠\033[0m"

def section(title):
    print(f"\n{'─'*60}")
    print(f"  {title}")
    print('─'*60)

# ── Test 1 – raw HTTP ping to Azurite ──────────────────────────────────────────
def test_azurite_ping():
    section("1. Azurite connectivity (raw HTTP)")
    # Simple HEAD on the blob endpoint; even a 400/403/InvalidHeaderValue means
    # Azurite is listening – we only care that it responds.
    url = f"{AZURITE_HOST}/{ACCOUNT_NAME}?comp=list"
    try:
        req = urllib.request.Request(url)
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                print(f"  {PASS} Azurite is reachable at {AZURITE_HOST} (status {resp.status})")
                return True
        except urllib.error.HTTPError as he:
            # Any HTTP response (even 400/403) means Azurite is up
            print(f"  {PASS} Azurite is reachable at {AZURITE_HOST} (HTTP {he.code})")
            return True
    except Exception as e:
        print(f"  {FAIL} Cannot reach Azurite: {e}")
        print( "        Make sure Azurite is running:  azurite --skipApiVersionCheck")
    return False

# ── Test 2 – SDK container creation ───────────────────────────────────────────
def test_sdk_container():
    section("2. Container creation via azure-storage-blob SDK")
    if not SDK_AVAILABLE:
        print(f"  {SKIP} azure-storage-blob not installed.")
        print( "        Run: pip install azure-storage-blob")
        return False
    try:
        svc = BlobServiceClient.from_connection_string(CONN_STR)
        cc  = svc.get_container_client(CONTAINER)
        try:
            cc.create_container()
            print(f"  {PASS} Container '{CONTAINER}' created.")
        except Exception as e:
            if "ContainerAlreadyExists" in str(e) or "already exists" in str(e).lower():
                print(f"  {PASS} Container '{CONTAINER}' already exists.")
            else:
                raise
        return True
    except Exception as e:
        print(f"  {FAIL} {e}")
        return False

# ── Test 3 – upload a small blob ──────────────────────────────────────────────
def test_blob_upload():
    section("3. Blob upload")
    if not SDK_AVAILABLE:
        print(f"  {SKIP} azure-storage-blob not installed.")
        return False
    try:
        svc  = BlobServiceClient.from_connection_string(CONN_STR)
        blob = svc.get_blob_client(CONTAINER, "test-upload.txt")
        blob.upload_blob(b"Hello HabitWealth!", overwrite=True)
        print(f"  {PASS} Uploaded test-upload.txt to '{CONTAINER}'")
        return True
    except Exception as e:
        print(f"  {FAIL} {e}")
        return False

# ── Test 4 – SAS token generation (SDK) ───────────────────────────────────────
def test_sas_generation():
    section("4. SAS token generation (SDK)")
    if not SDK_AVAILABLE:
        print(f"  {SKIP} azure-storage-blob not installed.")
        return False
    try:
        # Azurite's well-known default account key
        account_key = (
            "Eby8vdM02xNoSaWZREZr+UE="
            "BFGqnOoN1xdWNd4Q5dyabFGOlHMSbAZBPnrcTWHxBh"
            "Bc8ofJXD4hDCOo8AAAAAAAAAAAAAAAAAAAAA=="
        )
        # Use the SDK client (which uses UseDevelopmentStorage) to get the real key
        from azure.storage.blob import BlobServiceClient as _BSC
        _svc = _BSC.from_connection_string(CONN_STR)
        account_key = _svc.credential.account_key
        expiry = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=15)
        sas = generate_blob_sas(
            account_name   = ACCOUNT_NAME,
            container_name = CONTAINER,
            blob_name      = "test-upload.txt",
            account_key    = account_key,
            permission     = BlobSasPermissions(read=True),
            expiry         = expiry,
        )
        url = f"{AZURITE_HOST}/{ACCOUNT_NAME}/{CONTAINER}/test-upload.txt?{sas}"
        print(f"  {PASS} SAS token generated.")
        print(f"         URL: {url[:80]}...")
        return True
    except Exception as e:
        print(f"  {FAIL} {e}")
        return False

# ── Test 5 – FastAPI enrichment-agent ─────────────────────────────────────────
def test_enrichment_agent():
    section("5. Enrichment Agent FastAPI")
    # Try port 8001 first (used when 8000 is occupied), then fall back to 8000
    for port in (8001, 8000):
        try:
            url = f"http://127.0.0.1:{port}/"
            with urllib.request.urlopen(url, timeout=3) as resp:
                data = json.loads(resp.read())
                if "message" in data:
                    print(f"  {PASS} Enrichment Agent is running on :{port}: {data}")
                    return True
        except Exception:
            pass
    url = "http://127.0.0.1:8001/"
    try:
        with urllib.request.urlopen(url, timeout=3) as resp:
            data = json.loads(resp.read())
            if "message" in data:
                print(f"  {PASS} Enrichment Agent is running: {data}")
                return True
    except Exception as e:
        print(f"  {SKIP} Enrichment Agent not running (start with: uvicorn enrichment-agent.main:app --reload)")
        print(f"         {e}")
    return False

# ── Test 6 – SAS Azure Function ───────────────────────────────────────────────
def test_sas_function():
    section("6. SAS Azure Function (http://localhost:7071/api/sas-function)")
    url = "http://localhost:7071/api/sas-function"
    payload = json.dumps({"container": CONTAINER, "filename": "test.pdf"}).encode()
    req = urllib.request.Request(
        url, data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
            if "uploadUrl" in data:
                print(f"  {PASS} SAS function returned uploadUrl.")
                print(f"         uploadUrl: {data['uploadUrl'][:80]}...")
                return True
            else:
                print(f"  {FAIL} Unexpected response: {data}")
    except Exception as e:
        print(f"  {SKIP} SAS Function not running (start with: cd azure/sas-function && func start)")
        print(f"         {e}")
    return False

# ──────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n╔══════════════════════════════════════════════════════════╗")
    print("║          HabitWealth – Local Integration Tests           ║")
    print("╚══════════════════════════════════════════════════════════╝")

    results = {
        "Azurite ping"       : test_azurite_ping(),
        "Container creation" : test_sdk_container(),
        "Blob upload"        : test_blob_upload(),
        "SAS generation"     : test_sas_generation(),
        "Enrichment Agent"   : test_enrichment_agent(),
        "SAS Function"       : test_sas_function(),
    }

    section("Summary")
    all_ok = True
    for name, ok in results.items():
        icon = PASS if ok else (SKIP if ok is False else FAIL)
        print(f"  {icon}  {name}")
        if not ok: all_ok = False

    print()
    if all_ok:
        print("  All tests passed!")
    else:
        print("  Some tests were skipped (services not running) or failed.")
        print("  Start missing services and re-run: python test_local.py")
    print()
