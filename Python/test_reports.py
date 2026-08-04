import sys
import os
sys.path.append(os.getcwd())
from app.database import engine

def test_reports():
    try:
        conn = engine.raw_connection()
        cursor = conn.cursor()
        
        start_date = "2026-08-04"
        end_date = "2026-08-04"
        
        print("Executing SP...")
        cursor.execute("CALL registration.SpGetRegistrationReports(%s, %s)", (start_date, end_date))
        
        print("Fetching Set 1 (KPIs)...")
        kpi_row = cursor.fetchone()
        print(f"KPIs: {kpi_row}")
        
        print("Fetching Set 2 (Demographics)...")
        has_next = cursor.nextset()
        print(f"Has next? {has_next}")
        demo_rows = cursor.fetchall()
        print(f"Demographics: {demo_rows}")
        
        print("Fetching Set 3 (Trends)...")
        has_next = cursor.nextset()
        print(f"Has next? {has_next}")
        trend_rows = cursor.fetchall()
        print(f"Trends: {trend_rows}")
        
        print("Fetching Set 4 (Recent)...")
        has_next = cursor.nextset()
        print(f"Has next? {has_next}")
        recent_rows = cursor.fetchall()
        print(f"Recent: {recent_rows}")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_reports()
