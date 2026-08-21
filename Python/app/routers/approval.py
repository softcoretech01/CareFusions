import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from urllib.parse import unquote

from app.database import get_db
from app.schemas.approval import ApprovalRecordResponse, ApprovalStatusUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/approvals", tags=["Procurement - Approvals"])

SP_NAME = "inventory.SpManageApprovals"

def _map_row(row) -> dict:
    prefix = ""
    if row.DocumentType == "Purchase Requisition":
        prefix = "PR"
    elif row.DocumentType == "Purchase Order":
        prefix = "PO"
    elif row.DocumentType == "Purchase Return":
        prefix = "RET"
        
    return {
        "id": f"{prefix}-{row.OriginalId}",
        "originalId": row.OriginalId,
        "documentType": row.DocumentType,
        "refNo": row.RefNo,
        "date": str(row.Date) if row.Date else "",
        "departmentOrVendor": row.DepartmentOrVendor or "",
        "amount": float(row.Amount) if row.Amount else 0.0,
        "requestedBy": row.RequestedBy or "Unknown",
        "priority": row.Priority or "Normal",
        # The inventory type this document covers. NULL means its lines
        # disagree (only possible on legacy documents) - the UI treats that as
        # "mixed" and requires both approval permissions.
        "inventoryType": row.InventoryType,
        "status": row.Status
    }

@router.get("/", response_model=List[ApprovalRecordResponse])
def get_pending_approvals(db: Session = Depends(get_db)):
    try:
        query = text(f"CALL {SP_NAME}('GET_PENDING', NULL, 0, NULL, NULL)")
        results = db.execute(query).fetchall()
        return [_map_row(r) for r in results]
    except Exception as e:
        logger.error(f"Error fetching pending approvals: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{document_type}/{record_id}", response_model=dict)
def update_approval_status(
    document_type: str, 
    record_id: int, 
    payload: ApprovalStatusUpdate, 
    db: Session = Depends(get_db)
):
    try:
        doc_type = unquote(document_type)
        query = text(f"CALL {SP_NAME}('UPDATE_STATUS', :docType, :recordId, :status, 'Admin')")
        result = db.execute(query, {
            "docType": doc_type,
            "recordId": record_id,
            "status": payload.status
        }).fetchone()
        
        db.commit()
        if not result:
            raise HTTPException(status_code=404, detail="Document not found or update failed")
            
        return {"id": result.Id, "message": result.Message}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating approval status for {document_type} {record_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
