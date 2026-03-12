"""
query_cosmos.py — Diagnóstico rápido de Cosmos DB
Muestra todos los documentos de 'local-user' con sus transacciones y totales DI.

Uso:
  python query_cosmos.py            # resumen compacto
  python query_cosmos.py --full     # incluye lista completa de transacciones
  python query_cosmos.py --compare  # compara Cosmos vs totales reales del PDF
"""
import sys, json
from azure.cosmos import CosmosClient

# Totales reales según los PDFs (ground truth)
PDF_TRUTH = {
    "extracto_2025_12_Diciembre.pdf": {
        "income":   3209.51,
        "expenses": 2611.46,
        "net":      598.05,
        "notes": [
            "⚠  Transferencia Ahorro -179.46 → era contada como ingreso (fix: signo Savings)",
            "⚠  AliExpress -22.08 → estaba en página 2, no se extraía (fix: tabla continuación)",
        ],
    },
    "extracto_2026_01_Enero.pdf": {
        "income":   3267.90,
        "expenses": 1786.39,
        "net":      1481.51,
        "notes": ["✅ Enero es correcto — no tiene Ahorro/Inversión"],
    },
    "extracto_2026_02_Febrero.pdf": {
        "income":   2800.00,
        "expenses": 2126.78,
        "net":      673.22,
        "notes": [
            "⚠  MyInvestor ETF -61.25 → era contado como ingreso (fix: signo Savings)",
        ],
    },
}

ENDPOINT  = "https://hwbase-cosmos-00211.documents.azure.com:443/"
KEY       = "7kwCtts1x48CXdBaj4tUr2PFsaqG7yP7WYGysFDdrGzbfNWQC1EBOxfZ03RNOk3BSlKldkEMGtqYACDbCuASlw=="
DATABASE  = "habitwealth"
CONTAINER = "documents"
USER_ID   = "local-user"

client    = CosmosClient(ENDPOINT, credential=KEY)
container = client.get_database_client(DATABASE).get_container_client(CONTAINER)

query = "SELECT * FROM c WHERE c.userId = @uid ORDER BY c.analyzedAt ASC"
docs  = list(container.query_items(
    query=query,
    parameters=[{"name": "@uid", "value": USER_ID}],
    partition_key=USER_ID
))

FULL    = "--full"    in sys.argv
COMPARE = "--compare" in sys.argv

print(f"\n{'='*70}")
print(f"  Cosmos DB: {DATABASE}/{CONTAINER}  •  userId={USER_ID}")
print(f"  Documentos encontrados: {len(docs)}")
print(f"{'='*70}\n")

grand_income   = 0.0
grand_expenses = 0.0

for i, doc in enumerate(docs, 1):
    filename   = doc.get("filename", "?")
    analyzed   = doc.get("analyzedAt", "?")[:19]
    txs        = doc.get("transactions", [])
    di         = doc.get("agentResult", {}).get("agents", {}).get("documentIntelligence", {})

    income   = di.get("totalIncome",   sum(t["amount"] for t in txs if t["amount"] > 0))
    expenses = di.get("totalExpenses", sum(abs(t["amount"]) for t in txs if t["amount"] < 0))
    net      = di.get("netCashFlow",   income - expenses)
    grand_income   += income
    grand_expenses += expenses

    print(f"  [{i}] {filename}")
    print(f"       Analizado : {analyzed}")
    print(f"       Transacc. : {len(txs)}")
    print(f"       Ingresos  : €{income:>10.2f}")
    print(f"       Gastos    : €{expenses:>10.2f}")
    print(f"       Neto      : €{net:>+10.2f}")

    # Category breakdown
    by_cat = di.get("byCategory", {})
    if by_cat:
        print(f"       Por categoría:")
        for cat, amt in sorted(by_cat.items(), key=lambda x: -x[1]):
            print(f"         {cat:<18} €{amt:>8.2f}")

    if FULL and txs:
        print(f"\n       {'Fecha':<12} {'Categoría':<14} {'Importe':>10}  Descripción")
        print(f"       {'-'*65}")
        for t in sorted(txs, key=lambda x: x.get("date","")):
            amt = t["amount"]
            cat = t.get("category","")
            # Flag Savings with positive amount — these are the misclassified ones
            warn = " ← ⚠ SAVINGS POSITIVO (era incorrecto)" if cat == "Savings" and amt > 0 else ""
            flag = "↑ INGRESO" if amt > 0 else "         "
            print(f"       {t.get('date',''):<12} {cat:<16} {amt:>10.2f}  {flag}  {t.get('merchant','')[:35]}{warn}")

    if COMPARE:
        truth = PDF_TRUTH.get(filename)
        if truth:
            inc_diff = income   - truth["income"]
            exp_diff = expenses - truth["expenses"]
            print(f"       ── Comparación vs PDF real ──")
            print(f"       Ingresos : Cosmos €{income:.2f}  PDF €{truth['income']:.2f}  diff {inc_diff:+.2f}")
            print(f"       Gastos   : Cosmos €{expenses:.2f}  PDF €{truth['expenses']:.2f}  diff {exp_diff:+.2f}")
            for note in truth["notes"]:
                print(f"       {note}")
    print()

print(f"{'='*70}")
print(f"  TOTALES 3 MESES")
print(f"  Ingresos totales : €{grand_income:>10.2f}   (real PDF: €9,277.41)")
print(f"  Gastos totales   : €{grand_expenses:>10.2f}   (real PDF: €6,524.63)")
print(f"  Neto             : €{grand_income - grand_expenses:>+10.2f}   (real PDF: €+2,752.78)")
print()

inc_err = grand_income   - 9277.41
exp_err = grand_expenses - 6524.63
if abs(inc_err) > 0.10 or abs(exp_err) > 0.10:
    print(f"  ❌ DISCREPANCIA DETECTADA:")
    print(f"     Ingresos  {inc_err:+.2f} € de diferencia")
    print(f"     Gastos    {exp_err:+.2f} € de diferencia")
    print()
    print(f"  👉 Ejecuta:  python query_cosmos.py --full --compare")
    print(f"     para ver qué transacciones están mal en Cosmos.")
    print()
    print(f"  📌 Después de que GitHub Actions redespliegue el Azure Function,")
    print(f"     vuelve a subir los 3 PDFs en /get-started para obtener")
    print(f"     datos correctos (los fixes ya están en commits a4b8341 y aaa1bc5).")
else:
    print(f"  ✅ Totales correctos — datos coinciden con los PDFs")
print(f"{'='*70}\n")
