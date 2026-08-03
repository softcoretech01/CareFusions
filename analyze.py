import os

routers_dir = "d:/HMS-APP/03AugCare/CareFusions/Python/app/routers"
frontend_dir = "d:/HMS-APP/03AugCare/CareFusions/frontend/src/pages/admin"

# Get list of python routers
routers = [f for f in os.listdir(routers_dir) if f.endswith(".py") and f != "__init__.py"]

# Check for router presence of /next-code
router_has_next_code = {}
for r in routers:
    with open(os.path.join(routers_dir, r), "r", encoding="utf-8") as f:
        content = f.read()
        router_has_next_code[r.replace('.py', '')] = '"/next-code"' in content

# Find all TSX files and check if they fetch next-code or use records.length/Math.max
frontend_files = []
for root, dirs, files in os.walk(frontend_dir):
    for file in files:
        if file.endswith(".tsx"):
            frontend_files.append(os.path.join(root, file))

frontend_status = {}
for f in frontend_files:
    with open(f, "r", encoding="utf-8") as file:
        content = file.read()
        has_fetch = "fetch(" in content and "next-code" in content
        has_math_max = "Math.max" in content and "records.length" in content
        has_length_plus_1 = "records.length + 1" in content
        frontend_status[os.path.basename(f)] = {
            "fetch_next_code": has_fetch,
            "local_math_max": has_math_max,
            "local_length_plus_1": has_length_plus_1
        }

print("ROUTERS MISSING NEXT-CODE:")
for k, v in router_has_next_code.items():
    if not v:
        print(f" - {k}")

print("\nFRONTEND TSX WITH LOCAL ID GEN (Needs Update to Fetch Backend):")
for k, v in frontend_status.items():
    if v["local_math_max"] or v["local_length_plus_1"]:
        print(f" - {k}")

print("\nFRONTEND TSX MISSING ID GEN ENTIRELY (Like HospitalMaster):")
for k, v in frontend_status.items():
    if not v["fetch_next_code"] and not v["local_math_max"] and not v["local_length_plus_1"]:
        # Exclude dashboard/login etc
        if "Master" in k:
            print(f" - {k}")

