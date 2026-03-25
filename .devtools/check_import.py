import importlib.util
p = r'e:\Test_azure\habitwealthTest\enrichment-agent\main.py'
spec = importlib.util.spec_from_file_location('ea', p)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
print('import OK')
