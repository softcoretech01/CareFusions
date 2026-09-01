import urllib.request
from urllib.error import HTTPError

endpoints = [
    'http://localhost:8000/api/v1/inventory/items',
    'http://localhost:8000/api/v1/inventory/stock',
    'http://localhost:8000/api/v1/inventory/stock/low',
    'http://localhost:8000/api/v1/inventory/stock/expiring?days=90',
    'http://localhost:8000/api/v1/inventory/stock/valuation'
]

for url in endpoints:
    print(f"Testing {url} ...")
    try:
        urllib.request.urlopen(url)
        print("Success")
    except HTTPError as e:
        print("Error:", e.read().decode())
    except Exception as e:
        print("Other Error:", e)
