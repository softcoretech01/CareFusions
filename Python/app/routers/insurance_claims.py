import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

from app.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/insurance-claims", tags=["Insurance Claims"])

class ClaimUpdate(BaseModel):
    status: str
    settledAmount: float = None
    rejectionReason: str = None

@router.get("/")
def list_claims(status: str = None, uhid: str = None, db: Session = Depends(get_db)):
    """List insurance claims"""
    try:
        query = "SELECT * FROM Billing_InsuranceClaim WHERE IsDeleted = 0"
        params = {}
        if status:
            query += " AND Status = :status"
            params["status"] = status
        if uhid:
            query += " AND UHID = :uhid"
            params["uhid"] = uhid
            
        rows = db.execute(text(query), params).fetchall()
        return [{
            "claimId": r.ClaimId,
            "claimNo": r.ClaimNo,
            "serviceOrderId": r.ServiceOrderId,
            "uhid": r.UHID,
            "claimAmount": float(r.ClaimAmount),
            "status": r.Status,
            "claimDate": r.ClaimDate.isoformat() if r.ClaimDate else None,
            "submissionDate": r.SubmissionDate.isoformat() if r.SubmissionDate else None,
            "settlementDate": r.SettlementDate.isoformat() if r.SettlementDate else None,
            "settledAmount": float(r.SettledAmount) if r.SettledAmount is not None else None,
            "rejectionReason": r.RejectionReason or ""
        } for r in rows]
    except Exception as e:
        logger.error(f"[GET /insurance-claims] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch claims")


@router.put("/{claim_id}")
def update_claim(claim_id: int, payload: ClaimUpdate, db: Session = Depends(get_db)):
    """Update claim status (SUBMITTED, SETTLED, REJECTED)"""
    try:
        claim = db.execute(text("SELECT * FROM Billing_InsuranceClaim WHERE ClaimId = :id AND IsDeleted = 0"), {"id": claim_id}).fetchone()
        if not claim:
            raise HTTPException(status_code=404, detail="Claim not found")
            
        update_query = "UPDATE Billing_InsuranceClaim SET Status = :status, UpdatedAt = NOW()"
        params = {"status": payload.status, "id": claim_id}
        
        if payload.status == 'SUBMITTED':
            update_query += ", SubmissionDate = NOW()"
        elif payload.status == 'SETTLED':
            update_query += ", SettlementDate = NOW(), SettledAmount = :amount"
            params["amount"] = payload.settledAmount or claim.ClaimAmount
        elif payload.status == 'REJECTED':
            update_query += ", RejectionReason = :reason"
            params["reason"] = payload.rejectionReason or ""
            
        update_query += " WHERE ClaimId = :id"
        db.execute(text(update_query), params)
        db.commit()
        return {"message": f"Claim status updated to {payload.status}"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /insurance-claims/{claim_id}] {e}")
        raise HTTPException(status_code=500, detail="Failed to update claim")
