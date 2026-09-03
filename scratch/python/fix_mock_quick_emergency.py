import sys
import os
sys.path.append(os.getcwd())
from app.database import engine
from sqlalchemy import text

def fix_mock_data():
    try:
        with engine.begin() as conn:
            # Fix QuickRegistration missing enum fields
            conn.execute(text("""
                UPDATE registration.QuickRegistration
                SET 
                    VisitType = 'Walk-In',
                    Priority = 'Normal',
                    ConsultationRequired = 'Yes',
                    PaymentMode = 'Cash',
                    InsuranceRequired = 'No'
                WHERE VisitType IS NULL OR VisitType = '';
            """))
            print("Successfully updated mock Quick Registrations with all remaining required fields!")
            
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    fix_mock_data()
