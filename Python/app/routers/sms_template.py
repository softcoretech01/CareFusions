import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.sms_template import SmsTemplateCreate, SmsTemplateUpdate, SmsTemplateResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sms-templates", tags=["SMS Template Master"])

SP_NAME = "SpMasterSmsTemplate"


def _call_sp(db: Session, opt: str, **kw):
    params = {
        "p_Opt":           opt,
        "p_SmsTemplateId": kw.get("sms_template_id"),
        "p_TemplateName":  kw.get("template_name"),
        "p_Module":        kw.get("module"),
        "p_Event":         kw.get("event"),
        "p_Description":   kw.get("description"),
        "p_SmsSubject":    kw.get("sms_subject"),
        "p_SmsContent":    kw.get("sms_content"),
        "p_Status":        kw.get("status"),
        "p_Remarks":       kw.get("remarks"),
        "p_CreatedBy":     kw.get("created_by"),
        "p_UpdatedBy":     kw.get("updated_by"),
        "p_Search":        kw.get("search"),
        "p_ModuleFilter":  kw.get("module_filter"),
        "p_EventFilter":   kw.get("event_filter"),
        "p_StatusFilter":  kw.get("status_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_SmsTemplateId, :p_TemplateName, :p_Module, :p_Event,
            :p_Description, :p_SmsSubject, :p_SmsContent, :p_Status, :p_Remarks,
            :p_CreatedBy, :p_UpdatedBy, :p_Search, :p_ModuleFilter,
            :p_EventFilter, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _map_row(row) -> dict:
    return {
        "id":           row.SmsTemplateId,
        "templateCode": row.TemplateCode,
        "templateName": row.TemplateName,
        "module":       row.Module,
        "event":        row.Event,
        "description":  row.Description,
        "smsSubject":   row.SmsSubject,
        "smsContent":   row.SmsContent,
        "status":       row.Status,
        "remarks":      row.Remarks,
        "createdBy":    row.CreatedBy,
        "createdDate":  row.CreatedDate,
        "updatedBy":    row.UpdatedBy,
        "updatedDate":  row.UpdatedDate,
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
        description=payload.description,
        sms_subject=payload.smsSubject,
        sms_content=payload.smsContent,
        status=payload.status.value,
        remarks=payload.remarks,
    )


@router.get("/", response_model=List[SmsTemplateResponse])
def get_templates(search: Optional[str] = None, module_filter: Optional[str] = None,
                  event_filter: Optional[str] = None, status_filter: Optional[str] = None,
                  db: Session = Depends(get_db)):
    """Fetch all SMS templates."""
    try:
        rows = _call_sp(db, "GET", search=search, module_filter=module_filter,
                        event_filter=event_filter, status_filter=status_filter).fetchall()
        return [_map_row(r) for r in rows]
    except Exception as e:
        logger.error(f"[GET /sms-templates] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch SMS templates")


@router.get("/next-code")
def get_next_template_code(db: Session = Depends(get_db)):
    """Preview the TemplateCode the next insert would generate (provisional)."""
    try:
        row = _call_sp(db, "NEXTCODE").fetchone()
        return {"templateCode": row.TemplateCode if row else "SMS-001"}
    except Exception as e:
        logger.error(f"[GET /sms-templates/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate next template code")


@router.get("/{template_id}", response_model=SmsTemplateResponse)
def get_template_by_id(template_id: int, db: Session = Depends(get_db)):
    """Fetch a single SMS template by ID."""
    try:
        row = _call_sp(db, "GETBYID", sms_template_id=template_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Template with ID {template_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /sms-templates/{template_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch SMS template")


@router.post("/", response_model=SmsTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template(payload: SmsTemplateCreate, db: Session = Depends(get_db)):
    """Create an SMS template. TemplateCode is auto-generated (SMS-001 format)."""
    try:
        new_id = _call_sp(db, "INSERT", created_by=payload.createdBy or "Admin", **_payload_kwargs(payload)).fetchone().SmsTemplateId
        db.commit()
        created = _call_sp(db, "GETBYID", sms_template_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /sms-templates] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create SMS template")


@router.put("/{template_id}", response_model=SmsTemplateResponse)
def update_template(template_id: int, payload: SmsTemplateUpdate, db: Session = Depends(get_db)):
    """Update an existing SMS template. TemplateCode is immutable."""
    try:
        _call_sp(db, "UPDATE", sms_template_id=template_id, updated_by=payload.updatedBy or "Admin", **_payload_kwargs(payload))
        db.commit()
        updated = _call_sp(db, "GETBYID", sms_template_id=template_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Template with ID {template_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /sms-templates/{template_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update SMS template")


@router.patch("/{template_id}/toggle-status", response_model=SmsTemplateResponse)
def toggle_template_status(template_id: int, db: Session = Depends(get_db)):
    """Toggle template status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", sms_template_id=template_id, updated_by="Admin")
        db.commit()
        updated = _call_sp(db, "GETBYID", sms_template_id=template_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Template with ID {template_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /sms-templates/{template_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to toggle template status")


@router.delete("/{template_id}", status_code=status.HTTP_200_OK)
def delete_template(template_id: int, db: Session = Depends(get_db)):
    """Soft delete an SMS template (IsDeleted=1)."""
    try:
        _call_sp(db, "DELETE", sms_template_id=template_id, updated_by="Admin")
        db.commit()
        return {"message": f"Template {template_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /sms-templates/{template_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete SMS template")
