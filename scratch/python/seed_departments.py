"""Seed the Department Master with a standard set of clinical departments.

Uses the real create path (admin SpMasterDepartment, p_Opt='INSERT'), so codes
are auto-generated (DPT-###) exactly as the Department Master screen would.
Idempotent: skips any department whose name already exists.

Run from the Python/ directory:  python seed_departments.py
"""
from sqlalchemy import text
from app.database import engine

SP = "SpMasterDepartment"

# Standard hospital clinical departments.
DEPARTMENTS = [
    "General Medicine",
    "General Surgery",
    "Cardiology",
    "Orthopedics",
    "Pediatrics",
    "Obstetrics & Gynaecology",
    "Emergency & Casualty",
    "Operation Theatre",
    "Intensive Care Unit (ICU)",
    "Radiology",
    "Pathology & Laboratory",
    "Anaesthesiology",
    "ENT (Ear, Nose & Throat)",
    "Ophthalmology",
    "Dermatology",
    "Neurology",
    "Nephrology",
    "Urology",
    "Oncology",
    "Dental",
    "Psychiatry",
    "Physiotherapy",
]

CALL = text(f"""
    CALL {SP}(
        :p_Opt, :p_DepartmentId, :p_DepartmentName, :p_DepartmentType,
        :p_Description, :p_DepartmentHead, :p_Status,
        :p_CreatedBy, :p_UpdatedBy, :p_Search, :p_StatusFilter
    )
""")


def base_params():
    return {k: None for k in (
        "p_Opt p_DepartmentId p_DepartmentName p_DepartmentType p_Description "
        "p_DepartmentHead p_Status p_CreatedBy p_UpdatedBy p_Search p_StatusFilter").split()}


def main():
    with engine.begin() as conn:
        # Existing names (case-insensitive) so re-runs don't duplicate.
        p = base_params(); p["p_Opt"] = "GET"
        existing = {r.DepartmentName.strip().lower() for r in conn.execute(CALL, p).fetchall()}
        print(f"existing departments: {len(existing)}")

        added, skipped = 0, 0
        for name in DEPARTMENTS:
            if name.strip().lower() in existing:
                print(f"  skip (exists)   {name}")
                skipped += 1
                continue
            ins = base_params()
            ins.update({
                "p_Opt": "INSERT", "p_DepartmentName": name,
                "p_DepartmentType": "Clinical", "p_Status": "Active",
                "p_CreatedBy": "Seed",
            })
            row = conn.execute(CALL, ins).fetchone()
            new_id = getattr(row, "DepartmentId", None) if row else None
            print(f"  added  #{new_id}  {name}")
            added += 1

        print(f"\nadded {added}, skipped {skipped}")

    # Read-back summary.
    with engine.connect() as conn:
        p = base_params(); p["p_Opt"] = "GET"
        rows = conn.execute(CALL, p).fetchall()
        print(f"\n=== Department Master now ({len(rows)}) ===")
        for r in rows:
            print(f"  {r.DepartmentCode:<10} {r.DepartmentName:<30} {r.DepartmentType:<14} {r.Status}")


if __name__ == "__main__":
    main()
