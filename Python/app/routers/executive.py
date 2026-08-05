"""Executive analytics API.

Read-only cross-module aggregates for the Executive Command Center. Only
metrics that have a real source are exposed; anything that would need Billing,
Procurement, HR/payroll, EMR or a feedback module is deliberately absent rather
than estimated, so the dashboard cannot present invented figures.
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/executive", tags=["Executive"])


def _f(v):
    return float(v) if v is not None else 0.0


def _iso(v):
    return v.isoformat() if v else None


@router.get("/clinical")
def clinical(from_date: Optional[str] = Query(None, alias="from"),
             to_date: Optional[str] = Query(None, alias="to"),
             db: Session = Depends(get_db)):
    """Clinical activity from IPD admissions, appointments and registrations."""
    try:
        params = {"f": from_date, "t": to_date}

        kpi = db.execute(text("""
            SELECT
              (SELECT COUNT(*) FROM hospital.IPD_Admission
                 WHERE IsDeleted = 0 AND DATE(AdmissionDate) = CURDATE())          AS admissionsToday,
              (SELECT COUNT(*) FROM hospital.IPD_Admission
                 WHERE IsDeleted = 0 AND DischargeDate = CURDATE())                AS dischargesToday,
              (SELECT COUNT(*) FROM hospital.IPD_Admission
                 WHERE IsDeleted = 0 AND Status = 'Admitted')                      AS currentInpatients,
              (SELECT COUNT(*) FROM registration.Trn_Appointment
                 WHERE DATE(AppointmentDate) = CURDATE())                          AS appointmentsToday,
              (SELECT COUNT(*) FROM registration.PatientRegistration
                 WHERE RegistrationDate = CURDATE())                               AS registrationsToday,
              (SELECT ROUND(AVG(DATEDIFF(DischargeDate, DATE(AdmissionDate))), 1)
                 FROM hospital.IPD_Admission
                 WHERE IsDeleted = 0 AND DischargeDate IS NOT NULL
                   AND DischargeDate >= DATE_SUB(CURDATE(), INTERVAL 90 DAY))      AS avgLengthOfStay
        """)).fetchone()

        # Real bed occupancy per ward — the prototype hardcoded 82% / 85% / 92%
        # on three different screens.
        beds = db.execute(text("""
            SELECT w.WardId, w.WardName,
                   COUNT(b.BedId)                                    AS totalBeds,
                   SUM(b.Status = 'Occupied')                        AS occupiedBeds
            FROM hospital.IPD_Ward w
            LEFT JOIN hospital.IPD_Bed b ON b.WardId = w.WardId AND b.IsDeleted = 0
            WHERE w.IsDeleted = 0
            GROUP BY w.WardId, w.WardName
            ORDER BY w.WardName
        """)).fetchall()

        trend = db.execute(text("""
            SELECT d.dt AS date,
                   COALESCE(a.ipd, 0) AS ipd,
                   COALESCE(p.opd, 0) AS opd
            FROM (
                SELECT DATE_SUB(CURDATE(), INTERVAL n DAY) AS dt FROM (
                    SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
                    UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7
                    UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11
                    UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15
                    UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19
                    UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23
                    UNION ALL SELECT 24 UNION ALL SELECT 25 UNION ALL SELECT 26 UNION ALL SELECT 27
                    UNION ALL SELECT 28 UNION ALL SELECT 29
                ) nums
            ) d
            LEFT JOIN (
                SELECT DATE(AdmissionDate) dt, COUNT(*) ipd FROM hospital.IPD_Admission
                WHERE IsDeleted = 0 AND AdmissionDate >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
                GROUP BY DATE(AdmissionDate)
            ) a ON a.dt = d.dt
            LEFT JOIN (
                SELECT DATE(AppointmentDate) dt, COUNT(*) opd FROM registration.Trn_Appointment
                WHERE AppointmentDate >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
                GROUP BY DATE(AppointmentDate)
            ) p ON p.dt = d.dt
            ORDER BY d.dt
        """)).fetchall()

        by_specialty = db.execute(text("""
            SELECT COALESCE(NULLIF(Specialty, ''), 'Unspecified') AS specialty,
                   COUNT(*) AS admissions,
                   ROUND(AVG(CASE WHEN DischargeDate IS NOT NULL
                        THEN DATEDIFF(DischargeDate, DATE(AdmissionDate)) END), 1) AS avgStay
            FROM hospital.IPD_Admission
            WHERE IsDeleted = 0
              AND (:f IS NULL OR DATE(AdmissionDate) >= :f)
              AND (:t IS NULL OR DATE(AdmissionDate) <= :t)
            GROUP BY specialty ORDER BY admissions DESC LIMIT 10
        """), params).fetchall()

        total_beds = sum(int(b.totalBeds or 0) for b in beds)
        occupied = sum(int(b.occupiedBeds or 0) for b in beds)

        return {
            "admissionsToday": kpi.admissionsToday,
            "dischargesToday": kpi.dischargesToday,
            "currentInpatients": kpi.currentInpatients,
            "appointmentsToday": kpi.appointmentsToday,
            "registrationsToday": kpi.registrationsToday,
            "avgLengthOfStay": _f(kpi.avgLengthOfStay),
            "totalBeds": total_beds,
            "occupiedBeds": occupied,
            "bedOccupancyPct": round(occupied / total_beds * 100, 1) if total_beds else 0.0,
            "bedOccupancy": [{
                "wardId": b.WardId, "name": b.WardName,
                "total": int(b.totalBeds or 0), "occupied": int(b.occupiedBeds or 0),
            } for b in beds],
            "admissionsTrend": [{
                "date": _iso(t.date), "ipd": int(t.ipd or 0), "opd": int(t.opd or 0),
            } for t in trend],
            "bySpecialty": [{
                "specialty": s.specialty, "admissions": s.admissions, "avgStay": _f(s.avgStay),
            } for s in by_specialty],
        }
    except Exception as e:
        logger.error(f"[GET /executive/clinical] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch clinical analytics")


@router.get("/audit-summary")
def audit_summary(db: Session = Depends(get_db)):
    """Counts behind the audit-log KPI tiles."""
    try:
        r = db.execute(text("""
            SELECT
              COUNT(*)                                                   AS totalLogs,
              SUM(DATE(AuditTimestamp) = CURDATE())                           AS today,
              SUM(Status = 'Success')                                    AS successful,
              SUM(Status <> 'Success')                                   AS failed,
              SUM(Action = 'Create')                                     AS creates,
              SUM(Action = 'Update')                                     AS updates,
              SUM(Action = 'Delete')                                     AS deletes,
              COUNT(DISTINCT UserName)                                   AS activeUsers
            FROM admin.Audit_Log
        """)).fetchone()

        by_module = db.execute(text("""
            SELECT COALESCE(NULLIF(Module, ''), 'General') AS module, COUNT(*) AS total
            FROM admin.Audit_Log GROUP BY module ORDER BY total DESC LIMIT 10
        """)).fetchall()

        return {
            "totalLogs": r.totalLogs, "today": int(r.today or 0),
            "successful": int(r.successful or 0), "failed": int(r.failed or 0),
            "creates": int(r.creates or 0), "updates": int(r.updates or 0),
            "deletes": int(r.deletes or 0), "activeUsers": r.activeUsers,
            "byModule": [{"module": m.module, "total": m.total} for m in by_module],
        }
    except Exception as e:
        logger.error(f"[GET /executive/audit-summary] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch audit summary")
