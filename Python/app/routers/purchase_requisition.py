import logging
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.purchase_requisition import (
    PurchaseRequisitionCreate,
    PurchaseRequisitionUpdate,
    PurchaseRequisitionResponse
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/purchase-requisitions", tags=["Procurement"])

SP_NAME = "inventory.SpManagePurchaseRequisition"

def _call_sp(db: Session, action: str, **kwargs):
    items_json = None
    if kwargs.get("items"):
        # serialize pydantic models to dict, then to json string
        items_dict_list = [item.dict() for item in kwargs.get("items")]
        items_json = json.dumps(items_dict_list)

    params = {
        "p_Action": action,
        "p_PrId": kwargs.get("pr_id"),
        "p_PrNo": kwargs.get("pr_no"),
        "p_RequisitionDate": kwargs.get("requisition_date"),
        "p_Department": kwargs.get("department"),
        # Added to the SP after this router was written.
        "p_InventoryType": kwargs.get("inventory_type"),
        "p_RequestedBy": kwargs.get("requested_by"),
        "p_Priority": kwargs.get("priority"),
        "p_RequiredDate": kwargs.get("required_date"),
        "p_Purpose": kwargs.get("purpose"),
        "p_Remarks": kwargs.get("remarks"),
        "p_TotalItems": kwargs.get("total_items"),
        "p_EstimatedCost": kwargs.get("estimated_cost"),
        "p_ApprovalStatus": kwargs.get("approval_status"),
        "p_CurrentStage": kwargs.get("current_stage"),
        "p_CreatedBy": kwargs.get("created_by"),
        "p_ItemsJSON": items_json
    }

    sql = text(f"""
        CALL {SP_NAME}(
            :p_Action, :p_PrId, :p_PrNo, :p_RequisitionDate, :p_Department, :p_InventoryType,
            :p_RequestedBy, :p_Priority,
            :p_RequiredDate, :p_Purpose, :p_Remarks, :p_TotalItems, :p_EstimatedCost,
            :p_ApprovalStatus, :p_CurrentStage, :p_CreatedBy, :p_ItemsJSON
        )
    """)
    return db.execute(sql, params)

def _map_pr_row(row) -> dict:
    return {
        "id": row.PrId,
        "prNo": row.PrNo,
        "requisitionDate": row.RequisitionDate,
        "department": row.Department,
        "requestedBy": row.RequestedBy,
        "priority": row.Priority,
        "requiredDate": row.RequiredDate,
        "purpose": row.Purpose,
        "remarks": row.Remarks,
        "totalItems": row.TotalItems,
        "estimatedCost": row.EstimatedCost,
        "approvalStatus": row.ApprovalStatus,
        "currentStage": row.CurrentStage,
        "createdBy": row.CreatedBy,
        "items": []
    }

def _map_item_row(row) -> dict:
    return {
        "PrItemId": row.PrItemId,
        "PrId": row.PrId,
        "itemId": row.ItemId,
        "itemCode": row.ItemCode,
        "itemName": row.ItemName,
        "category": row.Category,
        "subCategory": row.SubCategory,
        "availableStock": row.AvailableStock,
        "requestedQty": row.RequestedQty,
        "uom": row.Uom,
        "estimatedPrice": row.EstimatedPrice,
        "estimatedAmount": row.EstimatedAmount,
        "store": row.Store,
        "id": str(row.PrItemId) # frontend uses id as string
    }

@router.get("/", response_model=List[PurchaseRequisitionResponse])
def get_all_prs(db: Session = Depends(get_db)):
    try:
        result = _call_sp(db, "GET_ALL")
        rows = result.fetchall()
        prs = [_map_pr_row(r) for r in rows]
        
        # for a real production system we'd probably query items with a join or fetch them efficiently
        # here we fetch items for each PR using GET_BY_ID in a loop or similar, but the SP GET_ALL just returns PRs.
        # Since we need items in the frontend, let's just leave items empty in list view if the frontend only needs them for details,
        # but wait, the frontend list view uses `record.items.length`, so we should probably populate it.
        # It's better to update GET_ALL to also fetch all items, or we do N+1.
        # For simplicity, we can do N+1 or rely on the fact the frontend uses totalItems.
        # Let's populate items by executing another query for all items.
        
        items_sql = text("SELECT * FROM inventory.PurchaseRequisitionItem")
        items_result = db.execute(items_sql).fetchall()
        items_by_pr = {}
        for item in items_result:
            if item.PrId not in items_by_pr:
                items_by_pr[item.PrId] = []
            items_by_pr[item.PrId].append(_map_item_row(item))
            
        for pr in prs:
            pr["items"] = items_by_pr.get(pr["id"], [])
            
        return prs
    except Exception as e:
        logger.error(f"[GET /purchase-requisitions] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch PRs")

@router.get("/{pr_id}", response_model=PurchaseRequisitionResponse)
def get_pr_by_id(pr_id: int, db: Session = Depends(get_db)):
    try:
        # We need to use raw connections for multiple result sets if SP returns multiple
        # SQLAlchemy cursor execution might not easily fetch next set. 
        # Alternatively, execute two simple SELECTs.
        pr_sql = text("SELECT * FROM inventory.PurchaseRequisition WHERE PrId = :pr_id")
        pr_result = db.execute(pr_sql, {"pr_id": pr_id}).fetchone()
        
        if not pr_result:
            raise HTTPException(status_code=404, detail="PR not found")
            
        pr_data = _map_pr_row(pr_result)
        
        items_sql = text("SELECT * FROM inventory.PurchaseRequisitionItem WHERE PrId = :pr_id")
        items_result = db.execute(items_sql, {"pr_id": pr_id}).fetchall()
        
        pr_data["items"] = [_map_item_row(r) for r in items_result]
        return pr_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /purchase-requisitions/{pr_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch PR")

@router.post("/", response_model=PurchaseRequisitionResponse, status_code=status.HTTP_201_CREATED)
def create_pr(payload: PurchaseRequisitionCreate, db: Session = Depends(get_db)):
    try:
        result = _call_sp(
            db, "CREATE",
            pr_no=payload.prNo,
            requisition_date=payload.requisitionDate,
            department=payload.department,
            requested_by=payload.requestedBy,
            priority=payload.priority,
            required_date=payload.requiredDate,
            purpose=payload.purpose,
            remarks=payload.remarks,
            total_items=payload.totalItems,
            estimated_cost=payload.estimatedCost,
            approval_status=payload.approvalStatus,
            current_stage=payload.currentStage,
            created_by=payload.createdBy,
            items=payload.items
        )
        row = result.fetchone()
        new_id = row.PrId
        db.commit()
        
        return get_pr_by_id(new_id, db)
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /purchase-requisitions] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create PR: {str(e)}")

@router.put("/{pr_id}", response_model=PurchaseRequisitionResponse)
def update_pr(pr_id: int, payload: PurchaseRequisitionUpdate, db: Session = Depends(get_db)):
    try:
        _call_sp(
            db, "UPDATE",
            pr_id=pr_id,
            pr_no=payload.prNo,
            requisition_date=payload.requisitionDate,
            department=payload.department,
            requested_by=payload.requestedBy,
            priority=payload.priority,
            required_date=payload.requiredDate,
            purpose=payload.purpose,
            remarks=payload.remarks,
            total_items=payload.totalItems,
            estimated_cost=payload.estimatedCost,
            approval_status=payload.approvalStatus,
            current_stage=payload.currentStage,
            created_by=payload.createdBy,
            items=payload.items
        )
        db.commit()
        return get_pr_by_id(pr_id, db)
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /purchase-requisitions/{pr_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to update PR: {str(e)}")

@router.delete("/{pr_id}", status_code=status.HTTP_200_OK)
def delete_pr(pr_id: int, db: Session = Depends(get_db)):
    try:
        _call_sp(db, "DELETE", pr_id=pr_id)
        db.commit()
        return {"message": f"PR {pr_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /purchase-requisitions/{pr_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete PR: {str(e)}")
