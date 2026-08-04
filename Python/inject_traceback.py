import re

FILE_PATH = "app/routers/patient_registration.py"
with open(FILE_PATH, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the generic 500 error handling with traceback printing
old_except = """
    except Exception as e:
        logger.error(f"[GET /patients/] Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch patients")
"""

new_except = """
    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error(f"[GET /patients/] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
"""

content = content.replace(old_except.strip(), new_except.strip())

with open(FILE_PATH, "w", encoding="utf-8") as f:
    f.write(content)
print("Injected traceback printing into get_all_patients API")
