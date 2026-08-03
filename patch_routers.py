import os

routers_dir = "d:/HMS-APP/03AugCare/CareFusions/Python/app/routers"

targets = [
    "hospital.py",
    "branch.py",
    "department.py",
    "nurse.py",
    "lab_technician.py",
    "medicine_category.py",
    "consultation_type.py",
    "appointment_status.py",
    "sample_type.py"
]

def patch():
    for t in targets:
        filepath = os.path.join(routers_dir, t)
        if not os.path.exists(filepath):
            print(f"Skipping {t} (not found)")
            continue
            
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
            
        if '"/next-code"' in content:
            print(f"Skipping {t} (already has next-code)")
            continue
            
        # Find SP_NAME
        sp_name_idx = content.find('SP_NAME = "SpMaster')
        if sp_name_idx == -1:
            print(f"Could not find SP_NAME in {t}")
            continue
            
        end_sp_idx = content.find('\n', sp_name_idx)
        
        # Determine the router prefix from the file to use in the fetch path later
        # Actually, the router handles this via its prefix. The route is just /next-code.
        
        code_to_insert = """

# ── GET /next-code ─────────────────────────────────────────
@router.get("/next-code")
def get_next_code(db: Session = Depends(get_db)):
    \"\"\"Fetch the next auto-generated code from the backend.\"\"\"
    try:
        result = _call_sp(db, "GETNEXTCODE")
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=500, detail="Failed to generate next code")
        return {"nextCode": row[0]}
    except Exception as e:
        logger.error(f"[GET /next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch next code")
"""
        new_content = content[:end_sp_idx+1] + code_to_insert + content[end_sp_idx+1:]
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Patched {t}")

if __name__ == "__main__":
    patch()
