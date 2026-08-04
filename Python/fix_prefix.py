import re

FILE_PATH = "app/routers/patient_visit.py"
with open(FILE_PATH, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('prefix="/api/v1/visits"', 'prefix="/visits"')

with open(FILE_PATH, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed prefix in patient_visit.py")
