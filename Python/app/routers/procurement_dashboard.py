from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from app.database import get_db

from typing import Optional

router = APIRouter(prefix="/procurement-dashboard", tags=["Procurement Dashboard"])

@router.get("")
def get_procurement_dashboard(fromDate: Optional[str] = None, toDate: Optional[str] = None, db=Depends(get_db)):
    try:
        # Call the Stored Procedure
        query = text("CALL `inventory`.`SpGetProcurementDashboard`(:fromDate, :toDate)")
        result = db.execute(query, {"fromDate": fromDate or "", "toDate": toDate or ""}).fetchone()
        
        if result and result[0]:
            import json
            return json.loads(result[0])
            
        return {
            "totalPRs": 0,
            "totalPOs": 0,
            "totalGRNs": 0,
            "totalSpend": 0,
            "spendByCategory": [],
            "topVendors": [],
            "trendSeries": []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
