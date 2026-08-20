import sys
import os
from sqlalchemy import text
from app.database import engine
import re

def main():
    try:
        with engine.connect() as conn:
            sql = text("SHOW CREATE PROCEDURE hospital.SpOpdVisit;")
            result = conn.execute(sql).fetchone()
            sp_code = result[2]
            
            sp_code = sp_code.replace("COALESCE(A.PatientName, P.PatientName) AS patientName", "COALESCE(A.PatientName, P.PatientName, Q.PatientName) AS patientName")
            sp_code = sp_code.replace("P.Age AS age", "COALESCE(P.Age, Q.Age) AS age")
            sp_code = sp_code.replace("P.Gender AS gender", "COALESCE(P.Gender, Q.Gender) AS gender")
            sp_code = sp_code.replace("COALESCE(A.MobileNumber, P.MobileNumber) AS mobileNumber", "COALESCE(A.MobileNumber, P.MobileNumber, Q.MobileNumber) AS mobileNumber")
            
            sp_code = sp_code.replace("LEFT JOIN registration.PatientRegistration P ON A.Uhid = P.Uhid", 
                                      "LEFT JOIN registration.PatientRegistration P ON A.Uhid = P.Uhid\n          LEFT JOIN registration.QuickRegistration Q ON A.Uhid = Q.Uhid")
            
            sp_code = re.sub(r"CREATE DEFINER=`[^`]+`@`[^`]+` PROCEDURE", "CREATE PROCEDURE", sp_code)
            
            drop_sql = text("DROP PROCEDURE IF EXISTS hospital.SpOpdVisit;")
            conn.execute(drop_sql)
            
            create_sql = text(sp_code)
            conn.execute(create_sql)
            conn.commit()
            print("Successfully updated hospital.SpOpdVisit")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
