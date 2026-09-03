from app.database import SessionLocal
from app.routers.ipd import _adm_sp, _map_admission

def test_get_admissions():
    db = SessionLocal()
    try:
        rows = _adm_sp(db, "LIST").fetchall()
        for r in rows:
            print(f"Row {r.AdmissionId}: OperationsData = {r.OperationsData}")
            adm = _map_admission(r)
            print(f"Mapped: {adm['operations']}")
        print("Success mapping admissions!")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_get_admissions()
