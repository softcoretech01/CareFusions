import re

FILE_PATH = "main.py"
with open(FILE_PATH, "r", encoding="utf-8") as f:
    content = f.read()

# Add import
content = re.sub(
    r"(patient_registration, quick_registration, emergency_registration, patient_documents\n\))",
    r"patient_registration, quick_registration, emergency_registration, patient_documents,\n    patient_visit\n)",
    content
)

# Add router inclusion
content = re.sub(
    r"(app.include_router\(patient_documents.router,      prefix=\"/api/v1\"\)\n)",
    r"\1app.include_router(patient_visit.router,          prefix=\"/api/v1\")\n",
    content
)

with open(FILE_PATH, "w", encoding="utf-8") as f:
    f.write(content)
print("Registered patient_visit in main.py")
