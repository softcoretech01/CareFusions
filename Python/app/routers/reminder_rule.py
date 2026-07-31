import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.reminder_rule import ReminderRuleCreate, ReminderRuleUpdate, ReminderRuleResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reminder-rules", tags=["Reminder Rule Master"])

SP_NAME = "SpMasterReminderRule"


def _call_sp(db: Session, opt: str, **kw):
    params = {
        "p_Opt":                 opt,
        "p_ReminderRuleId":      kw.get("reminder_rule_id"),
        "p_RuleName":            kw.get("rule_name"),
        "p_Module":              kw.get("module"),
        "p_Event":               kw.get("event"),
        "p_TriggerBefore":       kw.get("trigger_before"),
        "p_NotificationChannel": kw.get("notification_channel"),
        "p_RepeatReminder":      kw.get("repeat_reminder"),
        "p_RepeatFrequency":     kw.get("repeat_frequency"),
        "p_MaxRetryCount":       kw.get("max_retry_count"),
        "p_RecipientPatient":    kw.get("recipient_patient"),
        "p_RecipientDoctor":     kw.get("recipient_doctor"),
        "p_RecipientStaff":      kw.get("recipient_staff"),
        "p_RecipientAttender":   kw.get("recipient_attender"),
        "p_Status":              kw.get("status"),
        "p_Remarks":             kw.get("remarks"),
        "p_CreatedBy":           kw.get("created_by"),
        "p_UpdatedBy":           kw.get("updated_by"),
        "p_Search":              kw.get("search"),
        "p_ModuleFilter":        kw.get("module_filter"),
        "p_ChannelFilter":       kw.get("channel_filter"),
        "p_StatusFilter":        kw.get("status_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_ReminderRuleId, :p_RuleName, :p_Module, :p_Event, :p_TriggerBefore,
            :p_NotificationChannel, :p_RepeatReminder, :p_RepeatFrequency, :p_MaxRetryCount,
            :p_RecipientPatient, :p_RecipientDoctor, :p_RecipientStaff, :p_RecipientAttender,
            :p_Status, :p_Remarks, :p_CreatedBy, :p_UpdatedBy, :p_Search,
            :p_ModuleFilter, :p_ChannelFilter, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _map_row(row) -> dict:
    return {
        "id":                  row.ReminderRuleId,
        "ruleCode":            row.RuleCode,
        "ruleName":            row.RuleName,
        "module":              row.Module,
        "event":               row.Event,
        "triggerBefore":       row.TriggerBefore,
        "notificationChannel": row.NotificationChannel,
        "repeatReminder":      bool(row.RepeatReminder),
        "repeatFrequency":     row.RepeatFrequency,
        "maxRetryCount":       row.MaxRetryCount,
        "recipientPatient":    bool(row.RecipientPatient),
        "recipientDoctor":     bool(row.RecipientDoctor),
        "recipientStaff":      bool(row.RecipientStaff),
        "recipientAttender":   bool(row.RecipientAttender),
        "status":              row.Status,
        "remarks":             row.Remarks,
        "createdBy":           row.CreatedBy,
        "createdDate":         row.CreatedDate,
        "updatedBy":           row.UpdatedBy,
        "updatedDate":         row.UpdatedDate,
    }


def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_RULE_NAME" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Rule Name must be unique")
    if "1062" in msg or "Duplicate entry" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A rule with these details already exists")


def _payload_kwargs(payload) -> dict:
    return dict(
        rule_name=payload.ruleName,
        module=payload.module,
        event=payload.event,
        trigger_before=payload.triggerBefore,
        notification_channel=payload.notificationChannel.value,
        repeat_reminder=int(payload.repeatReminder),
        repeat_frequency=payload.repeatFrequency,
        max_retry_count=payload.maxRetryCount,
        recipient_patient=int(payload.recipientPatient),
        recipient_doctor=int(payload.recipientDoctor),
        recipient_staff=int(payload.recipientStaff),
        recipient_attender=int(payload.recipientAttender),
        status=payload.status.value,
        remarks=payload.remarks,
    )


@router.get("/", response_model=List[ReminderRuleResponse])
def get_rules(search: Optional[str] = None, module_filter: Optional[str] = None,
              channel_filter: Optional[str] = None, status_filter: Optional[str] = None,
              db: Session = Depends(get_db)):
    """Fetch all reminder rules."""
    try:
        rows = _call_sp(db, "GET", search=search, module_filter=module_filter,
                        channel_filter=channel_filter, status_filter=status_filter).fetchall()
        return [_map_row(r) for r in rows]
    except Exception as e:
        logger.error(f"[GET /reminder-rules] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch reminder rules")


@router.get("/next-code")
def get_next_rule_code(db: Session = Depends(get_db)):
    """Preview the RuleCode the next insert would generate (provisional)."""
    try:
        row = _call_sp(db, "NEXTCODE").fetchone()
        return {"ruleCode": row.RuleCode if row else "RR-001"}
    except Exception as e:
        logger.error(f"[GET /reminder-rules/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate next rule code")


@router.get("/{rule_id}", response_model=ReminderRuleResponse)
def get_rule_by_id(rule_id: int, db: Session = Depends(get_db)):
    """Fetch a single reminder rule by ID."""
    try:
        row = _call_sp(db, "GETBYID", reminder_rule_id=rule_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Rule with ID {rule_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /reminder-rules/{rule_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch reminder rule")


@router.post("/", response_model=ReminderRuleResponse, status_code=status.HTTP_201_CREATED)
def create_rule(payload: ReminderRuleCreate, db: Session = Depends(get_db)):
    """Create a reminder rule. RuleCode is auto-generated (RR-001 format)."""
    try:
        new_id = _call_sp(db, "INSERT", created_by=payload.createdBy or "Admin", **_payload_kwargs(payload)).fetchone().ReminderRuleId
        db.commit()
        created = _call_sp(db, "GETBYID", reminder_rule_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /reminder-rules] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create reminder rule")


@router.put("/{rule_id}", response_model=ReminderRuleResponse)
def update_rule(rule_id: int, payload: ReminderRuleUpdate, db: Session = Depends(get_db)):
    """Update an existing reminder rule. RuleCode is immutable."""
    try:
        _call_sp(db, "UPDATE", reminder_rule_id=rule_id, updated_by=payload.updatedBy or "Admin", **_payload_kwargs(payload))
        db.commit()
        updated = _call_sp(db, "GETBYID", reminder_rule_id=rule_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Rule with ID {rule_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /reminder-rules/{rule_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update reminder rule")


@router.patch("/{rule_id}/toggle-status", response_model=ReminderRuleResponse)
def toggle_rule_status(rule_id: int, db: Session = Depends(get_db)):
    """Toggle rule status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", reminder_rule_id=rule_id, updated_by="Admin")
        db.commit()
        updated = _call_sp(db, "GETBYID", reminder_rule_id=rule_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Rule with ID {rule_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /reminder-rules/{rule_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to toggle rule status")


@router.delete("/{rule_id}", status_code=status.HTTP_200_OK)
def delete_rule(rule_id: int, db: Session = Depends(get_db)):
    """Soft delete a reminder rule (IsDeleted=1)."""
    try:
        _call_sp(db, "DELETE", reminder_rule_id=rule_id, updated_by="Admin")
        db.commit()
        return {"message": f"Rule {rule_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /reminder-rules/{rule_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete reminder rule")
