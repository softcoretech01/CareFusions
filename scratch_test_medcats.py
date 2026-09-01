import urllib.request
import json

try:
    response = urllib.request.urlopen('http://localhost:8000/api/v1/medicine-categories/?status_filter=Active')
    data = json.loads(response.read().decode())
    print("Fetched Med Categories:", len(data))
    for cat in data:
        print(f"{cat['categoryName']}")
except Exception as e:
    print(e)
