import urllib.request
import json

try:
    response = urllib.request.urlopen('http://localhost:8000/api/v1/categories/')
    data = json.loads(response.read().decode())
    for cat in data:
        print(f"{cat['categoryName']} - {cat['inventoryType']}")
except Exception as e:
    print(e)
