import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.email_template import EmailTemplateCreate, EmailTemplateUpdate, EmailTemplateResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/email-templates", tags=["Email Template Master"])

SP_NAME = "SpMasterEmailTemplate"


def _call_sp(db: Session, opt: str, **kw):
    params = {
        "p_Opt":               opt,
        "p_EmailTemplateId":   kw.get("email_template_id"),
        "p_TemplateName":      kw.get("template_name"),
        "p_Module":            kw.get("module"),
        "p_Event":             kw.get("event"),
        "p_EmailSubject":      kw.get("email_subject"),
        "p_EmailBody":         kw.get("email_body"),
        "p_AttachmentAllowed": kw.get("attachment_allowed"),
        "p_AttachmentType":    kw.get("attachment_type"),
        "p_Status":            kw.get("status"),
        "p_Remarks":           kw.get("remarks"),
        "p_CreatedBy":         kw.get("created_by"),
        "p_UpdatedBy":         kw.get("updated_by"),
        "p_Search":            kw.get("search"),
        "p_ModuleFilter":      kw.get("module_filter"),
        "p_EventFilter":       kw.get("event_filter"),
        "p_StatusFilter":      kw.get("status_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_EmailTemplateId, :p_TemplateName, :p_Module, :p_Event,
            :p_EmailSubject, :p_EmailBody, :p_AttachmentAllowed, :p_AttachmentType,
            :p_Status, :p_Remarks, :p_CreatedBy, :p_UpdatedBy, :p_Search,
            :p_ModuleFilter, :p_EventFilter, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _map_row(row) -> dict:
    return {
        "id":                row.EmailTemplateId,
        "templateCode":      row.TemplateCode,
        "templateName":      row.TemplateName,
        "module":            row.Module,
        "event":             row.Event,
        "emailSubject":      row.EmailSubject,
        "emailBody":         row.EmailBody,
        "attachmentAllowed": bool(row.AttachmentAllowed),
        "attachmentType":    row.AttachmentType,
        "status":            row.Status,
        "remarks":           row.Remarks,
        "createdBy":         row.CreatedBy,
        "createdDate":       row.CreatedDate,
        "updatedBy":         row.UpdatedBy,
        "updatedDate":       row.UpdatedDate,
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
        email_subject=payload.emailSubject,
        email_body=payload.emailBody,
        attachment_allowed=int(payload.attachmentAllowed),
        attachment_type=payload.attachmentType,
        status=payload.status.value,
        remarks=payload.remarks,
    )


@router.get("/", response_model=List[EmailTemplateResponse])
def get_templates(search: Optional[str] = None, module_filter: Optional[str] = None,
                  event_filter: Optional[str] = None, status_filter: Optional[str] = None,
                  db: Session = Depends(get_db)):
    """Fetch all email templates."""
    try:
        rows = _call_sp(db, "GET", search=search, module_filter=module_filter,
                        event_filter=event_filter, status_filter=status_filter).fetchall()
        return [_map_row(r) for r in rows]
    except Exception as e:
        logger.error(f"[GET /email-templates] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch email templates")


@router.get("/next-code")
def get_next_template_code(db: Session = Depends(get_db)):
    """Preview the TemplateCode the next insert would generate (provisional)."""
    try:
        row = _call_sp(db, "NEXTCODE").fetchone()
        return {"templateCode": row.TemplateCode if row else "EML-001"}
    except Exception as e:
        logger.error(f"[GET /email-templates/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate next template code")


@router.get("/{template_id}", response_model=EmailTemplateResponse)
def get_template_by_id(template_id: int, db: Session = Depends(get_db)):
    """Fetch a single email template by ID."""
    try:
        row = _call_sp(db, "GETBYID", email_template_id=template_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Template with ID {template_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /email-templates/{template_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch email template")


@router.post("/", response_model=EmailTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template(payload: EmailTemplateCreate, db: Session = Depends(get_db)):
    """Create an email template. TemplateCode is auto-generated (EML-001 format)."""
    try:
        new_id = _call_sp(db, "INSERT", created_by=payload.createdBy or "Admin", **_payload_kwargs(payload)).fetchone().EmailTemplateId
        db.commit()
        created = _call_sp(db, "GETBYID", email_template_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /email-templates] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create email template")


@router.put("/{template_id}", response_model=EmailTemplateResponse)
def update_template(template_id: int, payload: EmailTemplateUpdate, db: Session = Depends(get_db)):
    """Update an existing email template. TemplateCode is immutable."""
    try:
        _call_sp(db, "UPDATE", email_template_id=template_id, updated_by=payload.updatedBy or "Admin", **_payload_kwargs(payload))
        db.commit()
        updated = _call_sp(db, "GETBYID", email_template_id=template_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Template with ID {template_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /email-templates/{template_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update email template")


@router.patch("/{template_id}/toggle-status", response_model=EmailTemplateResponse)
def toggle_template_status(template_id: int, db: Session = Depends(get_db)):
    """Toggle template status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", email_template_id=template_id, updated_by="Admin")
        db.commit()
        updated = _call_sp(db, "GETBYID", email_template_id=template_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Template with ID {template_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /email-templates/{template_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to toggle template status")


@router.delete("/{template_id}", status_code=status.HTTP_200_OK)
def delete_template(template_id: int, db: Session = Depends(get_db)):
    """Soft delete an email template (IsDeleted=1)."""
    try:
        _call_sp(db, "DELETE", email_template_id=template_id, updated_by="Admin")
        db.commit()
        return {"message": f"Template {template_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /email-templates/{template_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete email template")
