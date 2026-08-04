import sys
import os
sys.path.append(os.getcwd())
from app.database import engine
from sqlalchemy import text

def fix_mock_patients():
    try:
        with engine.begin() as conn:
            conn.execute(text("""
                UPDATE registration.PatientRegistration
                SET 
                    Country = 'India',
                    OrganDonor = 'No',
                    InsuranceRequired = 'No',
                    RegistrationSource = 'Walk-In',
                    PrivacyConsent = 1,
                    SmsConsent = 1,
                    EmailConsent = 1,
                    WhatsappConsent = 1
                WHERE RegistrationSource IS NULL OR RegistrationSource = '';
            """))
            print("Successfully updated mock patients with valid data for Pydantic validation!")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    fix_mock_patients()
