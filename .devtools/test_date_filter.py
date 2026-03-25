import importlib.util
import os

p = os.path.join(os.path.dirname(__file__), '..', 'enrichment-agent', 'main.py')
p = os.path.normpath(p)
spec = importlib.util.spec_from_file_location('ea_main', p)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
_filter = mod._filter_transactions_by_date

sample_txs = [
    {"date": "2025-11-30", "amount": -100.0, "merchant": "A"},
    {"date": "2025-12-01", "amount": 200.0, "merchant": "Salary"},
    {"date": "2025-12-15", "amount": -50.0, "merchant": "Shop"},
    {"date": "2026-01-10", "amount": 150.0, "merchant": "Freelance"},
    {"date": "2026-02-28", "amount": -75.0, "merchant": "Grocery"},
    {"date": "2026-03-01", "amount": -20.0, "merchant": "Coffee"},
    {"date": "invalid-date", "amount": -5.0, "merchant": "Mystery"},
    {"amount": -12.0, "merchant": "NoDate"},
]

print('Running date filter tests...')

# Filter for Dec 1, 2025 -> Feb 28, 2026 (inclusive)
filtered = _filter(sample_txs, '2025-12-01', '2026-02-28')
print('Kept count:', len(filtered))
for t in filtered:
    print(' ', t)

# Expectations: keep transactions on 2025-12-01, 2025-12-15, 2026-01-10, 2026-02-28
expected_dates = {'2025-12-01', '2025-12-15', '2026-01-10', '2026-02-28'}
kept_dates = set([t.get('date') for t in filtered if t.get('date')])

if expected_dates.issubset(kept_dates):
    print('\n✅ Date range filter PASS')
else:
    print('\n❌ Date range filter FAIL')
    print('Expected subset:', expected_dates)
    print('Got:', kept_dates)
