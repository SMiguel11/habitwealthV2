#!/usr/bin/env python3
"""
Debug script to test if mock-analyze is duplicating income transactions.
Simulates the parseTransactionsFromDI logic with the user's correct data.
"""
import json
import math

# Simulate December transactions from user's corrected data
december_transactions = [
    {"date": "2025-12-01", "merchant": "Nómina Empresa Tech S.L.", "category": "Ingresos", "amount": 2800.00},
    {"date": "2025-12-01", "merchant": "Freelance Web Dev", "category": "Ingresos", "amount": 409.51},
    {"date": "2025-12-01", "merchant": "Alquiler Piso", "category": "Hogar / Suministro", "amount": -750.00},
    # ... 40+ more expense transactions (omitted for brevity)
]

# Simulate January transactions
january_transactions = [
    {"date": "2026-01-02", "merchant": "Nómina Empresa Tech S.L.", "category": "Ingresos", "amount": 2800.00},
    {"date": "2026-01-02", "merchant": "Freelance Web Dev", "category": "Ingresos", "amount": 467.90},
    # ... more transactions
]

# Simulate February transactions  
february_transactions = [
    {"date": "2026-02-02", "merchant": "Nómina Empresa Tech S.L.", "category": "Ingresos", "amount": 2800.00},
    # ... more transactions
]

def calculate_totals(transactions):
    """Calculate totals like the enrichment agent does."""
    total_in = sum(t["amount"] for t in transactions if t["amount"] > 0)
    total_out = sum(abs(t["amount"]) for t in transactions if t["amount"] < 0)
    return {
        "totalIncome": round(total_in, 2),
        "totalExpenses": round(total_out, 2),
        "transactionCount": len(transactions)
    }

# Test: What should be the correct totals
print("=== EXPECTED TOTALS (from user's corrected data) ===")
print(f"December: €3,209.51 income, N expenses")
print(f"January: €3,267.90 income, N expenses")
print(f"February: €2,800.00 income, N expenses")
print(f"3-MONTH TOTAL INCOME: €9,277.41")
print()

# Test: Check if Document Intelligence mock is duplicating
print("=== HYPOTHESIS: Mock-analyze Fallback Duplicates Income ===")
print("If fallback section is extracting income that tables already found...")
print("and deduplication fails due to different merchant names...")
print()

# Simulate scenario where Each document has 1 nómina duplicated
scenarios = {
    "No duplicates (EXPECTED)": [
        {"name": "December", "txs": 45, "income": 3209.51},
        {"name": "January", "txs": 40, "income": 3267.90},
        {"name": "February", "txs": 35, "income": 2800.00},
    ],
    "Each month has 1 nómina duplicated": [
        {"name": "December", "txs": 46, "income": 6009.51},  # +€2,800
        {"name": "January", "txs": 41, "income": 6067.90},    # +€2,800
        {"name": "February", "txs": 36, "income": 5600.00},   # +€2,800
    ],
    "Only Februarypair has added nómina": [
        {"name": "December", "txs": 45, "income": 3209.51},
        {"name": "January", "txs": 40, "income": 3267.90},
        {"name": "February", "txs": 36, "income": 5600.00},   # +€2,800
    ],
}

for scenario_name, docs in scenarios.items():
    total_income_3mo = sum(d["income"] for d in docs)
    print(f"{scenario_name}:")
    for doc in docs:
        print(f"  {doc['name']}: €{doc['income']:,.2f} ({doc['txs']} tx)")
    print(f"  TOTAL: €{total_income_3mo:,.2f}")
    if math.isclose(total_income_3mo, 9277.41, rel_tol=1e-9):
        print("  ✓ CORRECT")
    elif math.isclose(total_income_3mo, 14877.41, rel_tol=1e-9):
        print("  ✗ MATCHES CURRENT BUG REPORT")
    else:
        print(f"  ? DIFFERENT")
    print()

print("\n=== ANALYSIS ===")
print("Current bug: €14,877.41 reported vs €9,277.41 expected")
print("Discrepancy: €5,600.00 = exactly 2 × €2,800.00")
print()
print("Most likely cause:")
print("  1. The mock-analyze fallback is duplicating nómina transactions")
print("  2. Deduplication via 'known' set is failing (merchant name mismatch)")
print("  3. OR: Multiple documents are being processed twice")
print()
