from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any
import json
from app.database import get_db
from app.schemas.lab import (
    LabOrderResponse, 
    LabOrderCreate, 
    LabTestUpdateResult, 
    LabTestUpdateStatus
)

router = APIRouter(
    prefix="/lab/orders",
    tags=["Lab Orders"]
)

@router.get("", response_model=List[LabOrderResponse])
def get_lab_orders(category: str = None, uhid: str = None, from_date: str = None, to_date: str = None, db: Session = Depends(get_db)):
    try:
        # Fetch orders
        order_query = text("CALL hospital.SpLabOrder('LIST', NULL, NULL, :category, NULL, :uhid, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, :from_date, :to_date, 'Admin')")
        orders_result = db.execute(order_query, {
            "category": category,
            "uhid": uhid,
            "from_date": from_date,
            "to_date": to_date
        }).fetchall()
        
        # We need to exhaust the result sets or close the cursor to call another SP immediately,
        # but let's fetch them into a dictionary first
        
        orders_dict = {}
        for row in orders_result:
            order_id = row.OrderId
            orders_dict[order_id] = {
                "order_id": order_id,
                "order_number": row.OrderNumber,
                "category": row.Category,
                "visit_type": row.VisitType,
                "uhid": row.Uhid,
                "patient_name": row.PatientName,
                "ordered_by": row.OrderedBy,
                "ordered_at": row.OrderedAt,
                "priority": row.Priority,
                "clinical_notes": row.ClinicalNotes,
                "status": row.Status,
                # we don't have age/gender/mobile in Lab_Order table right now, would need a join if required
                "age": None,
                "gender": None,
                "mobile_number": None,
                "tests": []
            }
            
        # Due to how SQLAlchemy handles multiple result sets or cursors, 
        # it's best to start a new query execution block or just ensure result is fully consumed
        # which it is by fetchall()
            
        # Fetch tests
        test_query = text("CALL hospital.SpLabOrder('LISTTESTS', NULL, NULL, :category, NULL, :uhid, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, :from_date, :to_date, 'Admin')")
        tests_result = db.execute(test_query, {
            "category": category,
            "uhid": uhid,
            "from_date": from_date,
            "to_date": to_date
        }).fetchall()
        
        for row in tests_result:
            order_id = row.OrderId
            if order_id in orders_dict:
                orders_dict[order_id]["tests"].append({
                    "order_test_id": row.OrderTestId,
                    "test_id": row.TestId,
                    "test_code": row.TestCode,
                    "test_name": row.TestName,
                    "normal_range": row.NormalRange,
                    "unit": row.Unit,
                    "status": row.Status,
                    "result_value": row.ResultValue,
                    "result_file": row.ResultFile,
                    "is_abnormal": bool(row.IsAbnormal) if row.IsAbnormal is not None else False,
                    "is_critical": bool(row.IsCritical) if row.IsCritical is not None else False,
                    "collected_at": row.CollectedAt,
                    "accepted_at": row.AcceptedAt,
                    "completed_at": row.CompletedAt,
                    "verified_at": row.VerifiedAt,
                    "verified_by": row.VerifiedBy,
                    "acknowledged_at": row.AcknowledgedAt,
                    "acknowledged_by": row.AcknowledgedBy
                })
        
        return list(orders_dict.values())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=Dict[str, Any])
def create_lab_order(order_data: LabOrderCreate, db: Session = Depends(get_db)):
    try:
        # Convert tests to JSON string as expected by SpLabOrder
        tests_json = json.dumps([t.dict() for t in order_data.tests])
        
        query = text("""
            CALL hospital.SpLabOrder(
                'CREATE', 
                NULL, 
                NULL, 
                :category, 
                :visit_type, 
                :uhid, 
                :patient_name, 
                :ordered_by, 
                :priority, 
                :clinical_notes, 
                NULL, 
                NULL, 
                NULL, 
                NULL, 
                NULL, 
                :tests_json, 
                NULL, 
                NULL, 
                'Admin'
            )
        """)
        
        result = db.execute(query, {
            "category": order_data.category,
            "visit_type": order_data.visit_type,
            "uhid": order_data.uhid,
            "patient_name": order_data.patient_name,
            "ordered_by": order_data.ordered_by,
            "priority": order_data.priority,
            "clinical_notes": order_data.clinical_notes,
            "tests_json": tests_json
        }).fetchone()
        
        db.commit()
        
        if result:
            return {"order_id": result.OrderId, "order_number": result.OrderNumber}
        return {"message": "Order created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/tests/{test_id}/result")
def update_lab_test_result(test_id: str, test_data: LabTestUpdateResult, db: Session = Depends(get_db)):
    try:
        order_test_id_int = int(test_id.replace("TEST-", "")) if isinstance(test_id, str) and test_id.startswith("TEST-") else int(test_id)
        
        query = text("""
            CALL hospital.SpLabOrder(
                'SETRESULT', 
                NULL, 
                :order_test_id, 
                NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
                :result_value, 
                :result_file, 
                :is_abnormal, 
                :is_critical, 
                NULL, NULL, NULL, 
                'Admin'
            )
        """)
        
        db.execute(query, {
            "order_test_id": order_test_id_int,
            "result_value": test_data.result_value,
            "result_file": test_data.result_file,
            "is_abnormal": 1 if test_data.is_abnormal else 0,
            "is_critical": 1 if test_data.is_critical else 0
        })
        
        db.commit()
        return {"message": "Test result updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/tests/{test_id}/status")
def update_lab_test_status(test_id: str, test_data: LabTestUpdateStatus, db: Session = Depends(get_db)):
    try:
        order_test_id_int = int(test_id.replace("TEST-", "")) if isinstance(test_id, str) and test_id.startswith("TEST-") else int(test_id)
        
        query = text("""
            CALL hospital.SpLabOrder(
                'SETSTATUS', 
                NULL, 
                :order_test_id, 
                NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
                :status, 
                NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
                'Admin'
            )
        """)
        
        db.execute(query, {
            "order_test_id": order_test_id_int,
            "status": test_data.status
        })
        
        db.commit()
        return {"message": "Test status updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/tests/{test_id}/verify")
def verify_lab_test(test_id: str, db: Session = Depends(get_db)):
    try:
        order_test_id_int = int(test_id.replace("TEST-", "")) if isinstance(test_id, str) and test_id.startswith("TEST-") else int(test_id)
        
        query = text("""
            CALL hospital.SpLabOrder(
                'VERIFY', 
                NULL, 
                :order_test_id, 
                NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
                'Admin'
            )
        """)
        
        db.execute(query, {
            "order_test_id": order_test_id_int
        })
        
        db.commit()
        return {"message": "Test verified successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
