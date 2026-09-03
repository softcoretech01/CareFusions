import re

FILE_PATH = "app/routers/patient_registration.py"
with open(FILE_PATH, "r", encoding="utf-8") as f:
    content = f.read()

reports_api = """
@router.get("/reports")
def get_registration_reports(start_date: str = None, end_date: str = None, db: Session = Depends(get_db)):
    \"\"\"Get analytics data for Registration Reports.\"\"\"
    try:
        conn = db.connection()
        cursor = conn.connection.cursor()
        
        # Execute Stored Procedure
        cursor.execute("CALL registration.SpGetRegistrationReports(%s, %s)", (start_date, end_date))
        
        # 1. KPIs
        kpi_row = cursor.fetchone()
        kpis = {
            "totalRegistrations": kpi_row[0] if kpi_row else 0,
            "opPatients": kpi_row[1] if kpi_row else 0,
            "emergencyPatients": kpi_row[2] if kpi_row else 0,
            "ipPatients": kpi_row[3] if kpi_row else 0
        }
        
        # 2. Demographics
        cursor.nextset()
        demo_rows = cursor.fetchall()
        demographics = {row[0]: row[1] for row in demo_rows}
        
        # 3. Trends
        cursor.nextset()
        trend_rows = cursor.fetchall()
        trends = [{"date": row[0].isoformat() if row[0] else "", "count": row[1]} for row in trend_rows]
        
        # 4. Recent Registrations
        cursor.nextset()
        recent_rows = cursor.fetchall()
        recent = []
        for row in recent_rows:
            recent.append({
                "uhid": row[0],
                "patientName": row[1],
                "registrationDate": row[2].isoformat() if row[2] else "",
                "patientType": row[3],
                "status": row[4]
            })
            
        cursor.close()
        
        return {
            "kpis": kpis,
            "demographics": demographics,
            "trends": trends,
            "recent": recent
        }
    except Exception as e:
        logger.error(f"Error fetching registration reports: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

"""

content = content.replace(
    "@router.get(\"/\", response_model=List[PatientRegistrationResponse])\ndef get_all_patients",
    reports_api + "@router.get(\"/\", response_model=List[PatientRegistrationResponse])\ndef get_all_patients"
)

with open(FILE_PATH, "w", encoding="utf-8") as f:
    f.write(content)
print("Successfully added /reports API endpoint")
