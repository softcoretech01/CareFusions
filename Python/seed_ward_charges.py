"""Seed the Ward Charge master with a starter rate card.

Posts through the running API (default http://localhost:8000) so the rows go in
exactly the way the admin screen creates them. Safe to re-run: a ward type that
already has a charge is skipped rather than duplicated.

    python seed_ward_charges.py
"""
import json
import os
import urllib.error
import urllib.request

API = os.getenv("API_BASE_URL", "http://localhost:8000") + "/api/v1/ward-charges"

# ward type, charge per day, description, remarks
CHARGES = [
    ("General",      1500,  "Shared ward, 6-8 beds with common washroom",        "Lowest tariff; used as the base rate for package billing"),
    ("Semi-Private", 3000,  "Twin sharing room with attached washroom",          "Attendant bed not included"),
    ("Private",      5500,  "Single occupancy room with attendant bed",          "Includes one attendant meal per day"),
    ("Deluxe",       9000,  "Single room with lounge seating, TV and fridge",    "Attendant meals and laundry included"),
    ("ICU",          15000, "Intensive care with 1:1 nursing and monitoring",    "Ventilator support billed separately"),
    ("NICU",         12000, "Neonatal intensive care with incubator support",    "Phototherapy billed separately"),
    ("PICU",         12500, "Paediatric intensive care with 1:1 nursing",        "Paediatric intensivist visit included"),
    ("HDU",          8000,  "High dependency unit, step-down from ICU",          "Continuous monitoring included"),
    ("OT",           6000,  "Operation theatre occupancy",                       "Charged per hour of use, not per day"),
]


def existing_types():
    with urllib.request.urlopen(f"{API}/", timeout=20) as r:
        return {row["WardType"] for row in json.load(r)}


def seed():
    have = existing_types()
    added = skipped = 0
    for ward_type, charge, description, remarks in CHARGES:
        if ward_type in have:
            print(f"  skip   {ward_type}  (already has a charge)")
            skipped += 1
            continue
        body = json.dumps({
            "WardType": ward_type,
            "Charge": charge,
            "Description": description,
            "Remarks": remarks,
            "Status": "Active",
        }).encode()
        req = urllib.request.Request(f"{API}/", data=body,
                                     headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                print(f"  added  {ward_type:13} Rs {charge:>6}  (id {json.load(r)['Id']})")
                added += 1
        except urllib.error.HTTPError as e:
            print(f"  FAILED {ward_type}: {e.code} {e.read().decode()[:200]}")
    print(f"\nward charges: {added} added, {skipped} skipped")


if __name__ == "__main__":
    print("Seeding ward charges...")
    seed()
