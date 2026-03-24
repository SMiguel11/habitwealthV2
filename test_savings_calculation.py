#!/usr/bin/env python3
"""
Test script to verify _get_monthly_savings calculation
"""

def _get_monthly_savings(doc: dict) -> float:
    """Replicate the fixed function"""
    by_category = doc.get("byCategory", {}) or {}
    for key, value in by_category.items():
        normalized = str(key).strip().lower()
        if normalized in {"savings", "saving", "ahorros", "ahorro"} or "saving" in normalized or "ahorr" in normalized or "invers" in normalized:
            return round(abs(float(value or 0)), 2)
    # If no explicit savings category, calculate as: Income - Expenses
    total_in = float(doc.get("totalIncome") or 0)
    total_out = float(doc.get("totalExpenses") or 0)
    available_savings = max(0, total_in - total_out)
    return round(available_savings, 2)


# Test case: January PDF
test_doc = {
    "totalIncome": 3267.90,
    "totalExpenses": 1786.39,
    "byCategory": {
        "Food": -150.0,
        "Transport": -200.0,
        "Health": -100.0,
        "Shopping": -500.0,
        "Utilities": -836.39,
        "Entertainment": -0.0,
    }
}

result = _get_monthly_savings(test_doc)
expected = 3267.90 - 1786.39

print(f"Test: _get_monthly_savings()")
print(f"Income:        €{test_doc['totalIncome']}")
print(f"Expenses:      €{test_doc['totalExpenses']}")
print(f"Expected:      €{expected:.2f}")
print(f"Got:           €{result:.2f}")
print(f"✅ PASS" if abs(result - expected) < 0.01 else f"❌ FAIL")
