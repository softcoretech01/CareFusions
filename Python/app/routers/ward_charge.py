from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.database import get_db
from sqlalchemy import text
from datetime import datetime

router = APIRouter()

class WardChargeBase(BaseModel):
    WardType: str
    Charge: float
    Description: Optional[str] = None
    Remarks: Optional[str] = None
    Status: Optional[str] = "Active"

class WardChargeCreate(WardChargeBase):
    pass

class WardChargeUpdate(WardChargeBase):
    pass

class WardChargeResponse(WardChargeBase):
    Id: int
    CreatedBy: Optional[str] = None
    CreatedDate: Optional[datetime] = None

    class Config:
        from_attributes = True

@router.get("/", response_model=List[WardChargeResponse])
def get_ward_charges(db: Session = Depends(get_db)):
    query = text("SELECT * FROM Mst_WardCharge WHERE IsDeleted = 0 ORDER BY Id DESC")
    result = db.execute(query).mappings().all()
    return result

@router.post("/", response_model=WardChargeResponse)
def create_ward_charge(ward_charge: WardChargeCreate, db: Session = Depends(get_db)):
    query = text("""
        INSERT INTO Mst_WardCharge (WardType, Charge, Description, Remarks, Status, CreatedBy, CreatedDate)
        VALUES (:WardType, :Charge, :Description, :Remarks, :Status, 'admin', NOW())
    """)
    result = db.execute(query, {
        "WardType": ward_charge.WardType,
        "Charge": ward_charge.Charge,
        "Description": ward_charge.Description,
        "Remarks": ward_charge.Remarks,
        "Status": ward_charge.Status
    })
    db.commit()
    
    new_id = result.lastrowid
    fetch_query = text("SELECT * FROM Mst_WardCharge WHERE Id = :Id")
    new_record = db.execute(fetch_query, {"Id": new_id}).mappings().first()
    return new_record

@router.put("/{id}", response_model=WardChargeResponse)
def update_ward_charge(id: int, ward_charge: WardChargeUpdate, db: Session = Depends(get_db)):
    fetch_query = text("SELECT * FROM Mst_WardCharge WHERE Id = :Id AND IsDeleted = 0")
    existing = db.execute(fetch_query, {"Id": id}).mappings().first()
    if not existing:
        raise HTTPException(status_code=404, detail="Ward Charge not found")
        
    query = text("""
        UPDATE Mst_WardCharge
        SET WardType = :WardType, Charge = :Charge, Description = :Description,
            Remarks = :Remarks, Status = :Status, UpdatedBy = 'admin', UpdatedDate = NOW()
        WHERE Id = :Id
    """)
    db.execute(query, {
        "Id": id,
        "WardType": ward_charge.WardType,
        "Charge": ward_charge.Charge,
        "Description": ward_charge.Description,
        "Remarks": ward_charge.Remarks,
        "Status": ward_charge.Status
    })
    db.commit()
    
    updated_record = db.execute(fetch_query, {"Id": id}).mappings().first()
    return updated_record

@router.delete("/{id}")
def delete_ward_charge(id: int, db: Session = Depends(get_db)):
    fetch_query = text("SELECT * FROM Mst_WardCharge WHERE Id = :Id AND IsDeleted = 0")
    existing = db.execute(fetch_query, {"Id": id}).mappings().first()
    if not existing:
        raise HTTPException(status_code=404, detail="Ward Charge not found")
        
    query = text("""
        UPDATE Mst_WardCharge
        SET IsDeleted = 1, UpdatedBy = 'admin', UpdatedDate = NOW()
        WHERE Id = :Id
    """)
    db.execute(query, {"Id": id})
    db.commit()
    return {"message": "Ward Charge deleted successfully"}
