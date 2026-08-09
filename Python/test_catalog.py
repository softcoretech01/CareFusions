import urllib.request
import json

try:
    res = urllib.request.urlopen("http://127.0.0.1:8000/api/v1/vendor-catalogs")
    data = json.loads(res.read().decode())
    print("API Response Vendors count:", len(data))
    for v in data:
        print(f"Vendor: {v['vendorName']} ({v['vendorCode']}) | City: {v['city']} | Items count: {len(v['items'])}")
        for item in v["items"]:
            print("   Item:", item["itemCode"], "-", item["itemName"], "Rate: Rs." + str(item["catalogPrice"]), "Cat:", item["category"])
except Exception as e:
    print("Error:", str(e))
