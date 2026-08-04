import re

FILE_PATH = "app/schemas/patient_registration.py"
with open(FILE_PATH, "r", encoding="utf-8") as f:
    content = f.read()

# Replace AlternateMobile
content = content.replace(
    'AlternateMobile: Optional[str] = Field(None, max_length=10)',
    'AlternateMobile: Optional[str] = Field(None, min_length=10, max_length=10, pattern=r"^\\d{10}$")'
)

# Replace EmergencyMobile
content = content.replace(
    'EmergencyMobile: Optional[str] = Field(None, max_length=10)',
    'EmergencyMobile: Optional[str] = Field(None, min_length=10, max_length=10, pattern=r"^\\d{10}$")'
)

# Replace EmergencyAlternateMobile
content = content.replace(
    'EmergencyAlternateMobile: Optional[str] = Field(None, max_length=10)',
    'EmergencyAlternateMobile: Optional[str] = Field(None, min_length=10, max_length=10, pattern=r"^\\d{10}$")'
)

with open(FILE_PATH, "w", encoding="utf-8") as f:
    f.write(content)
print("Added regex pattern validation to all mobile number fields in schemas.")
