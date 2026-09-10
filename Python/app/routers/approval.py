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


def _get_pending_approvals_query(db: Session) -> list:
    """
    Fetches all documents that are in a 'pending' state across
    Purchase Requisitions, Purchase Orders, and Purchase Returns.
    """
    results = []

    # ── Purchase Requisitions ──────────────────────────────────────────────────
    # Show PRs that have been submitted but not yet fully approved or rejected.
    try:
        pr_sql = text("""
            SELECT
                pr.PrId          AS OriginalId,
                'Purchase Requisition' AS DocumentType,
                pr.PrNo          AS RefNo,
                pr.RequisitionDate AS Date,
                pr.Department    AS DepartmentOrVendor,
                pr.EstimatedCost AS Amount,
                pr.RequestedBy   AS RequestedBy,
                pr.Priority      AS Priority,
                pr.InventoryType AS InventoryType,
                pr.ApprovalStatus AS Status
            FROM inventory.PurchaseRequisition pr
            WHERE pr.ApprovalStatus IN ('Submitted', 'Pending Approval', 'Pending Department Approval')
            ORDER BY pr.RequisitionDate DESC
        """)
        pr_rows = db.execute(pr_sql).fetchall()
        results.extend(pr_rows)
    except Exception as e:
        logger.warning(f"Could not fetch PR approvals: {e}")

    # ── Purchase Orders ────────────────────────────────────────────────────────
    try:
        po_sql = text("""
            SELECT
                po.PoId          AS OriginalId,
                'Purchase Order' AS DocumentType,
                po.PoNo          AS RefNo,
                po.PoDate        AS Date,
                v.VendorName     AS DepartmentOrVendor,
                po.TotalAmount   AS Amount,
                po.CreatedBy     AS RequestedBy,
                'Normal'         AS Priority,
                NULL             AS InventoryType,
                po.Status        AS Status
            FROM inventory.PurchaseOrder po
            LEFT JOIN inventory.Vendor v ON v.VendorId = po.VendorId
            WHERE po.Status IN ('Submitted', 'Pending Approval')
            ORDER BY po.PoDate DESC
        """)
        po_rows = db.execute(po_sql).fetchall()
        results.extend(po_rows)
    except Exception as e:
        logger.warning(f"Could not fetch PO approvals: {e}")

    # ── Purchase Returns ───────────────────────────────────────────────────────
    try:
        ret_sql = text("""
            SELECT
                pr.ReturnId      AS OriginalId,
                'Purchase Return' AS DocumentType,
                pr.ReturnNo      AS RefNo,
                pr.ReturnDate    AS Date,
                v.VendorName     AS DepartmentOrVendor,
                pr.TotalAmount   AS Amount,
                pr.CreatedBy     AS RequestedBy,
                'Normal'         AS Priority,
                NULL             AS InventoryType,
                pr.Status        AS Status
            FROM inventory.PurchaseReturn pr
            LEFT JOIN inventory.Vendor v ON v.VendorId = pr.VendorId
            WHERE pr.Status IN ('Submitted', 'Pending Approval')
            ORDER BY pr.ReturnDate DESC
        """)
        ret_rows = db.execute(ret_sql).fetchall()
        results.extend(ret_rows)
    except Exception as e:
        logger.warning(f"Could not fetch Purchase Return approvals: {e}")

    return results


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
        "inventoryType": row.InventoryType if hasattr(row, 'InventoryType') else None,
        "status": row.Status
    }


@router.get("/", response_model=List[ApprovalRecordResponse])
def get_pending_approvals(db: Session = Depends(get_db)):
    try:
        rows = _get_pending_approvals_query(db)
        return [_map_row(r) for r in rows]
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
        new_status = payload.status  # 'Approved' or 'Rejected'

        if doc_type == "Purchase Requisition":
            # Determine the next stage
            current_stage = "Approved" if new_status == "Approved" else "Rejected"
            sql = text("""
                UPDATE inventory.PurchaseRequisition
                SET ApprovalStatus = :status,
                    CurrentStage   = :stage
                WHERE PrId = :record_id
            """)
            db.execute(sql, {"status": new_status, "stage": current_stage, "record_id": record_id})

        elif doc_type == "Purchase Order":
            sql = text("""
                UPDATE inventory.PurchaseOrder
                SET Status = :status
                WHERE PoId = :record_id
            """)
            db.execute(sql, {"status": new_status, "record_id": record_id})

        elif doc_type == "Purchase Return":
            sql = text("""
                UPDATE inventory.PurchaseReturn
                SET Status = :status
                WHERE ReturnId = :record_id
            """)
            db.execute(sql, {"status": new_status, "record_id": record_id})

        else:
            raise HTTPException(status_code=400, detail=f"Unknown document type: {doc_type}")

        db.commit()
        return {"id": record_id, "message": f"{doc_type} {record_id} has been {new_status}"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating approval status for {document_type} {record_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
