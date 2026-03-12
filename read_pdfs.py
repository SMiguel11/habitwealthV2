import fitz

files = [
    'sample-statements/extracto_2025_12_Diciembre.pdf',
    'sample-statements/extracto_2026_01_Enero.pdf',
    'sample-statements/extracto_2026_02_Febrero.pdf',
]

for path in files:
    name = path.split('/')[-1]
    print(f'\n{"="*60}')
    print(f'  {name}')
    print(f'{"="*60}')
    doc = fitz.open(path)
    for pno, page in enumerate(doc):
        text = page.get_text()
        print(f'\n--- PAGE {pno+1} ---')
        print(text)
    doc.close()
