from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any
from app.database import get_db
from app.schemas.radiology import RadiologyOrderResponse, RadiologyTestUpdate

router = APIRouter(
    prefix="/radiology/orders",
    tags=["Radiology Orders"]
)

@router.get("", response_model=List[RadiologyOrderResponse])
def get_radiology_orders(db: Session = Depends(get_db)):
    try:
        # Call SpRadOrders with 'SELECT_ALL'
        query = text("CALL hospital.SpRadOrders('SELECT_ALL', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)")
        result = db.execute(query).fetchall()

        orders_dict = {}
        for row in result:
            order_id = row.OrderId
            if order_id not in orders_dict:
                orders_dict[order_id] = {
                    "order_id": order_id,
                    "order_number": row.OrderNumber,
                    "category": row.Category,
                    "visit_type": row.VisitType,
                    "uhid": row.Uhid,
                    "patient_name": row.PatientName,
                    "ordered_by": row.OrderedBy,
                    "ordered_at": row.OrderedAt,
                    "status": row.OrderStatus,
                    "age": str(row.Age) if row.Age is not None else None,
                    "gender": row.Gender,
                    "mobile_number": row.MobileNumber,
                    "tests": []
                }
            
            if row.OrderTestId:
                orders_dict[order_id]["tests"].append({
                    "order_test_id": row.OrderTestId,
                    "test_id": row.TestId,
                    "test_code": row.TestCode,
                    "test_name": row.TestName,
                    "status": row.TestStatus,
                    "result_value": row.ResultValue,
                    "result_file": row.ResultFile,
                    "is_critical": bool(row.IsCritical),
                    "completed_at": row.CompletedAt,
                    "verified_at": row.VerifiedAt,
                    "verified_by": row.VerifiedBy,
                    "acknowledged_at": row.AcknowledgedAt,
                    "acknowledged_by": row.AcknowledgedBy
                })
        
        return list(orders_dict.values())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{order_id}/tests/{test_id}")
def update_radiology_test(order_id: int, test_id: str, test_data: RadiologyTestUpdate, db: Session = Depends(get_db)):
    try:
        # Note: the test_id from frontend is mapped to order_test_id in the DB.
        # But wait, frontend test.id is usually a string like "TEST-001" or the order_test_id.
        # We will assume test_id passed here is order_test_id.
        order_test_id_int = int(test_id.replace("TEST-", "")) if isinstance(test_id, str) and test_id.startswith("TEST-") else int(test_id)
        
        query = text("""
            CALL hospital.SpRadOrders(
                'UPDATE_RESULT', 
                :order_id, 
                :order_test_id, 
                NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
                :result_value, 
                :result_file, 
                :is_critical, 
                NULL, 
                'Admin'
            )
        """)
        
        result = db.execute(query, {
            "order_id": order_id,
            "order_test_id": order_test_id_int,
            "result_value": test_data.result_value,
            "result_file": test_data.result_file,
            "is_critical": 1 if test_data.is_critical else 0
        }).fetchone()
        
        db.commit()
        
        return {"message": "Test updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/tests/{test_id}/acknowledge")
def acknowledge_radiology_alert(test_id: str, db: Session = Depends(get_db)):
    try:
        order_test_id_int = int(test_id.replace("TEST-", "")) if isinstance(test_id, str) and test_id.startswith("TEST-") else int(test_id)
        
        query = text("""
            CALL hospital.SpRadOrders(
                'ACKNOWLEDGE_ALERT', 
                NULL, 
                :order_test_id, 
                NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
                'Admin'
            )
        """)
        
        db.execute(query, {"order_test_id": order_test_id_int})
        db.commit()
        
        return {"message": "Alert acknowledged successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
