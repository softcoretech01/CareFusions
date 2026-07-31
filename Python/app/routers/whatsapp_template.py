import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.whatsapp_template import WaTemplateCreate, WaTemplateUpdate, WaTemplateResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/whatsapp-templates", tags=["WhatsApp Template Master"])

SP_NAME = "SpMasterWhatsAppTemplate"


def _call_sp(db: Session, opt: str, **kw):
    params = {
        "p_Opt":                opt,
        "p_WaTemplateId":       kw.get("wa_template_id"),
        "p_TemplateName":       kw.get("template_name"),
        "p_Module":             kw.get("module"),
        "p_Event":              kw.get("event"),
        "p_WhatsAppTemplateId": kw.get("whatsapp_template_id"),
        "p_Language":           kw.get("language"),
        "p_TemplateMessage":    kw.get("template_message"),
        "p_MediaAttachment":    kw.get("media_attachment"),
        "p_Status":             kw.get("status"),
        "p_Remarks":            kw.get("remarks"),
        "p_CreatedBy":          kw.get("created_by"),
        "p_UpdatedBy":          kw.get("updated_by"),
        "p_Search":             kw.get("search"),
        "p_ModuleFilter":       kw.get("module_filter"),
        "p_EventFilter":        kw.get("event_filter"),
        "p_StatusFilter":       kw.get("status_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_WaTemplateId, :p_TemplateName, :p_Module, :p_Event,
            :p_WhatsAppTemplateId, :p_Language, :p_TemplateMessage, :p_MediaAttachment,
            :p_Status, :p_Remarks, :p_CreatedBy, :p_UpdatedBy, :p_Search,
            :p_ModuleFilter, :p_EventFilter, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _map_row(row) -> dict:
    return {
        "id":                 row.WaTemplateId,
        "templateCode":       row.TemplateCode,
        "templateName":       row.TemplateName,
        "module":             row.Module,
        "event":              row.Event,
        "whatsappTemplateId": row.WhatsAppTemplateId,
        "language":           row.Language,
        "templateMessage":    row.TemplateMessage,
        "mediaAttachment":    row.MediaAttachment,
        "status":             row.Status,
        "remarks":            row.Remarks,
        "createdBy":          row.CreatedBy,
        "createdDate":        row.CreatedDate,
        "updatedBy":          row.UpdatedBy,
        "updatedDate":        row.UpdatedDate,
    }


def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_TEMPLATE_NAME" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Template Name must be unique")
    if "DUPLICATE_WA_TEMPLATE_ID" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="WhatsApp Template ID must be unique")
    if "1062" in msg or "Duplicate entry" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A template with these details already exists")


def _payload_kwargs(payload) -> dict:
    return dict(
        template_name=payload.templateName,
        module=payload.module,
        event=payload.event,
        whatsapp_template_id=payload.whatsappTemplateId,
        language=payload.language.value,
        template_message=payload.templateMessage,
        media_attachment=payload.mediaAttachment.value,
        status=payload.status.value,
        remarks=payload.remarks,
    )


@router.get("/", response_model=List[WaTemplateResponse])
def get_templates(search: Optional[str] = None, module_filter: Optional[str] = None,
                  event_filter: Optional[str] = None, status_filter: Optional[str] = None,
                  db: Session = Depends(get_db)):
    """Fetch all WhatsApp templates."""
    try:
        rows = _call_sp(db, "GET", search=search, module_filter=module_filter,
                        event_filter=event_filter, status_filter=status_filter).fetchall()
        return [_map_row(r) for r in rows]
    except Exception as e:
        logger.error(f"[GET /whatsapp-templates] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch WhatsApp templates")


@router.get("/next-code")
def get_next_template_code(db: Session = Depends(get_db)):
    """Preview the TemplateCode the next insert would generate (provisional)."""
    try:
        row = _call_sp(db, "NEXTCODE").fetchone()
        return {"templateCode": row.TemplateCode if row else "WAT-001"}
    except Exception as e:
        logger.error(f"[GET /whatsapp-templates/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate next template code")


@router.get("/{template_id}", response_model=WaTemplateResponse)
def get_template_by_id(template_id: int, db: Session = Depends(get_db)):
    """Fetch a single WhatsApp template by ID."""
    try:
        row = _call_sp(db, "GETBYID", wa_template_id=template_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Template with ID {template_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /whatsapp-templates/{template_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch WhatsApp template")


@router.post("/", response_model=WaTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template(payload: WaTemplateCreate, db: Session = Depends(get_db)):
    """Create a WhatsApp template. TemplateCode is auto-generated (WAT-001 format)."""
    try:
        new_id = _call_sp(db, "INSERT", created_by=payload.createdBy or "Admin", **_payload_kwargs(payload)).fetchone().WaTemplateId
        db.commit()
        created = _call_sp(db, "GETBYID", wa_template_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /whatsapp-templates] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create WhatsApp template")


@router.put("/{template_id}", response_model=WaTemplateResponse)
def update_template(template_id: int, payload: WaTemplateUpdate, db: Session = Depends(get_db)):
    """Update an existing WhatsApp template. TemplateCode is immutable."""
    try:
        _call_sp(db, "UPDATE", wa_template_id=template_id, updated_by=payload.updatedBy or "Admin", **_payload_kwargs(payload))
        db.commit()
        updated = _call_sp(db, "GETBYID", wa_template_id=template_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Template with ID {template_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /whatsapp-templates/{template_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update WhatsApp template")


@router.patch("/{template_id}/toggle-status", response_model=WaTemplateResponse)
def toggle_template_status(template_id: int, db: Session = Depends(get_db)):
    """Toggle template status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", wa_template_id=template_id, updated_by="Admin")
        db.commit()
        updated = _call_sp(db, "GETBYID", wa_template_id=template_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Template with ID {template_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /whatsapp-templates/{template_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to toggle template status")


@router.delete("/{template_id}", status_code=status.HTTP_200_OK)
def delete_template(template_id: int, db: Session = Depends(get_db)):
    """Soft delete a WhatsApp template (IsDeleted=1)."""
    try:
        _call_sp(db, "DELETE", wa_template_id=template_id, updated_by="Admin")
        db.commit()
        return {"message": f"Template {template_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /whatsapp-templates/{template_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete WhatsApp template")
