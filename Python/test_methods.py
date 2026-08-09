"""Exercise GET / POST / PUT / PATCH / DELETE on every module endpoint."""
import json
import urllib.request
import urllib.error

A = "http://localhost:8000/api/v1"
results = []   # (module, method, path, status, ok, note)


def call(method, path, body=None):
    req = urllib.request.Request(
        A + path, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json"})
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
    except Exception as e:
        return 0, str(e)


def rec(module, method, path, status, expect=(200, 201, 204)):
    ok = status in expect
    note = ""
    if not ok:
        note = "expected " + "/".join(str(e) for e in expect)
    results.append((module, method, path, status, ok, note))
    return ok


print("Running method matrix...\n")

# ─────────────── MASTERS (full CRUD pattern) ───────────────
MASTERS = [
    ("Item", "/items/", {"itemCode": "ZZTEST-1", "itemName": "Method Test Item",
                          "category": "Medical Consumables", "manufacturer": "T", "uom": "Each",
                          "gstPercentage": 12, "status": "Active"}),
    ("Store", "/stores/", {"storeName": "Method Test Store", "storeType": "Sub Store",
                            "status": "Active"}),
    ("Medicine", "/medicines/", {"medicineCode": "ZZMED-1", "genericName": "T", "brandName": "MethodTest",
                                  "category": "Tablets", "manufacturer": "T", "strength": "1mg",
                                  "dosageForm": "Tablet", "unit": "Strip", "purchasePrice": "1",
                                  "sellingPrice": "2", "gst": "5"}),
    ("LabTest", "/tests/", {"testCode": "ZZT-1", "testName": "Method Test", "testCategory": "Hematology",
                             "department": "Pathology", "sampleType": "Blood",
                             "turnaroundTime": "1 hour", "testPrice": 100}),
    ("InsProvider", "/insurance-providers/", {"providerName": "Method Test Insurer",
        "insuranceType": "Health Insurance", "contactPerson": "T", "phoneNumber": "9000000000",
        "email": "t@t.com", "addressLine1": "A", "country": "India", "state": "TN",
        "city": "Chennai", "postalCode": "600001"}),
]

for name, path, payload in MASTERS:
    st, _ = call("GET", path)
    rec(name, "GET", path, st)
    st, created = call("POST", path, payload)
    rec(name, "POST", path, st)
    rid = None
    if isinstance(created, dict):
        rid = created.get("id")
    if rid:
        st, _ = call("GET", f"{path}{rid}")
        rec(name, "GET", f"{path}{{id}}", st)
        st, _ = call("PUT", f"{path}{rid}", payload)
        rec(name, "PUT", f"{path}{{id}}", st)
        st, _ = call("PATCH", f"{path}{rid}/toggle-status")
        rec(name, "PATCH", f"{path}{{id}}/toggle-status", st, expect=(200, 204, 404, 405))
        st, _ = call("DELETE", f"{path}{rid}")
        rec(name, "DELETE", f"{path}{{id}}", st, expect=(200, 204))

# ─────────────── PHARMACY ───────────────
st, meds = call("GET", "/pharmacy/medicines"); rec("Pharmacy", "GET", "/pharmacy/medicines", st)
rec("Pharmacy", "GET", "/pharmacy/medicines/low-stock", call("GET", "/pharmacy/medicines/low-stock")[0])
rec("Pharmacy", "GET", "/pharmacy/medicines/expiring", call("GET", "/pharmacy/medicines/expiring")[0])
rec("Pharmacy", "GET", "/pharmacy/sales", call("GET", "/pharmacy/sales")[0])
med = next((m for m in (meds or []) if m["quantity"] > 5), None)
if med:
    st, sale = call("POST", "/pharmacy/sales", {
        "patientName": "MethodTest", "patientRef": "9000000000", "totalAmount": 10, "tax": 0,
        "netAmount": 10, "paymentMode": "Cash", "paymentStatus": "Paid",
        "items": [{"medicineId": int(med["id"]), "medicineName": med["name"], "quantity": 1,
                   "unitPrice": 10, "subtotal": 10}]})
    rec("Pharmacy", "POST", "/pharmacy/sales", st, expect=(201,))
    if isinstance(sale, dict) and sale.get("saleId"):
        sid = sale["saleId"]
        rec("Pharmacy", "GET", "/pharmacy/sales/{id}", call("GET", f"/pharmacy/sales/{sid}")[0])
        rec("Pharmacy", "PATCH", "/pharmacy/sales/{id}/status",
            call("PATCH", f"/pharmacy/sales/{sid}/status", {"paymentStatus": "Paid"})[0])
        rec("Pharmacy", "POST", "/pharmacy/sales/{id}/refund",
            call("POST", f"/pharmacy/sales/{sid}/refund")[0])
        rec("Pharmacy", "PUT", "/pharmacy/stock/{id}",
            call("PUT", f"/pharmacy/stock/{med['id']}",
                 {"quantity": int(med["quantity"]), "unitPrice": float(med["unitPrice"]),
                  "minStockLevel": 10})[0])
        rec("Pharmacy", "POST", "/pharmacy/stock/{id}/adjust",
            call("POST", f"/pharmacy/stock/{med['id']}/adjust", {"delta": 0})[0])

# ─────────────── LAB ───────────────
st, tests = call("GET", "/lab/tests"); rec("Lab", "GET", "/lab/tests", st)
rec("Lab", "GET", "/lab/orders", call("GET", "/lab/orders")[0])
rec("Lab", "GET", "/lab/qc", call("GET", "/lab/qc")[0])
if tests:
    st, order = call("POST", "/lab/orders", {
        "uhid": "UHID-METHOD", "patientName": "Method Test", "orderedBy": "Dr T",
        "tests": [{"testId": tests[0]["testId"], "testName": tests[0]["testName"]}]})
    rec("Lab", "POST", "/lab/orders", st, expect=(201,))
    if isinstance(order, dict) and order.get("orderId"):
        oid = order["orderId"]
        st, full = call("GET", f"/lab/orders/{oid}"); rec("Lab", "GET", "/lab/orders/{id}", st)
        tid = full["tests"][0]["id"] if isinstance(full, dict) and full.get("tests") else None
        if tid:
            rec("Lab", "PATCH", "/lab/orders/tests/{id}/status",
                call("PATCH", f"/lab/orders/tests/{tid}/status", {"status": "Sample Collected"})[0])
            rec("Lab", "PUT", "/lab/orders/tests/{id}/result",
                call("PUT", f"/lab/orders/tests/{tid}/result", {"resultValue": "10"})[0])
            rec("Lab", "POST", "/lab/orders/tests/{id}/verify",
                call("POST", f"/lab/orders/tests/{tid}/verify", {"verifiedBy": "Dr T"})[0])
            rec("Lab", "POST", "/lab/orders/tests/{id}/acknowledge",
                call("POST", f"/lab/orders/tests/{tid}/acknowledge", {"acknowledgedBy": "Dr T"})[0])
        rec("Lab", "DELETE", "/lab/orders/{id}", call("DELETE", f"/lab/orders/{oid}")[0])
st, qc = call("POST", "/lab/qc", {"qcDate": "2026-08-06", "machineName": "MethodTest",
                                   "testName": "T", "expectedValue": 10, "actualValue": 10})
rec("Lab", "POST", "/lab/qc", st, expect=(201,))

# ─────────────── INSURANCE ───────────────
for p in ["/insurance/providers", "/insurance/policies", "/insurance/pre-auths",
          "/insurance/claims", "/insurance/appeals", "/insurance/settlements", "/insurance/dashboard"]:
    rec("Insurance", "GET", p, call("GET", p)[0])

st, pol = call("POST", "/insurance/policies", {
    "uhid": "UHID-METHOD", "patientName": "Method Test", "policyNumber": "ZZPOL-1",
    "insurerName": "Star Health", "sumInsured": 100000, "validUntil": "2027-12-31"})
rec("Insurance", "POST", "/insurance/policies", st, expect=(201,))
if isinstance(pol, dict) and pol.get("policyId"):
    rec("Insurance", "GET", "/insurance/policies/search", call("GET", "/insurance/policies/search?q=ZZPOL-1")[0])
    rec("Insurance", "DELETE", "/insurance/policies/{id}",
        call("DELETE", f"/insurance/policies/{pol['policyId']}")[0])

st, pa = call("POST", "/insurance/pre-auths", {
    "uhid": "UHID-METHOD", "patientName": "Method Test", "insurerName": "Star Health",
    "diagnosis": "Test", "requestedAmount": 1000})
rec("Insurance", "POST", "/insurance/pre-auths", st, expect=(201,))
if isinstance(pa, dict) and pa.get("preAuthId"):
    pid = pa["preAuthId"]
    rec("Insurance", "PUT", "/insurance/pre-auths/{id}",
        call("PUT", f"/insurance/pre-auths/{pid}", {"uhid": "UHID-METHOD", "patientName": "Method Test",
             "insurerName": "Star Health", "requestedAmount": 1200})[0])
    rec("Insurance", "PATCH", "/insurance/pre-auths/{id}/status",
        call("PATCH", f"/insurance/pre-auths/{pid}/status", {"status": "Approved", "approvedAmount": 900})[0])
    rec("Insurance", "DELETE", "/insurance/pre-auths/{id}", call("DELETE", f"/insurance/pre-auths/{pid}")[0])

st, cl = call("POST", "/insurance/claims", {
    "uhid": "UHID-METHOD", "patientName": "Method Test", "insurerName": "Star Health",
    "billedAmount": 5000, "claimedAmount": 4000})
rec("Insurance", "POST", "/insurance/claims", st, expect=(201,))
if isinstance(cl, dict) and cl.get("claimId"):
    cid = cl["claimId"]
    rec("Insurance", "GET", "/insurance/claims/{id}", call("GET", f"/insurance/claims/{cid}")[0])
    rec("Insurance", "PUT", "/insurance/claims/{id}",
        call("PUT", f"/insurance/claims/{cid}", {"uhid": "UHID-METHOD", "patientName": "Method Test",
             "insurerName": "Star Health", "billedAmount": 5000, "claimedAmount": 4200})[0])
    rec("Insurance", "PATCH", "/insurance/claims/{id}/status",
        call("PATCH", f"/insurance/claims/{cid}/status", {"status": "Denied", "reason": "Test"})[0])
    st, aps = call("GET", "/insurance/appeals")
    ap = [a for a in (aps or []) if a.get("claimPk") == cid]
    if ap:
        aid = ap[0]["appealId"]
        rec("Insurance", "POST", "/insurance/appeals/{id}/file",
            call("POST", f"/insurance/appeals/{aid}/file", {"appealReason": "Test"})[0])
        rec("Insurance", "POST", "/insurance/appeals/{id}/resolve",
            call("POST", f"/insurance/appeals/{aid}/resolve", {"approvedAmount": 3000})[0])
        st, sets = call("GET", "/insurance/settlements")
        s = [x for x in (sets or []) if x.get("claimPk") == cid]
        if s:
            rec("Insurance", "POST", "/insurance/settlements/{id}/reconcile",
                call("POST", f"/insurance/settlements/{s[0]['settlementId']}/reconcile",
                     {"utrReference": "UTR-TEST"})[0])
    rec("Insurance", "DELETE", "/insurance/claims/{id}", call("DELETE", f"/insurance/claims/{cid}")[0])

# ─────────────── INVENTORY ───────────────
for p in ["/inventory/stores", "/inventory/items", "/inventory/stock", "/inventory/stock/low",
          "/inventory/stock/expiring", "/inventory/stock/valuation", "/inventory/ledger",
          "/inventory/documents", "/inventory/dashboard"]:
    rec("Inventory", "GET", p, call("GET", p)[0])

st, items = call("GET", "/inventory/items")
st2, stores = call("GET", "/inventory/stores")
if items and stores:
    rec("Inventory", "GET", "/inventory/stock/issuable",
        call("GET", f"/inventory/stock/issuable?storeId={stores[0]['storeId']}")[0])
    st, doc = call("POST", "/inventory/documents", {
        "docType": "RECEIPT", "toStoreId": stores[0]["storeId"], "vendorName": "MethodTest",
        "items": [{"itemId": items[0]["itemId"], "batchNo": "ZZM", "quantity": 5, "rate": 10}]})
    rec("Inventory", "POST", "/inventory/documents", st, expect=(201,))
    if isinstance(doc, dict) and doc.get("docId"):
        did = doc["docId"]
        rec("Inventory", "GET", "/inventory/documents/{id}", call("GET", f"/inventory/documents/{did}")[0])
        rec("Inventory", "DELETE", "/inventory/documents/{id}", call("DELETE", f"/inventory/documents/{did}")[0])

# ─────────────── EXECUTIVE (read-only by design) ───────────────
for p in ["/executive/clinical", "/executive/audit-summary", "/executive/overview",
          "/executive/operational", "/executive/headcount", "/executive/predictive"]:
    rec("Executive", "GET", p, call("GET", p)[0])

# ─────────────── REGISTRATION / APPOINTMENTS / IPD ───────────────
for p in ["/patients/", "/patients/today", "/quick-registrations/", "/emergency-registrations/",
          "/appointments/", "/doctor-schedules/", "/ipd/wards", "/ipd/beds", "/ipd/admissions",
          "/audit-logs/"]:
    rec("Core", "GET", p, call("GET", p)[0])

# ─────────────── report ───────────────
print(f"{'MODULE':<14}{'METHOD':<8}{'PATH':<46}{'STATUS':<8}")
print("-" * 82)
bad = []
for m, meth, path, st, ok, note in results:
    flag = "" if ok else f"  <-- {note}"
    print(f"{m:<14}{meth:<8}{path:<46}{st:<8}{flag}")
    if not ok:
        bad.append((m, meth, path, st, note))

print(f"\nTOTAL: {len(results)} calls · {len(results)-len(bad)} OK · {len(bad)} FAILED")
if bad:
    print("\nFAILURES:")
    for m, meth, path, st, note in bad:
        print(f"  {m} {meth} {path} -> {st} ({note})")
