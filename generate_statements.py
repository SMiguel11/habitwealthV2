"""
generate_statements.py
======================
Generates three realistic simulated bank statement PDFs (Dec 2025, Jan 2026, Feb 2026)
for use as HabitWealth demo input.

Run:
    python generate_statements.py

Output: sample-statements/  (3 PDF files)
"""

import os, random
from datetime import date, timedelta
from fpdf import FPDF

# ── Palette ───────────────────────────────────────────────────────────────────
BANK_NAME    = "NeoBank"
ACCOUNT_NAME = "Alex García"
IBAN         = "ES76 2038 5778 9830 0001 0174"
CURRENCY     = "EUR"

# ── Merchant catalogue ────────────────────────────────────────────────────────
MERCHANTS = {
    "Alimentación": [
        ("Mercadona",      15, 110),
        ("Carrefour",      20, 90),
        ("Lidl",           10, 55),
        ("Dia Supermercado", 8, 40),
        ("Consum",         12, 65),
        ("FreshCo Market", 18, 75),
    ],
    "Restaurantes": [
        ("McDonald's",     6,  22),
        ("Starbucks",      4,  9),
        ("Deliveroo",      12, 45),
        ("Just Eat",       10, 38),
        ("Lateral Café",   18, 55),
        ("Sushi Bar Kyoto", 22, 70),
    ],
    "Transporte": [
        ("Uber",           5,  25),
        ("Renfe Cercanías", 2, 15),
        ("Bolt",           4,  18),
        ("EMT Madrid",     1,  6),
        ("Cabify",         8,  30),
    ],
    "Entretenimiento": [
        ("Netflix",        13, 13),
        ("Spotify",        10, 10),
        ("Prime Video",    5,  5),
        ("Steam",          2,  60),
        ("Cinema Kinépolis", 8, 16),
        ("Twitch Bits",    5,  25),
    ],
    "Compras": [
        ("Amazon",         15, 120),
        ("Zara",           25, 90),
        ("IKEA",           30, 200),
        ("AliExpress",     5,  50),
        ("El Corte Inglés", 40, 180),
        ("MediaMarkt",     30, 250),
    ],
    "Salud": [
        ("Farmacia Central", 5, 40),
        ("Gym Basic-Fit",  25, 25),
        ("Clínica Dental", 50, 150),
        ("Opticalia",      80, 200),
    ],
    "Hogar / Suministros": [
        ("Endesa Luz",     65, 95),
        ("Canal Isabel II", 25, 45),
        ("Movistar Fibra", 45, 45),
        ("Alquiler Piso",  750, 750),  # fixed rent
        ("Comunidad Propietarios", 55, 55),
    ],
    "Ahorro / Inversión": [
        ("Transferencia Ahorro", 100, 400),
        ("MyInvestor ETF",      50,  200),
    ],
}

INCOME_SOURCES = [
    ("Nómina Empresa Tech S.L.",  2800),
    ("Freelance Web Dev",          450),
]

COLORS = {
    "header_bg":   (20,  60, 120),
    "header_txt":  (255, 255, 255),
    "row_odd":     (245, 248, 255),
    "row_even":    (255, 255, 255),
    "positive":    (22,  130, 60),
    "negative":    (190, 30,  30),
    "border":      (200, 210, 230),
    "section":     (55,  100, 180),
    "light_gray":  (120, 130, 145),
    "black":       (20,  20,  20),
}


# ── Transaction generator ─────────────────────────────────────────────────────
def generate_month_transactions(year: int, month: int, seed: int) -> list[dict]:
    random.seed(seed)
    txs = []
    # Determine days in month
    if month == 12:
        next_m, next_y = 1, year + 1
    else:
        next_m, next_y = month + 1, year
    first = date(year, month, 1)
    last  = date(next_y, next_m, 1) - timedelta(days=1)
    n_days = last.day

    # Fixed income (salary on day 1 or 2)
    salary_day = random.randint(1, 2)
    for name, amount in INCOME_SOURCES:
        if "Nómina" in name or random.random() < 0.55:
            txs.append({
                "date":     date(year, month, salary_day),
                "desc":     name,
                "category": "Ingresos",
                "amount":   amount if "Nómina" in name else round(random.uniform(amount * 0.8, amount * 1.2), 2),
                "balance":  0,
            })

    # Fixed bills (rent, utilities)
    for cat, items in MERCHANTS.items():
        if cat == "Hogar / Suministros":
            for name, lo, hi in items:
                bill_day = random.randint(1, 5) if "Alquiler" in name else random.randint(5, 20)
                amount   = round(random.uniform(lo, hi), 2)
                txs.append({
                    "date":     date(year, month, min(bill_day, n_days)),
                    "desc":     name,
                    "category": cat,
                    "amount":   -amount,
                    "balance":  0,
                })

    # Variable spending
    for cat, items in MERCHANTS.items():
        if cat in ("Hogar / Suministros", "Ahorro / Inversión", "Ingresos"):
            continue
        n_purchases = random.randint(2, 6)
        for _ in range(n_purchases):
            name, lo, hi = random.choice(items)
            amount = round(random.uniform(lo, hi), 2)
            day    = random.randint(1, n_days)
            txs.append({
                "date":     date(year, month, day),
                "desc":     name,
                "category": cat,
                "amount":   -amount,
                "balance":  0,
            })

    # Savings transfer (end of month)
    for name, lo, hi in MERCHANTS["Ahorro / Inversión"]:
        if random.random() < 0.7:
            amount = round(random.uniform(lo, hi), 2)
            txs.append({
                "date":     date(year, month, random.randint(25, n_days)),
                "desc":     name,
                "category": "Ahorro / Inversión",
                "amount":   -amount,
                "balance":  0,
            })

    # Sort by date, compute running balance
    txs.sort(key=lambda x: x["date"])
    balance = round(random.uniform(1800, 2600), 2)  # opening balance
    opening = balance
    for t in txs:
        balance = round(balance + t["amount"], 2)
        t["balance"] = balance
    return txs, opening, balance


# ── PDF builder ───────────────────────────────────────────────────────────────
MONTH_NAMES_ES = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
    5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
    9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
}

class StatementPDF(FPDF):
    def __init__(self, bank: str, month_name: str, year: int):
        super().__init__()
        self.bank_name  = bank
        self.month_name = month_name
        self.year       = year
        self.set_auto_page_break(auto=True, margin=18)

    def header(self):
        c = COLORS
        # Blue header bar
        self.set_fill_color(*c["header_bg"])
        self.rect(0, 0, 210, 28, "F")
        # Bank name
        self.set_font("Helvetica", "B", 18)
        self.set_text_color(*c["header_txt"])
        self.set_xy(10, 6)
        self.cell(80, 10, self.bank_name)
        # Statement label right
        self.set_font("Helvetica", "", 10)
        self.set_xy(100, 5)
        self.cell(100, 6, f"Extracto Bancario - {self.month_name} {self.year}", align="R", new_x="LMARGIN", new_y="NEXT")
        self.set_xy(100, 11)
        self.set_text_color(200, 220, 255)
        self.cell(100, 5, f"Generado el {date.today().strftime('%d/%m/%Y')}", align="R")
        self.set_text_color(*c["black"])
        self.ln(10)

    def footer(self):
        self.set_y(-14)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(*COLORS["light_gray"])
        self.cell(0, 6, f"NeoBank S.A. - CNMV Reg. 0429 - Documento generado automaticamente | Pag. {self.page_no()}", align="C")

    def account_info(self, opening: float, closing: float):
        c = COLORS
        self.set_fill_color(240, 244, 252)
        self.set_draw_color(*c["border"])
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*c["section"])
        self.cell(0, 7, "Informacion de Cuenta", new_x="LMARGIN", new_y="NEXT")
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*c["black"])

        rows = [
            ("Titular:",          ACCOUNT_NAME),
            ("IBAN:",             IBAN),
            ("Periodo:",          f"01/{self.month_name[:3]}/{self.year} - ultimo dia del mes"),
            ("Saldo inicial:",    f"{opening:,.2f} {CURRENCY}"),
            ("Saldo final:",      f"{closing:,.2f} {CURRENCY}"),
        ]
        for label, value in rows:
            self.set_font("Helvetica", "B", 9)
            self.cell(45, 6, label)
            self.set_font("Helvetica", "", 9)
            self.cell(0, 6, value, new_x="LMARGIN", new_y="NEXT")
        self.ln(4)

    def transactions_table(self, txs: list[dict]):
        c = COLORS
        # Header row
        self.set_fill_color(*c["header_bg"])
        self.set_text_color(*c["header_txt"])
        self.set_font("Helvetica", "B", 9)
        col_w = [22, 85, 38, 28, 27]  # Date, Description, Category, Amount, Balance
        headers = ["Fecha", "Descripción", "Categoría", "Importe", "Saldo"]
        for w, h in zip(col_w, headers):
            self.cell(w, 7, h, border=0, align="C", fill=True)
        self.ln()

        self.set_draw_color(*c["border"])
        self.set_font("Helvetica", "", 8.5)

        for i, t in enumerate(txs):
            fill_color = c["row_odd"] if i % 2 == 0 else c["row_even"]
            self.set_fill_color(*fill_color)
            self.set_text_color(*c["black"])

            amount  = t["amount"]
            balance = t["balance"]
            amt_str = f"{amount:+,.2f}"
            bal_str = f"{balance:,.2f}"

            y0 = self.get_y()

            # Date
            self.cell(col_w[0], 6, t["date"].strftime("%d/%m/%Y"), border="B", fill=True, align="C")
            # Description
            self.cell(col_w[1], 6, t["desc"][:42], border="B", fill=True)
            # Category
            self.set_text_color(*c["light_gray"])
            self.cell(col_w[2], 6, t["category"][:18], border="B", fill=True, align="C")
            # Amount (colored)
            self.set_text_color(*c["positive"] if amount >= 0 else c["negative"])
            self.cell(col_w[3], 6, amt_str, border="B", fill=True, align="R")
            # Balance
            self.set_text_color(*c["black"])
            self.cell(col_w[4], 6, bal_str, border="B", fill=True, align="R")
            self.ln()

    def summary_box(self, txs: list[dict]):
        c = COLORS
        self.ln(4)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*c["section"])
        self.cell(0, 7, "Resumen por Categoria", new_x="LMARGIN", new_y="NEXT")

        by_cat: dict[str, float] = {}
        income = 0.0
        for t in txs:
            if t["amount"] > 0:
                income += t["amount"]
            else:
                by_cat[t["category"]] = by_cat.get(t["category"], 0) + abs(t["amount"])

        self.set_fill_color(240, 244, 252)
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(*c["header_bg"])
        self.cell(90, 6, "Categoría", border="B", fill=True)
        self.cell(40, 6, "Total Gastos", border="B", fill=True, align="R")
        self.ln()

        total_expenses = 0.0
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*c["black"])
        for cat, total in sorted(by_cat.items(), key=lambda x: -x[1]):
            self.set_fill_color(250, 252, 255)
            self.cell(90, 5.5, cat, border="B", fill=True)
            self.set_text_color(*c["negative"])
            self.cell(40, 5.5, f"-{total:,.2f} {CURRENCY}", border="B", fill=True, align="R")
            self.set_text_color(*c["black"])
            self.ln()
            total_expenses += total

        self.ln(2)
        self.set_font("Helvetica", "B", 9)
        self.set_fill_color(220, 230, 250)
        self.cell(90, 6, "Total Ingresos", fill=True)
        self.set_text_color(*c["positive"])
        self.cell(40, 6, f"+{income:,.2f} {CURRENCY}", fill=True, align="R")
        self.ln()
        self.set_text_color(*c["black"])
        self.cell(90, 6, "Total Gastos", fill=True)
        self.set_text_color(*c["negative"])
        self.cell(40, 6, f"-{total_expenses:,.2f} {CURRENCY}", fill=True, align="R")
        self.ln()
        net = income - total_expenses
        self.set_text_color(*c["positive"] if net >= 0 else c["negative"])
        self.cell(90, 6, "Flujo Neto", fill=True)
        self.cell(40, 6, f"{net:+,.2f} {CURRENCY}", fill=True, align="R")
        self.set_text_color(*c["black"])


def build_statement(year: int, month: int, seed: int, out_dir: str):
    txs, opening, closing = generate_month_transactions(year, month, seed)
    month_name = MONTH_NAMES_ES[month]
    filename   = f"{out_dir}/extracto_{year}_{month:02d}_{month_name}.pdf"

    pdf = StatementPDF(BANK_NAME, month_name, year)
    pdf.add_page()
    pdf.account_info(opening, closing)
    pdf.transactions_table(txs)
    pdf.add_page()
    pdf.summary_box(txs)
    pdf.output(filename)
    total_exp = sum(abs(t["amount"]) for t in txs if t["amount"] < 0)
    total_inc = sum(t["amount"] for t in txs if t["amount"] > 0)
    print(f"  ✓ {filename}  ({len(txs)} txns | ingresos +{total_inc:,.2f} | gastos -{total_exp:,.2f})")
    return filename


if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "sample-statements")
    os.makedirs(out_dir, exist_ok=True)

    print("\n🏦  HabitWealth — Generador de Extractos Bancarios Demo\n")

    months = [
        (2025, 12, 42),   # Diciembre 2025
        (2026,  1, 99),   # Enero 2026
        (2026,  2, 17),   # Febrero 2026
    ]
    files = []
    for year, month, seed in months:
        files.append(build_statement(year, month, seed, out_dir))

    print(f"\n✅  3 extractos generados en  → {out_dir}\n")
    print("📎  Úsalos en la app:")
    print("    1. Inicia todos los servicios locales (Azurite, Functions, Enrichment Agent)")
    print("    2. Ve a http://localhost:3000/get-started")
    print("    3. Sube los 3 PDFs → el pipeline analiza cada uno\n")
