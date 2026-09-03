"""Clear leftover inventory stock and reseed realistic test data through the
REAL movement flow (inventory.SpInvDocument), so stock, valuation and the ledger
all move exactly as they would in production.

Scope: the inventory *items* domain only (inventory schema). Masters
(admin.Master_Item / Master_Store) are preserved. Pharmacy medicine stock is
NOT touched.

Usage (from the Python/ directory):
    python reseed_inventory.py            # clear + reseed
    python reseed_inventory.py --clear    # clear only
    python reseed_inventory.py --dry-run  # show current state, change nothing

Safe to run repeatedly — each run wipes the inventory transactional tables and
posts a fresh, deterministic set of documents.
"""
import json
import sys
from sqlalchemy import text
from app.database import engine

DRY = "--dry-run" in sys.argv
CLEAR_ONLY = "--clear" in sys.argv

# Store / item ids as they exist in this database (see inspect_inventory.py).
CENTRAL, PHARMACY, OT, LAB = 3, 4, 5, 6
SYRINGE, GLOVES, CANNULA, COTTON, BLADE = 3, 4, 5, 6, 7
SUTURE, MASK, GLUCOSE, THERMO, FOLDER = 8, 9, 10, 11, 12

_DOC = ("CALL inventory.SpInvDocument(:p_Opt, :p_DocId, :p_DocType, :p_FromStoreId, :p_ToStoreId, "
        ":p_DepartmentName, :p_VendorName, :p_ReferenceNo, :p_RequestedBy, :p_ApprovedBy, "
        ":p_Reason, :p_Remarks, :p_Items, :p_FromDate, :p_ToDate, :p_User)")

_KEYS = ("p_Opt p_DocId p_DocType p_FromStoreId p_ToStoreId p_DepartmentName p_VendorName "
         "p_ReferenceNo p_RequestedBy p_ApprovedBy p_Reason p_Remarks p_Items p_FromDate "
         "p_ToDate p_User").split()

# Clear children before parents (ledger + doc items reference documents).
CLEAR_ORDER = [
    "inventory.Inventory_StockLedger",
    "inventory.Inventory_DocumentItem",
    "inventory.Inventory_Document",
    "inventory.Inventory_Stock",
]

CLEAR_STATE = {
    "hospital.Pharmacy_Stock",  # left untouched — listed only for the summary
}


def line(item, qty, rate, batch, mfg=None, exp=None, remarks=None):
    return {"itemId": item, "batchNo": batch, "mfgDate": mfg, "expiryDate": exp,
            "quantity": qty, "rate": rate, "uom": None, "remarks": remarks}


# ── Test data, posted through the real flow ──────────────────────────────────
# RECEIPTs create the stock; ISSUE/TRANSFER/RETURN exercise the outward side and
# populate the ledger + the Stock Out / Transfer / Return screens.
RECEIPTS = [
    dict(to=CENTRAL, vendor="MediSupply Co", ref="PO-2026-0001", by="Store Manager", lines=[
        line(SYRINGE, 1800, 8.50, "BD20260801", "2026-01-10", "2027-06-30"),
        line(GLOVES, 1200, 210.00, "ET20260702", "2026-02-01", "2027-09-30"),
        line(COTTON, 1950, 45.00, "CT20260405", "2026-03-15", "2028-01-01"),
    ]),
    dict(to=PHARMACY, vendor="PharmaTrade Ltd", ref="PO-2026-0002", by="Store Manager", lines=[
        line(CANNULA, 1600, 30.00, "BA20260603", "2026-01-20", "2026-10-15"),   # expiring <90d
        line(MASK, 150, 120.00, "FM20260501", "2026-05-01", "2026-09-30"),      # low stock + expiring
    ]),
    dict(to=OT, vendor="SurgiCorp", ref="PO-2026-0003", by="Dr. Smith", lines=[
        line(BLADE, 900, 55.00, "SB20260210", "2026-02-10", "2027-02-28"),
        line(SUTURE, 700, 180.00, "SV20260315", "2026-03-01", "2027-05-31"),
        line(SUTURE, 40, 175.00, "SV20250601", "2025-06-01", "2026-06-15"),     # expired lot
        line(SYRINGE, 500, 8.75, "BD20260802", "2026-02-01", "2027-07-31"),
    ]),
    dict(to=LAB, vendor="LabMart", ref="PO-2026-0004", by="Store Manager", lines=[
        line(GLUCOSE, 900, 350.00, "GT20260504", "2026-04-01", "2026-08-25"),   # expiring <30d
        line(THERMO, 15, 450.00, "DT20260101", "2025-12-01", "2029-01-01"),     # low stock
        line(FOLDER, 1900, 12.00, "PF20260601", "2026-06-01", None),            # no expiry
    ]),
]

ISSUES = [
    dict(frm=CENTRAL, dept="Operation Theatre", by="Dr. Smith", lines=[
        line(SYRINGE, 120, 0, "BD20260801"),
        line(GLOVES, 80, 0, "ET20260702"),
    ]),
    dict(frm=PHARMACY, dept="Emergency", by="Nurse Joy", lines=[
        line(CANNULA, 200, 0, "BA20260603"),
    ]),
]

TRANSFERS = [
    dict(frm=CENTRAL, to=OT, by="Store Manager", lines=[
        line(SYRINGE, 200, 0, "BD20260801"),
    ]),
]

RETURNS = [
    dict(to=CENTRAL, reason="Excess", by="Dr. Adams", lines=[
        line(GLOVES, 20, 210.00, "ET20260702"),
    ]),
]


def counts(conn):
    out = {}
    for t in CLEAR_ORDER + list(CLEAR_STATE):
        out[t] = conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
    return out


def print_counts(title, c):
    print(f"\n=== {title} ===")
    for t, n in c.items():
        print(f"  {t:<40} {n}")


def post(conn, doc_type, lines, frm=None, to=None, dept=None, vendor=None,
         ref=None, by=None, reason=None):
    params = {k: None for k in _KEYS}
    params.update({
        "p_Opt": "CREATE", "p_DocType": doc_type,
        "p_FromStoreId": frm, "p_ToStoreId": to, "p_DepartmentName": dept,
        "p_VendorName": vendor, "p_ReferenceNo": ref, "p_RequestedBy": by,
        "p_Reason": reason, "p_Items": json.dumps(lines), "p_User": "Seed",
    })
    row = conn.execute(text(_DOC), params).fetchone()
    print(f"  posted {doc_type:<10} {row.DocNumber}  ({len(lines)} line(s))")
    return row.DocNumber


def main():
    with engine.begin() as conn:
        print_counts("BEFORE", counts(conn))

        # Show what stale documents exist so the clear is transparent.
        stale = conn.execute(text(
            "SELECT DocType, COUNT(*) c FROM inventory.Inventory_Document GROUP BY DocType"
        )).fetchall()
        if stale:
            print("\n  stale documents to be removed:",
                  ", ".join(f"{r.DocType}×{r.c}" for r in stale))

        if DRY:
            print("\n[dry-run] no changes made.")
            return

        print("\n=== CLEARING inventory transactional tables ===")
        for t in CLEAR_ORDER:
            n = conn.execute(text(f"DELETE FROM {t}")).rowcount
            print(f"  cleared {t:<40} ({n} rows)")

        if CLEAR_ONLY:
            print("\n[clear] done — no reseed requested.")
            print_counts("AFTER", counts(conn))
            return

        print("\n=== POSTING RECEIPTS (Stock In) ===")
        for r in RECEIPTS:
            post(conn, "RECEIPT", r["lines"], to=r["to"], vendor=r["vendor"],
                 ref=r["ref"], by=r["by"])

        print("\n=== POSTING ISSUES (Stock Out) ===")
        for r in ISSUES:
            post(conn, "ISSUE", r["lines"], frm=r["frm"], dept=r["dept"], by=r["by"])

        print("\n=== POSTING TRANSFERS ===")
        for r in TRANSFERS:
            post(conn, "TRANSFER", r["lines"], frm=r["frm"], to=r["to"], by=r["by"])

        print("\n=== POSTING RETURNS ===")
        for r in RETURNS:
            post(conn, "RETURN", r["lines"], to=r["to"], reason=r["reason"], by=r["by"])

        print_counts("AFTER", counts(conn))

    # Fresh connection for the read-back summary.
    with engine.connect() as conn:
        print("\n=== RESULTING STOCK LOTS ===")
        rows = conn.execute(text(
            "SELECT i.ItemCode, i.ItemName, st.StoreName, s.BatchNo, s.Quantity, "
            "s.ValuationRate, s.ExpiryDate FROM inventory.Inventory_Stock s "
            "JOIN admin.Master_Item i ON i.ItemId=s.ItemId "
            "JOIN admin.Master_Store st ON st.StoreId=s.StoreId "
            "ORDER BY i.ItemName, st.StoreName")).fetchall()
        for r in rows:
            print(f"  {r.ItemCode} {r.ItemName:<28} {r.StoreName:<22} {r.BatchNo:<12} "
                  f"qty={r.Quantity:>8} rate={r.ValuationRate} exp={r.ExpiryDate}")
        val = conn.execute(text(
            "SELECT COALESCE(SUM(Quantity*ValuationRate),0) FROM inventory.Inventory_Stock")).scalar()
        led = conn.execute(text("SELECT COUNT(*) FROM inventory.Inventory_StockLedger")).scalar()
        print(f"\n  total stock value = {val}   ledger rows = {led}")


if __name__ == "__main__":
    main()
