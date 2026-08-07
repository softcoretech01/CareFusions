"""End-to-end API test across every CareFusions module."""
import json
import urllib.request
import urllib.error

A = "http://localhost:8000/api/v1"
passed, failed = [], []


def call(method, path, body=None):
    req = urllib.request.Request(
        A + path, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read().decode()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw


def chk(name, got, want):
    (passed if got == want else failed).append(name)
    print(f"  {'PASS' if got == want else 'FAIL'}  {name}" + ("" if got == want else f"   got={got!r} want={want!r}"))


print("=== PHARMACY ===")
_, meds = call("GET", "/pharmacy/medicines")
med = next(m for m in meds if m["quantity"] > 10)
q0 = med["quantity"]
st, sale = call("POST", "/pharmacy/sales", {
    "patientName": "Test", "patientRef": "9876500000", "totalAmount": 30, "tax": 1.5,
    "netAmount": 31.5, "paymentMode": "Cash", "paymentStatus": "Paid",
    "items": [{"medicineId": int(med["id"]), "medicineName": med["name"], "quantity": 2,
               "unitPrice": 15, "subtotal": 30}]})
chk("sale created", st, 201)
_, meds2 = call("GET", "/pharmacy/medicines")
q1 = next(m for m in meds2 if m["id"] == med["id"])["quantity"]
chk("stock decremented by 2", q0 - q1, 2)
st, _ = call("POST", "/pharmacy/sales", {
    "patientName": "Test", "totalAmount": 1, "netAmount": 1, "paymentStatus": "Paid",
    "items": [{"medicineId": int(med["id"]), "medicineName": "X", "quantity": 999999,
               "unitPrice": 1, "subtotal": 1}]})
chk("oversell blocked (409)", st, 409)
st, _ = call("POST", f"/pharmacy/sales/{sale['saleId']}/refund")
chk("refund posted", st, 200)
_, meds3 = call("GET", "/pharmacy/medicines")
chk("refund restocked", next(m for m in meds3 if m["id"] == med["id"])["quantity"], q0)
call("DELETE", f"/pharmacy/sales/{sale['saleId']}")

print("=== LAB ===")
_, tests = call("GET", "/lab/tests")
hb = next(t for t in tests if t["testCode"] == "HB")
st, order = call("POST", "/lab/orders", {
    "uhid": "UHID-TEST", "patientName": "Test Patient", "orderedBy": "Dr Smith",
    "tests": [{"testId": hb["testId"], "testName": "Hemoglobin"}]})
chk("lab order created", st, 201)
_, full = call("GET", f"/lab/orders/{order['orderId']}")
tid = full["tests"][0]["id"]
_, r1 = call("PUT", f"/lab/orders/tests/{tid}/result", {"resultValue": "13.5"})
chk("normal Hb (12.0-15.5) not critical", r1["isCritical"], False)
_, r2 = call("PUT", f"/lab/orders/tests/{tid}/result", {"resultValue": "6.2"})
chk("low Hb flagged critical", r2["isCritical"], True)
_, r3 = call("PUT", f"/lab/orders/tests/{tid}/result", {"resultValue": "Negative"})
chk("qualitative result not flagged", r3["isCritical"], False)
_, o2 = call("GET", f"/lab/orders/{order['orderId']}")
chk("order status derived = Completed", o2["status"], "Completed")
call("POST", f"/lab/orders/tests/{tid}/verify", {"verifiedBy": "Dr Path"})
_, o3 = call("GET", f"/lab/orders/{order['orderId']}")
chk("order status derived = Verified", o3["status"], "Verified")
call("DELETE", f"/lab/orders/{order['orderId']}")

print("=== INSURANCE ===")
st, claim = call("POST", "/insurance/claims", {
    "uhid": "UHID-TEST", "patientName": "Test Patient", "providerId": 2,
    "insurerName": "Star Health", "billedAmount": 20000, "claimedAmount": 18000})
chk("claim created", st, 201)
chk("patient balance = billed - claimed", claim["balance"], 2000.0)
cid = claim["claimId"]
st, _ = call("PATCH", f"/insurance/claims/{cid}/status", {"status": "Denied", "reason": "Test"})
chk("claim denied", st, 200)
_, appeals = call("GET", "/insurance/appeals")
ap = [a for a in appeals if a["claimPk"] == cid]
chk("appeal auto-created on deny", len(ap), 1)
call("POST", f"/insurance/appeals/{ap[0]['appealId']}/resolve", {"approvedAmount": 16000})
_, sets = call("GET", "/insurance/settlements")
s = [x for x in sets if x["claimPk"] == cid]
chk("settlement auto-created on resolve", len(s), 1)
chk("settlement approved amount", s[0]["approvedAmt"], 16000.0)
chk("settlement TDS 10%", s[0]["tds"], 1600.0)
chk("settlement net receivable", s[0]["netReceivable"], 14400.0)
call("DELETE", f"/insurance/claims/{cid}")

print("=== INVENTORY ===")
_, items = call("GET", "/inventory/items")
_, stores = call("GET", "/inventory/stores")
it, s1 = items[0]["itemId"], stores[0]["storeId"]
s2 = stores[1]["storeId"]
st, _ = call("POST", "/inventory/documents", {
    "docType": "RECEIPT", "toStoreId": s1,
    "items": [{"itemId": it, "batchNo": "TST", "quantity": 100, "rate": 10}]})
chk("receipt 100 @ 10", st, 201)
call("POST", "/inventory/documents", {
    "docType": "RECEIPT", "toStoreId": s1,
    "items": [{"itemId": it, "batchNo": "TST", "quantity": 100, "rate": 20}]})
_, lots = call("GET", f"/inventory/stock?itemId={it}")
lot = next(l for l in lots if l["batchNo"] == "TST")
chk("moving average rate = 15", lot["valuationRate"], 15.0)
chk("quantity = 200", lot["quantity"], 200.0)
st, _ = call("POST", "/inventory/documents", {
    "docType": "ISSUE", "fromStoreId": s1, "departmentName": "ICU",
    "items": [{"itemId": it, "batchNo": "TST", "quantity": 999999}]})
chk("oversell blocked (409)", st, 409)
st, _ = call("POST", "/inventory/documents", {
    "docType": "TRANSFER", "fromStoreId": s1, "toStoreId": s1,
    "items": [{"itemId": it, "quantity": 1}]})
chk("same-store transfer rejected (422)", st, 422)
call("POST", "/inventory/documents", {
    "docType": "TRANSFER", "fromStoreId": s1, "toStoreId": s2,
    "items": [{"itemId": it, "batchNo": "TST", "quantity": 30}]})
_, lots2 = call("GET", f"/inventory/stock?itemId={it}")
tot = sum(l["stockValue"] for l in lots2 if l["batchNo"] == "TST")
chk("value preserved across transfer", round(tot, 2), 3000.0)
_, led = call("GET", "/inventory/ledger")
chk("ledger rows written", len([l for l in led if l["batchNo"] == "TST"]) >= 4, True)

print("=== VALIDATION (backend rejects bad input) ===")
st, _ = call("POST", "/lab/orders", {"uhid": "U", "patientName": "J0hn123", "tests": [{"testId": 1, "testName": "x"}]})
chk("lab: numeric in patient name rejected", st, 422)
st, _ = call("POST", "/insurance/claims", {"uhid": "U", "patientName": "Bad@Name", "insurerName": "X",
                                           "billedAmount": 100, "claimedAmount": 50})
chk("insurance: symbol in patient name rejected", st, 422)
st, _ = call("POST", "/inventory/documents", {"docType": "ISSUE", "fromStoreId": s1,
                                              "items": [{"itemId": it, "quantity": -5}]})
chk("inventory: negative qty on ISSUE rejected", st, 422)
st, _ = call("POST", "/pharmacy/sales", {"patientName": "T", "patientRef": "12", "totalAmount": 1,
                                         "netAmount": 1, "items": [{"medicineId": 1, "medicineName": "x",
                                                                    "quantity": 1, "unitPrice": 1, "subtotal": 1}]})
chk("pharmacy: short phone rejected", st, 422)

print(f"\nRESULT: {len(passed)} passed, {len(failed)} failed")
if failed:
    print("Failed:", failed)
