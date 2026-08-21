"""Insurance API — eligibility, pre-authorisation, claims, appeals, settlements.

Backed by the hospital.SpIns* procedures. Providers and TPAs come from the
admin masters; policies and all transactional records live in the hospital
schema. Denying a claim raises its appeal and settling one raises its
settlement, both inside the stored procedures.
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.insurance import (
    PolicyUpsert, PreAuthCreate, PreAuthUpdate, PreAuthStatusUpdate,
    ClaimCreate, ClaimStatusUpdate, AppealFile, AppealResolve, SettlementReconcile,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/insurance", tags=["Insurance"])

_POLICY = ("CALL hospital.SpInsPolicy(:p_Opt, :p_PolicyId, :p_Uhid, :p_PatientName, "
           ":p_PolicyNumber, :p_ProviderId, :p_InsurerName, :p_TpaId, :p_TpaName, :p_PlanName, "
           ":p_Status, :p_ValidUntil, :p_SumInsured, :p_BalanceAmount, :p_NetworkHospital, "
           ":p_CopayPercentage, :p_Deductible, :p_Search, :p_User)")

_PREAUTH = ("CALL hospital.SpInsPreAuth(:p_Opt, :p_PreAuthId, :p_Uhid, :p_PatientName, "
            ":p_ProviderId, :p_InsurerName, :p_Diagnosis, :p_RequestedAmount, :p_ApprovedAmount, "
            ":p_Status, :p_DecisionReason, :p_User)")

_CLAIM = ("CALL hospital.SpInsClaim(:p_Opt, :p_ClaimId, :p_Uhid, :p_PatientName, :p_ProviderId, "
          ":p_InsurerName, :p_PreAuthId, :p_AdmissionId, :p_Diagnosis, :p_BilledAmount, "
          ":p_PreAuthAmount, :p_ClaimedAmount, :p_ApprovedAmount, :p_Status, :p_Reason, "
          ":p_FromDate, :p_ToDate, :p_User)")

_APPEAL = "CALL hospital.SpInsAppeal(:p_Opt, :p_AppealId, :p_AppealReason, :p_ApprovedAmount, :p_Status, :p_User)"
_SETTLE = "CALL hospital.SpInsSettlement(:p_Opt, :p_SettlementId, :p_UtrReference, :p_Status, :p_User)"


def _sp(db: Session, call: str, defaults: dict, opt: str, **kw):
    params = dict(defaults)
    params["p_Opt"] = opt
    params.update({f"p_{k}": v for k, v in kw.items()})
    return db.execute(text(call), params)


_POLICY_D = {k: None for k in (
    "p_Opt p_PolicyId p_Uhid p_PatientName p_PolicyNumber p_ProviderId p_InsurerName p_TpaId "
    "p_TpaName p_PlanName p_Status p_ValidUntil p_SumInsured p_BalanceAmount p_NetworkHospital "
    "p_CopayPercentage p_Deductible p_Search p_User").split()}
_PREAUTH_D = {k: None for k in (
    "p_Opt p_PreAuthId p_Uhid p_PatientName p_ProviderId p_InsurerName p_Diagnosis "
    "p_RequestedAmount p_ApprovedAmount p_Status p_DecisionReason p_User").split()}
_CLAIM_D = {k: None for k in (
    "p_Opt p_ClaimId p_Uhid p_PatientName p_ProviderId p_InsurerName p_PreAuthId p_AdmissionId "
    "p_Diagnosis p_BilledAmount p_PreAuthAmount p_ClaimedAmount p_ApprovedAmount p_Status "
    "p_Reason p_FromDate p_ToDate p_User").split()}
_APPEAL_D = {k: None for k in "p_Opt p_AppealId p_AppealReason p_ApprovedAmount p_Status p_User".split()}
_SETTLE_D = {k: None for k in "p_Opt p_SettlementId p_UtrReference p_Status p_User".split()}


def _iso(v):
    return v.isoformat() if v else None


def _f(v):
    return float(v) if v is not None else None


# ── Row mappers (camelCase, matching the frontend contract) ──
def _map_policy(r) -> dict:
    return {
        "policyId": r.PolicyId, "uhid": r.Uhid, "patientName": r.PatientName,
        "policyNumber": r.PolicyNumber, "providerId": r.ProviderId, "insurerName": r.InsurerName,
        "tpaId": r.TpaId, "tpaName": r.TpaName or "", "planName": r.PlanName or "",
        "status": r.Status, "validUntil": _iso(r.ValidUntil),
        "sumInsured": _f(r.SumInsured), "balanceAmount": _f(r.BalanceAmount),
        "networkHospital": bool(r.NetworkHospital),
        "copayPercentage": _f(r.CopayPercentage), "deductible": _f(r.Deductible),
    }


def _map_preauth(r) -> dict:
    return {
        "id": r.PreAuthNumber, "preAuthId": r.PreAuthId, "uhid": r.Uhid,
        "patient": r.PatientName, "providerId": r.ProviderId, "insurer": r.InsurerName,
        "diagnosis": r.Diagnosis or "", "amount": _f(r.RequestedAmount),
        "approvedAmount": _f(r.ApprovedAmount), "status": r.Status,
        "decisionReason": r.DecisionReason or "",
        "date": _iso(r.RequestDate), "decisionDate": _iso(r.DecisionDate),
    }


def _map_claim(r) -> dict:
    return {
        "id": r.ClaimNumber, "claimId": r.ClaimId, "uhid": r.Uhid, "patient": r.PatientName,
        "providerId": r.ProviderId, "insurer": r.InsurerName,
        "preAuthId": r.PreAuthId, "admissionId": r.AdmissionId,
        "diagnosis": r.Diagnosis or "",
        "amount": _f(r.BilledAmount),            # total billed
        "preAuth": _f(r.PreAuthAmount),
        "claimedAmount": _f(r.ClaimedAmount),
        "approvedAmount": _f(r.ApprovedAmount),
        "balance": _f(r.BalanceAmount),
        "status": r.Status, "denialReason": r.DenialReason or "",
        "date": _iso(r.ClaimDate), "settledDate": _iso(r.SettledDate),
    }


def _map_appeal(r) -> dict:
    return {
        "id": r.AppealNumber, "appealId": r.AppealId, "claimId": r.ClaimNumber,
        "claimPk": r.ClaimId, "uhid": r.Uhid, "patient": r.PatientName, "insurer": r.InsurerName,
        "amount": _f(r.DeniedAmount), "denialReason": r.DenialReason or "",
        "denialCode": r.DenialCode or "", "appealReason": r.AppealReason or "",
        "status": r.Status, "date": _iso(r.AppealDate or r.CreatedDate),
        "resolvedDate": _iso(r.ResolvedDate),
    }


def _map_settlement(r) -> dict:
    return {
        "id": r.SettlementNumber, "settlementId": r.SettlementId, "claimId": r.ClaimNumber,
        "claimPk": r.ClaimId, "patient": r.PatientName, "insurer": r.InsurerName,
        "billedAmt": _f(r.BilledAmount), "approvedAmt": _f(r.ApprovedAmount),
        "tds": _f(r.TdsAmount), "netReceivable": _f(r.NetReceivable),
        "status": r.Status, "utrReference": r.UtrReference or "",
        "date": _iso(r.SettlementDate), "reconciledDate": _iso(r.ReconciledDate),
    }


# ══════════════════════════ PROVIDER LOOKUP ══════════════════════════
@router.get("/providers")
def list_providers(db: Session = Depends(get_db)):
    """Active insurers, so the pickers are master-driven rather than hardcoded."""
    try:
        rows = db.execute(text(
            "SELECT InsuranceProviderId, ProviderCode, ProviderName, CashlessFacility, "
            "PreAuthRequired, ClaimSettlementDays FROM admin.Master_InsuranceProvider "
            "WHERE IsDeleted = 0 AND Status = 'Active' ORDER BY ProviderName"
        )).fetchall()
        return [{
            "providerId": r.InsuranceProviderId, "providerCode": r.ProviderCode,
            "providerName": r.ProviderName, "cashlessFacility": bool(r.CashlessFacility),
            "preAuthRequired": bool(r.PreAuthRequired),
            "claimSettlementDays": r.ClaimSettlementDays,
        } for r in rows]
    except Exception as e:
        logger.error(f"[GET /insurance/providers] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch providers")


# ══════════════════════════ POLICIES / ELIGIBILITY ══════════════════════════
@router.get("/policies")
def list_policies(db: Session = Depends(get_db)):
    try:
        return [_map_policy(r) for r in _sp(db, _POLICY, _POLICY_D, "LIST").fetchall()]
    except Exception as e:
        logger.error(f"[GET /insurance/policies] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch policies")


@router.get("/policies/search")
def search_policy(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    """Eligibility lookup by UHID or policy number."""
    try:
        row = _sp(db, _POLICY, _POLICY_D, "SEARCH", Search=q).fetchone()
        if not row:
            return None
        return _map_policy(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /insurance/policies/search] {e}")
        raise HTTPException(status_code=500, detail="Failed to search policy")


@router.post("/policies", status_code=201)
def upsert_policy(payload: PolicyUpsert, db: Session = Depends(get_db)):
    try:
        row = _sp(db, _POLICY, _POLICY_D, "UPSERT",
                  Uhid=payload.uhid, PatientName=payload.patientName,
                  PolicyNumber=payload.policyNumber, ProviderId=payload.providerId,
                  InsurerName=payload.insurerName, TpaId=payload.tpaId, TpaName=payload.tpaName,
                  PlanName=payload.planName, Status=payload.status.value,
                  ValidUntil=payload.validUntil or None, SumInsured=payload.sumInsured,
                  BalanceAmount=payload.balanceAmount, NetworkHospital=int(payload.networkHospital),
                  CopayPercentage=payload.copayPercentage, Deductible=payload.deductible,
                  User=payload.user or "Admin").fetchone()

        db.execute(text("""
            UPDATE registration.PatientRegistration
            SET InsuranceRequired = 'Yes',
                InsuranceProvider = :provider,
                Tpa = :tpa,
                PolicyNumber = :policy_no,
                ValidTill = :valid_till
            WHERE Uhid = :uhid
        """), {
            "provider": payload.insurerName,
            "tpa": payload.tpaName or "",
            "policy_no": payload.policyNumber,
            "valid_till": payload.validUntil or None,
            "uhid": payload.uhid
        })

        # Also update QuickRegistration if the patient was registered quickly
        db.execute(text("""
            UPDATE registration.QuickRegistration
            SET InsuranceRequired = 'Yes'
            WHERE Uhid = :uhid
        """), {"uhid": payload.uhid})

        db.commit()
        return _map_policy(row)
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /insurance/policies] {e}")
        raise HTTPException(status_code=500, detail="Failed to save policy")


@router.put("/policies/{policy_id}")
def update_policy(policy_id: int, payload: PolicyUpsert, db: Session = Depends(get_db)):
    try:
        row = _sp(db, _POLICY, _POLICY_D, "UPSERT", PolicyId=policy_id,
                  Uhid=payload.uhid, PatientName=payload.patientName,
                  PolicyNumber=payload.policyNumber, ProviderId=payload.providerId,
                  InsurerName=payload.insurerName, TpaId=payload.tpaId, TpaName=payload.tpaName,
                  PlanName=payload.planName, Status=payload.status.value,
                  ValidUntil=payload.validUntil or None, SumInsured=payload.sumInsured,
                  BalanceAmount=payload.balanceAmount, NetworkHospital=int(payload.networkHospital),
                  CopayPercentage=payload.copayPercentage, Deductible=payload.deductible,
                  User=payload.user or "Admin").fetchone()

        db.execute(text("""
            UPDATE registration.PatientRegistration
            SET InsuranceRequired = 'Yes',
                InsuranceProvider = :provider,
                Tpa = :tpa,
                PolicyNumber = :policy_no,
                ValidTill = :valid_till
            WHERE Uhid = :uhid
        """), {
            "provider": payload.insurerName,
            "tpa": payload.tpaName or "",
            "policy_no": payload.policyNumber,
            "valid_till": payload.validUntil or None,
            "uhid": payload.uhid
        })

        # Also update QuickRegistration if the patient was registered quickly
        db.execute(text("""
            UPDATE registration.QuickRegistration
            SET InsuranceRequired = 'Yes'
            WHERE Uhid = :uhid
        """), {"uhid": payload.uhid})

        db.commit()
        return _map_policy(row)
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /insurance/policies/{policy_id}] {e}")
        raise HTTPException(status_code=500, detail="Failed to update policy")


@router.delete("/policies/{policy_id}")
def delete_policy(policy_id: int, db: Session = Depends(get_db)):
    try:
        _sp(db, _POLICY, _POLICY_D, "DELETE", PolicyId=policy_id)
        db.commit()
        return {"message": "Policy deleted"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /insurance/policies/{policy_id}] {e}")
        raise HTTPException(status_code=500, detail="Failed to delete policy")


# ══════════════════════════ PRE-AUTHORISATIONS ══════════════════════════
@router.get("/pre-auths")
def list_preauths(status: Optional[str] = None, uhid: Optional[str] = None,
                  db: Session = Depends(get_db)):
    try:
        rows = _sp(db, _PREAUTH, _PREAUTH_D, "LIST", Status=status, Uhid=uhid).fetchall()
        return [_map_preauth(r) for r in rows]
    except Exception as e:
        logger.error(f"[GET /insurance/pre-auths] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch pre-authorisations")


@router.post("/pre-auths", status_code=201)
def create_preauth(payload: PreAuthCreate, db: Session = Depends(get_db)):
    try:
        row = _sp(db, _PREAUTH, _PREAUTH_D, "CREATE",
                  Uhid=payload.uhid, PatientName=payload.patientName,
                  ProviderId=payload.providerId, InsurerName=payload.insurerName,
                  Diagnosis=payload.diagnosis, RequestedAmount=payload.requestedAmount,
                  User=payload.user or "Admin").fetchone()
        db.commit()
        return _map_preauth(row)
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /insurance/pre-auths] {e}")
        raise HTTPException(status_code=500, detail="Failed to create pre-authorisation")


@router.put("/pre-auths/{pre_auth_id}")
def update_preauth(pre_auth_id: int, payload: PreAuthUpdate, db: Session = Depends(get_db)):
    try:
        row = _sp(db, _PREAUTH, _PREAUTH_D, "UPDATE", PreAuthId=pre_auth_id,
                  Uhid=payload.uhid, PatientName=payload.patientName,
                  ProviderId=payload.providerId, InsurerName=payload.insurerName,
                  Diagnosis=payload.diagnosis, RequestedAmount=payload.requestedAmount,
                  Status=payload.status.value if payload.status else None,
                  User=payload.user or "Admin").fetchone()
        db.commit()
        return _map_preauth(row)
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /insurance/pre-auths/{pre_auth_id}] {e}")
        raise HTTPException(status_code=500, detail="Failed to update pre-authorisation")


@router.patch("/pre-auths/{pre_auth_id}/status")
def set_preauth_status(pre_auth_id: int, payload: PreAuthStatusUpdate, db: Session = Depends(get_db)):
    try:
        row = _sp(db, _PREAUTH, _PREAUTH_D, "SETSTATUS", PreAuthId=pre_auth_id,
                  Status=payload.status.value, ApprovedAmount=payload.approvedAmount,
                  DecisionReason=payload.decisionReason, User=payload.user or "Admin").fetchone()
        db.commit()
        return _map_preauth(row)
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /insurance/pre-auths/{pre_auth_id}/status] {e}")
        raise HTTPException(status_code=500, detail="Failed to update status")


@router.delete("/pre-auths/{pre_auth_id}")
def delete_preauth(pre_auth_id: int, db: Session = Depends(get_db)):
    try:
        _sp(db, _PREAUTH, _PREAUTH_D, "DELETE", PreAuthId=pre_auth_id)
        db.commit()
        return {"message": "Pre-authorisation deleted"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /insurance/pre-auths/{pre_auth_id}] {e}")
        raise HTTPException(status_code=500, detail="Failed to delete pre-authorisation")


# ══════════════════════════ CLAIMS ══════════════════════════
@router.get("/claims")
def list_claims(status: Optional[str] = None, uhid: Optional[str] = None,
                from_date: Optional[str] = Query(None, alias="from"),
                to_date: Optional[str] = Query(None, alias="to"),
                db: Session = Depends(get_db)):
    try:
        rows = _sp(db, _CLAIM, _CLAIM_D, "LIST", Status=status, Uhid=uhid,
                   FromDate=from_date, ToDate=to_date).fetchall()
        return [_map_claim(r) for r in rows]
    except Exception as e:
        logger.error(f"[GET /insurance/claims] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch claims")


@router.get("/claims/{claim_id}")
def get_claim(claim_id: int, db: Session = Depends(get_db)):
    try:
        row = _sp(db, _CLAIM, _CLAIM_D, "GETBYID", ClaimId=claim_id).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Claim not found")
        return _map_claim(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /insurance/claims/{claim_id}] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch claim")


@router.post("/claims", status_code=201)
def create_claim(payload: ClaimCreate, db: Session = Depends(get_db)):
    try:
        row = _sp(db, _CLAIM, _CLAIM_D, "CREATE",
                  Uhid=payload.uhid, PatientName=payload.patientName,
                  ProviderId=payload.providerId, InsurerName=payload.insurerName,
                  PreAuthId=payload.preAuthId, AdmissionId=payload.admissionId,
                  Diagnosis=payload.diagnosis, BilledAmount=payload.billedAmount,
                  PreAuthAmount=payload.preAuthAmount, ClaimedAmount=payload.claimedAmount,
                  User=payload.user or "Admin").fetchone()
        db.commit()
        return _map_claim(row)
    except Exception as e:
        db.rollback()
        msg = str(getattr(e, "orig", e))
        # A bad admission / pre-auth / provider reference is a client error,
        # not a server fault.
        if "foreign key constraint" in msg.lower() or "1452" in msg:
            raise HTTPException(
                status_code=400,
                detail="Unknown admission, pre-authorisation or insurance provider reference",
            )
        logger.error(f"[POST /insurance/claims] {e}")
        raise HTTPException(status_code=500, detail="Failed to create claim")


@router.put("/claims/{claim_id}")
def update_claim(claim_id: int, payload: ClaimCreate, db: Session = Depends(get_db)):
    try:
        row = _sp(db, _CLAIM, _CLAIM_D, "UPDATE", ClaimId=claim_id,
                  Uhid=payload.uhid, PatientName=payload.patientName,
                  ProviderId=payload.providerId, InsurerName=payload.insurerName,
                  Diagnosis=payload.diagnosis, BilledAmount=payload.billedAmount,
                  PreAuthAmount=payload.preAuthAmount, ClaimedAmount=payload.claimedAmount,
                  User=payload.user or "Admin").fetchone()
        db.commit()
        return _map_claim(row)
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /insurance/claims/{claim_id}] {e}")
        raise HTTPException(status_code=500, detail="Failed to update claim")


@router.patch("/claims/{claim_id}/status")
def set_claim_status(claim_id: int, payload: ClaimStatusUpdate, db: Session = Depends(get_db)):
    """Settling raises the settlement; denying opens the appeal — both in the SP."""
    try:
        row = _sp(db, _CLAIM, _CLAIM_D, "SETSTATUS", ClaimId=claim_id,
                  Status=payload.status.value, ApprovedAmount=payload.approvedAmount,
                  Reason=payload.reason, User=payload.user or "Admin").fetchone()
        db.commit()
        return _map_claim(row)
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /insurance/claims/{claim_id}/status] {e}")
        raise HTTPException(status_code=500, detail="Failed to update claim status")


@router.delete("/claims/{claim_id}")
def delete_claim(claim_id: int, db: Session = Depends(get_db)):
    try:
        _sp(db, _CLAIM, _CLAIM_D, "DELETE", ClaimId=claim_id)
        db.commit()
        return {"message": "Claim deleted"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /insurance/claims/{claim_id}] {e}")
        raise HTTPException(status_code=500, detail="Failed to delete claim")


# ══════════════════════════ APPEALS ══════════════════════════
@router.get("/appeals")
def list_appeals(status: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        return [_map_appeal(r) for r in _sp(db, _APPEAL, _APPEAL_D, "LIST", Status=status).fetchall()]
    except Exception as e:
        logger.error(f"[GET /insurance/appeals] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch appeals")


@router.post("/appeals/{appeal_id}/file")
def file_appeal(appeal_id: int, payload: AppealFile, db: Session = Depends(get_db)):
    try:
        _sp(db, _APPEAL, _APPEAL_D, "FILE", AppealId=appeal_id,
            AppealReason=payload.appealReason, User=payload.user or "Admin")
        db.commit()
        return {"appealId": appeal_id, "status": "Appealing"}
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /insurance/appeals/{appeal_id}/file] {e}")
        raise HTTPException(status_code=500, detail="Failed to file appeal")


@router.post("/appeals/{appeal_id}/resolve")
def resolve_appeal(appeal_id: int, payload: AppealResolve, db: Session = Depends(get_db)):
    """Resolving settles the underlying claim and raises its settlement."""
    try:
        row = _sp(db, _APPEAL, _APPEAL_D, "RESOLVE", AppealId=appeal_id,
                  ApprovedAmount=payload.approvedAmount, User=payload.user or "Admin").fetchone()
        db.commit()
        return {"appealId": appeal_id, "claimId": row.ClaimId if row else None, "status": "Resolved"}
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /insurance/appeals/{appeal_id}/resolve] {e}")
        raise HTTPException(status_code=500, detail="Failed to resolve appeal")


# ══════════════════════════ SETTLEMENTS ══════════════════════════
@router.get("/settlements")
def list_settlements(status: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        return [_map_settlement(r) for r in _sp(db, _SETTLE, _SETTLE_D, "LIST", Status=status).fetchall()]
    except Exception as e:
        logger.error(f"[GET /insurance/settlements] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch settlements")


@router.post("/settlements/{settlement_id}/reconcile")
def reconcile_settlement(settlement_id: int, payload: SettlementReconcile,
                         db: Session = Depends(get_db)):
    try:
        _sp(db, _SETTLE, _SETTLE_D, "RECONCILE", SettlementId=settlement_id,
            UtrReference=payload.utrReference, User=payload.user or "Admin")
        db.commit()
        return {"settlementId": settlement_id, "status": "Reconciled"}
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /insurance/settlements/{settlement_id}/reconcile] {e}")
        raise HTTPException(status_code=500, detail="Failed to reconcile settlement")


# ══════════════════════════ DASHBOARD ══════════════════════════
@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    """Real KPIs — the prototype dashboard was entirely hardcoded."""
    try:
        kpi = db.execute(text("""
            SELECT
              (SELECT COUNT(*) FROM hospital.Ins_PreAuth WHERE Status = 'Pending')            AS pendingPreAuths,
              (SELECT COUNT(*) FROM hospital.Ins_Claim WHERE Status IN ('Submitted','In Process')) AS claimsUnderReview,
              (SELECT COUNT(*) FROM hospital.Ins_Appeal WHERE Status IN ('Denied','Appealing'))     AS pendingAppeals,
              (SELECT COALESCE(SUM(NetReceivable), 0) FROM hospital.Ins_Settlement
                 WHERE Status = 'Reconciled' AND YEAR(ReconciledDate) = YEAR(CURDATE())
                   AND MONTH(ReconciledDate) = MONTH(CURDATE()))                              AS reconciledMtd,
              (SELECT COALESCE(SUM(NetReceivable), 0) FROM hospital.Ins_Settlement
                 WHERE Status = 'Pending')                                                    AS totalOutstanding
        """)).fetchone()

        by_insurer = db.execute(text(
            "SELECT InsurerName AS name, COUNT(*) AS claims, COALESCE(SUM(ClaimedAmount),0) AS amount "
            "FROM hospital.Ins_Claim GROUP BY InsurerName ORDER BY claims DESC"
        )).fetchall()

        monthly = db.execute(text("""
            SELECT DATE_FORMAT(ClaimDate, '%Y-%m') AS month,
                   SUM(Status = 'Settled') AS approved,
                   SUM(Status = 'Denied')  AS denied
            FROM hospital.Ins_Claim
            WHERE ClaimDate >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY month ORDER BY month
        """)).fetchall()

        recent = db.execute(text(
            "SELECT s.SettlementNumber, c.ClaimNumber, c.PatientName, c.InsurerName, "
            "s.BilledAmount, s.ApprovedAmount, s.Status, s.SettlementDate "
            "FROM hospital.Ins_Settlement s JOIN hospital.Ins_Claim c ON c.ClaimId = s.ClaimId "
            "ORDER BY s.SettlementId DESC LIMIT 5"
        )).fetchall()

        return {
            "pendingPreAuths": kpi.pendingPreAuths,
            "claimsUnderReview": kpi.claimsUnderReview,
            "pendingAppeals": kpi.pendingAppeals,
            "reconciledMtd": _f(kpi.reconciledMtd),
            "totalOutstanding": _f(kpi.totalOutstanding),
            "byInsurer": [{"name": r.name, "claims": r.claims, "amount": _f(r.amount)} for r in by_insurer],
            "monthly": [{"month": r.month, "approved": int(r.approved or 0), "denied": int(r.denied or 0)} for r in monthly],
            "recentSettlements": [{
                "id": r.SettlementNumber, "claimId": r.ClaimNumber, "patient": r.PatientName,
                "insurer": r.InsurerName, "claimed": _f(r.BilledAmount),
                "settled": _f(r.ApprovedAmount), "status": r.Status, "date": _iso(r.SettlementDate),
            } for r in recent],
        }
    except Exception as e:
        logger.error(f"[GET /insurance/dashboard] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard")
