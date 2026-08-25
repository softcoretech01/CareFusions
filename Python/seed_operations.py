"""Seed the Minor/Major Operation masters with a starter set of records.

Posts through the running API (default http://localhost:8000) so the rows go in
exactly the way the admin screens create them. Safe to re-run: operationCode is
unique, so codes that already exist are skipped rather than erroring.

    python seed_operations.py
"""
import json
import os
import urllib.error
import urllib.request

API = os.getenv("API_BASE_URL", "http://localhost:8000") + "/api/v1"

MINOR = [
    # code, name, department, description, charge, minutes, consent, admission, OT, remarks
    ("MIN-001", "Abscess Incision & Drainage", "General Medicine", "Incision and drainage of superficial abscess under local anaesthesia", "2500", "30", True, False, True, "Day-care procedure"),
    ("MIN-002", "Wound Suturing", "General Medicine", "Cleaning and primary suturing of a laceration", "1500", "25", True, False, False, "Dressing charges billed separately"),
    ("MIN-003", "Sebaceous Cyst Excision", "Dermatology", "Complete excision of sebaceous cyst with primary closure", "3500", "40", True, False, True, "Specimen sent for histopathology"),
    ("MIN-004", "Ingrown Toenail Removal", "Orthopedics", "Partial nail avulsion with nail bed cauterisation", "2800", "30", True, False, True, "Day-care procedure"),
    ("MIN-005", "Ear Lobe Repair", "ENT", "Repair of split or torn ear lobule under local anaesthesia", "4000", "45", True, False, True, "Suture removal after 7 days"),
    ("MIN-006", "Simple Dental Extraction", "Dental", "Extraction of an erupted tooth under local anaesthesia", "1200", "20", True, False, False, "X-ray charges billed separately"),
    ("MIN-007", "Foreign Body Removal - Ear/Nose", "ENT", "Removal of foreign body from external ear canal or nasal cavity", "1800", "20", True, False, False, "Paediatric cases may need sedation"),
    ("MIN-008", "Plaster Cast Application", "Orthopedics", "Application of below-knee or below-elbow plaster cast", "1600", "30", False, False, False, "Cast material included"),
]

MAJOR = [
    ("MAJ-001", "Coronary Angioplasty (PTCA)", "Cardiology", "Percutaneous transluminal coronary angioplasty with stent placement", "185000", "120", True, True, True, "Stent cost billed separately"),
    ("MAJ-002", "Permanent Pacemaker Implantation", "Cardiology", "Implantation of a dual-chamber permanent pacemaker", "275000", "150", True, True, True, "Device cost billed separately"),
    ("MAJ-003", "Total Knee Replacement", "Orthopedics", "Unilateral total knee arthroplasty with prosthesis", "225000", "180", True, True, True, "Implant cost billed separately"),
    ("MAJ-004", "Lumbar Spinal Fusion", "Orthopedics", "Posterior lumbar interbody fusion with pedicle screw fixation", "310000", "240", True, True, True, "Requires post-op ICU observation"),
    ("MAJ-005", "Kidney Transplant", "Nephrology", "Live-donor renal transplantation", "650000", "300", True, True, True, "Donor workup billed separately"),
    ("MAJ-006", "AV Fistula Creation", "Nephrology", "Radiocephalic arteriovenous fistula for haemodialysis access", "45000", "90", True, True, True, "Maturation review after 6 weeks"),
    ("MAJ-007", "Endoscopic Sinus Surgery", "ENT", "Functional endoscopic sinus surgery for chronic rhinosinusitis", "85000", "120", True, True, True, "Overnight stay required"),
    ("MAJ-008", "Tonsillectomy & Adenoidectomy", "Pediatrics", "Combined removal of tonsils and adenoids under general anaesthesia", "55000", "75", True, True, True, "Paediatric anaesthesia clearance needed"),
]


def existing_codes(path):
    with urllib.request.urlopen(f"{API}/{path}/", timeout=20) as r:
        return {row["operationCode"] for row in json.load(r)}


def seed(path, rows):
    have = existing_codes(path)
    added = skipped = 0
    for code, name, dept, desc, charge, minutes, consent, admission, ot, remarks in rows:
        if code in have:
            print(f"  skip   {code}  (already present)")
            skipped += 1
            continue
        body = json.dumps({
            "operationCode": code,
            "operationName": name,
            "department": dept,
            "description": desc,
            "defaultCharge": charge,
            "taxApplicable": True,
            "estimatedDuration": minutes,
            "requiresConsent": consent,
            "requiresAdmission": admission,
            "otRequired": ot,
            "status": "Active",
            "remarks": remarks,
            "createdBy": "Seed",
        }).encode()
        req = urllib.request.Request(f"{API}/{path}/", data=body,
                                     headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                print(f"  added  {code}  {name}  (id {json.load(r)['id']})")
                added += 1
        except urllib.error.HTTPError as e:
            print(f"  FAILED {code}: {e.code} {e.read().decode()[:200]}")
    print(f"{path}: {added} added, {skipped} skipped\n")


if __name__ == "__main__":
    print("Seeding minor operations...")
    seed("minor-operations", MINOR)
    print("Seeding major operations...")
    seed("major-operations", MAJOR)
