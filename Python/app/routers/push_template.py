import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.push_template import PushTemplateCreate, PushTemplateUpdate, PushTemplateResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/push-templates", tags=["Push Notification Template Master"])

SP_NAME = "SpMasterPushTemplate"


def _call_sp(db: Session, opt: str, **kw):
    params = {
        "p_Opt":                 opt,
        "p_PushTemplateId":      kw.get("push_template_id"),
        "p_TemplateName":        kw.get("template_name"),
        "p_Module":              kw.get("module"),
        "p_Event":               kw.get("event"),
        "p_NotificationTitle":   kw.get("notification_title"),
        "p_NotificationMessage": kw.get("notification_message"),
        "p_ClickAction":         kw.get("click_action"),
        "p_DeepLinkUrl":         kw.get("deep_link_url"),
        "p_Priority":            kw.get("priority"),
        "p_Status":              kw.get("status"),
        "p_Remarks":             kw.get("remarks"),
        "p_CreatedBy":           kw.get("created_by"),
        "p_UpdatedBy":           kw.get("updated_by"),
        "p_Search":              kw.get("search"),
        "p_ModuleFilter":        kw.get("module_filter"),
        "p_EventFilter":         kw.get("event_filter"),
        "p_StatusFilter":        kw.get("status_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_PushTemplateId, :p_TemplateName, :p_Module, :p_Event,
            :p_NotificationTitle, :p_NotificationMessage, :p_ClickAction, :p_DeepLinkUrl,
            :p_Priority, :p_Status, :p_Remarks, :p_CreatedBy, :p_UpdatedBy, :p_Search,
            :p_ModuleFilter, :p_EventFilter, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _map_row(row) -> dict:
    return {
        "id":                  row.PushTemplateId,
        "templateCode":        row.TemplateCode,
        "templateName":        row.TemplateName,
        "module":              row.Module,
        "event":               row.Event,
        "notificationTitle":   row.NotificationTitle,
        "notificationMessage": row.NotificationMessage,
        "clickAction":         row.ClickAction,
        "deepLinkUrl":         row.DeepLinkUrl,
        "priority":            row.Priority,
        "status":              row.Status,
        "remarks":             row.Remarks,
        "createdBy":           row.CreatedBy,
        "createdDate":         row.CreatedDate,
        "updatedBy":           row.UpdatedBy,
        "updatedDate":         row.UpdatedDate,
    }


def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_TEMPLATE_NAME" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Template Name must be unique")
    if "1062" in msg or "Duplicate entry" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A template with these details already exists")


def _payload_kwargs(payload) -> dict:
    return dict(
        template_name=payload.templateName,
        module=payload.module,
        event=payload.event,
        notification_title=payload.notificationTitle,
        notification_message=payload.notificationMessage,
        click_action=payload.clickAction,
        deep_link_url=payload.deepLinkUrl,
        priority=payload.priority.value,
        status=payload.status.value,
        remarks=payload.remarks,
    )


@router.get("/", response_model=List[PushTemplateResponse])
def get_templates(search: Optional[str] = None, module_filter: Optional[str] = None,
                  event_filter: Optional[str] = None, status_filter: Optional[str] = None,
                  db: Session = Depends(get_db)):
    """Fetch all push notification templates."""
    try:
        rows = _call_sp(db, "GET", search=search, module_filter=module_filter,
                        event_filter=event_filter, status_filter=status_filter).fetchall()
        return [_map_row(r) for r in rows]
    except Exception as e:
        logger.error(f"[GET /push-templates] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch push templates")


@router.get("/next-code")
def get_next_template_code(db: Session = Depends(get_db)):
    """Preview the TemplateCode the next insert would generate (provisional)."""
    try:
        row = _call_sp(db, "NEXTCODE").fetchone()
        return {"templateCode": row.TemplateCode if row else "PNT-001"}
    except Exception as e:
        logger.error(f"[GET /push-templates/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate next template code")


@router.get("/{template_id}", response_model=PushTemplateResponse)
def get_template_by_id(template_id: int, db: Session = Depends(get_db)):
    """Fetch a single push template by ID."""
    try:
        row = _call_sp(db, "GETBYID", push_template_id=template_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Template with ID {template_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /push-templates/{template_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch push template")


@router.post("/", response_model=PushTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template(payload: PushTemplateCreate, db: Session = Depends(get_db)):
    """Create a push template. TemplateCode is auto-generated (PNT-001 format)."""
    try:
        new_id = _call_sp(db, "INSERT", created_by=payload.createdBy or "Admin", **_payload_kwargs(payload)).fetchone().PushTemplateId
        db.commit()
        created = _call_sp(db, "GETBYID", push_template_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /push-templates] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create push template")


@router.put("/{template_id}", response_model=PushTemplateResponse)
def update_template(template_id: int, payload: PushTemplateUpdate, db: Session = Depends(get_db)):
    """Update an existing push template. TemplateCode is immutable."""
    try:
        _call_sp(db, "UPDATE", push_template_id=template_id, updated_by=payload.updatedBy or "Admin", **_payload_kwargs(payload))
        db.commit()
        updated = _call_sp(db, "GETBYID", push_template_id=template_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Template with ID {template_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /push-templates/{template_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update push template")


@router.patch("/{template_id}/toggle-status", response_model=PushTemplateResponse)
def toggle_template_status(template_id: int, db: Session = Depends(get_db)):
    """Toggle template status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", push_template_id=template_id, updated_by="Admin")
        db.commit()
        updated = _call_sp(db, "GETBYID", push_template_id=template_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Template with ID {template_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /push-templates/{template_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to toggle template status")


@router.delete("/{template_id}", status_code=status.HTTP_200_OK)
def delete_template(template_id: int, db: Session = Depends(get_db)):
    """Soft delete a push template (IsDeleted=1)."""
    try:
        _call_sp(db, "DELETE", push_template_id=template_id, updated_by="Admin")
        db.commit()
        return {"message": f"Template {template_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /push-templates/{template_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete push template")
