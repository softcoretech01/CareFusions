"""Executive analytics API.

Read-only cross-module aggregates for the Executive Command Center. Only
metrics that have a real source are exposed; anything that would need Billing,
Procurement, HR/payroll, EMR or a feedback module is deliberately absent rather
than estimated, so the dashboard cannot present invented figures.
"""
import logging
from datetime import date
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


@router.get("/overview")
def overview(db: Session = Depends(get_db)):
    """Hospital-wide snapshot.

    Revenue covers only what the system actually bills today — pharmacy retail
    sales and settled insurance claims. There is no Billing module, so total
    hospital revenue, P&L and expenses are deliberately not reported.
    """
    try:
        r = db.execute(text("""
            SELECT
              (SELECT COALESCE(SUM(NetAmount), 0) FROM hospital.Pharmacy_Sale
                 WHERE PaymentStatus = 'Paid' AND DATE(SaleDate) = CURDATE())          AS pharmacyToday,
              (SELECT COALESCE(SUM(NetAmount), 0) FROM hospital.Pharmacy_Sale
                 WHERE PaymentStatus = 'Paid' AND YEAR(SaleDate) = YEAR(CURDATE())
                   AND MONTH(SaleDate) = MONTH(CURDATE()))                             AS pharmacyMonth,
              (SELECT COUNT(*) FROM hospital.Pharmacy_Sale
                 WHERE DATE(SaleDate) = CURDATE())                                     AS salesToday,
              (SELECT COALESCE(SUM(NetReceivable), 0) FROM hospital.Ins_Settlement
                 WHERE Status = 'Reconciled' AND YEAR(ReconciledDate) = YEAR(CURDATE())
                   AND MONTH(ReconciledDate) = MONTH(CURDATE()))                       AS insuranceMonth,
              (SELECT COALESCE(SUM(NetReceivable), 0) FROM hospital.Ins_Settlement
                 WHERE Status = 'Pending')                                             AS insuranceOutstanding,
              (SELECT COUNT(*) FROM hospital.Ins_Claim
                 WHERE Status IN ('Submitted','In Process'))                           AS claimsInProcess,
              (SELECT COALESCE(SUM(Quantity * ValuationRate), 0)
                 FROM inventory.Inventory_Stock)                                       AS stockValue,
              (SELECT COUNT(*) FROM hospital.Lab_Order
                 WHERE DATE(OrderedAt) = CURDATE())                                    AS labOrdersToday
        """)).fetchone()

        # Alerts derived from live thresholds — the prototype hardcoded five.
        alerts = []
        wards = db.execute(text("""
            SELECT w.WardName, COUNT(b.BedId) total, SUM(b.Status = 'Occupied') occ
            FROM hospital.IPD_Ward w
            LEFT JOIN hospital.IPD_Bed b ON b.WardId = w.WardId AND b.IsDeleted = 0
            WHERE w.IsDeleted = 0 GROUP BY w.WardId, w.WardName HAVING total > 0
        """)).fetchall()
        for w in wards:
            pct = (int(w.occ or 0) / int(w.total)) * 100
            if pct >= 80:
                alerts.append({
                    "type": "critical" if pct >= 90 else "warning",
                    "message": "{} at {}% capacity ({}/{} beds)".format(
                        w.WardName, round(pct), int(w.occ or 0), int(w.total)),
                })

        low = db.execute(text("""
            SELECT i.ItemName, COALESCE(SUM(s.Quantity), 0) qty, i.ReorderLevel
            FROM admin.Master_Item i
            LEFT JOIN inventory.Inventory_Stock s ON s.ItemId = i.ItemId
            WHERE i.IsDeleted = 0 AND i.Status = 'Active' AND i.ReorderLevel IS NOT NULL
            GROUP BY i.ItemId, i.ItemName, i.ReorderLevel
            HAVING qty <= i.ReorderLevel LIMIT 3
        """)).fetchall()
        for it in low:
            alerts.append({
                "type": "warning",
                "message": "{} below reorder level ({} of {})".format(
                    it.ItemName, int(it.qty), it.ReorderLevel),
            })

        exp = db.execute(text("""
            SELECT COUNT(*) n FROM inventory.Inventory_Stock
            WHERE ExpiryDate IS NOT NULL AND Quantity > 0
              AND ExpiryDate <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        """)).scalar()
        if exp:
            alerts.append({"type": "warning",
                           "message": "{} stock lot(s) expiring within 30 days".format(exp)})

        crit = db.execute(text("""
            SELECT COUNT(*) n FROM hospital.Lab_OrderTest
            WHERE IsCritical = 1 AND AcknowledgedAt IS NULL
        """)).scalar()
        if crit:
            alerts.append({"type": "critical",
                           "message": "{} critical lab result(s) awaiting acknowledgement".format(crit)})

        return {
            "pharmacyRevenueToday": _f(r.pharmacyToday),
            "pharmacyRevenueMonth": _f(r.pharmacyMonth),
            "salesToday": r.salesToday,
            "insuranceReconciledMonth": _f(r.insuranceMonth),
            "insuranceOutstanding": _f(r.insuranceOutstanding),
            "claimsInProcess": r.claimsInProcess,
            "stockValue": _f(r.stockValue),
            "labOrdersToday": r.labOrdersToday,
            "alerts": alerts[:8],
        }
    except Exception as e:
        logger.error("[GET /executive/overview] {}".format(e))
        raise HTTPException(status_code=500, detail="Failed to fetch overview")


@router.get("/operational")
def operational(db: Session = Depends(get_db)):
    """Throughput and turnaround from appointments, lab and pharmacy."""
    try:
        r = db.execute(text("""
            SELECT
              (SELECT COUNT(*) FROM registration.Trn_Appointment
                 WHERE DATE(AppointmentDate) = CURDATE())                          AS appointmentsToday,
              (SELECT COUNT(*) FROM registration.Trn_Appointment
                 WHERE DATE(AppointmentDate) = CURDATE() AND Status = 'Cancelled')  AS cancelledToday,
              (SELECT COUNT(*) FROM registration.Trn_Appointment
                 WHERE DATE(AppointmentDate) = CURDATE()
                   AND Status IN ('Scheduled','Confirmed','Waiting'))               AS waitingToday,
              (SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE, CollectedAt, CompletedAt)), 0)
                 FROM hospital.Lab_OrderTest
                 WHERE CollectedAt IS NOT NULL AND CompletedAt IS NOT NULL)         AS labTatMinutes,
              (SELECT COUNT(*) FROM hospital.Lab_OrderTest
                 WHERE Status IN ('Pending','Sample Collected','Sample Accepted'))  AS labPending,
              (SELECT COUNT(*) FROM hospital.Pharmacy_Sale
                 WHERE DATE(SaleDate) = CURDATE())                                  AS dispensesToday
        """)).fetchone()

        by_hour = db.execute(text("""
            SELECT HOUR(CreatedDate) AS hr, COUNT(*) AS n
            FROM registration.Trn_Appointment
            WHERE AppointmentDate >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
            GROUP BY hr ORDER BY hr
        """)).fetchall()

        by_status = db.execute(text("""
            SELECT COALESCE(NULLIF(Status,''),'Unknown') AS status, COUNT(*) AS n
            FROM registration.Trn_Appointment
            WHERE AppointmentDate >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
            GROUP BY status ORDER BY n DESC
        """)).fetchall()

        return {
            "appointmentsToday": r.appointmentsToday,
            "cancelledToday": r.cancelledToday,
            "waitingToday": r.waitingToday,
            "labTatMinutes": int(r.labTatMinutes or 0),
            "labPending": r.labPending,
            "dispensesToday": r.dispensesToday,
            "byHour": [{"hour": "{:02d}:00".format(int(h.hr)), "count": h.n} for h in by_hour],
            "byStatus": [{"status": s.status, "count": s.n} for s in by_status],
        }
    except Exception as e:
        logger.error("[GET /executive/operational] {}".format(e))
        raise HTTPException(status_code=500, detail="Failed to fetch operational analytics")


@router.get("/headcount")
def headcount(db: Session = Depends(get_db)):
    """Staff counts from the employee masters.

    Payroll, attendance and attrition are not reported — no HR module exists.
    """
    try:
        r = db.execute(text("""
            SELECT
              (SELECT COUNT(*) FROM admin.Master_Doctor_Header WHERE IsDeleted = 0)      AS doctors,
              (SELECT COUNT(*) FROM admin.Master_Nurse WHERE IsDeleted = 0)              AS nurses,
              (SELECT COUNT(*) FROM admin.Master_Pharmacist WHERE IsDeleted = 0)         AS pharmacists,
              (SELECT COUNT(*) FROM admin.Master_LabTechnician WHERE IsDeleted = 0)      AS labTechnicians,
              (SELECT COUNT(*) FROM admin.Master_Receptionist WHERE IsDeleted = 0)       AS receptionists,
              (SELECT COUNT(*) FROM admin.Master_FacilityManagement WHERE IsDeleted = 0) AS facility
        """)).fetchone()
        roles = [
            {"role": "Doctors", "count": r.doctors},
            {"role": "Nurses", "count": r.nurses},
            {"role": "Pharmacists", "count": r.pharmacists},
            {"role": "Lab Technicians", "count": r.labTechnicians},
            {"role": "Receptionists", "count": r.receptionists},
            {"role": "Facility Staff", "count": r.facility},
        ]
        return {"totalEmployees": sum(x["count"] for x in roles), "byRole": roles}
    except Exception as e:
        logger.error("[GET /executive/headcount] {}".format(e))
        raise HTTPException(status_code=500, detail="Failed to fetch headcount")


def _linear_forecast(points, periods=3):
    """Least-squares trend over an ordered series.

    Returns the projection plus R-squared, so the caller can report how well the
    line actually fits instead of quoting a confidence figure that was typed in.
    """
    n = len(points)
    if n < 2:
        return {"forecast": [], "slope": 0.0, "r2": 0.0, "method": "insufficient history"}

    xs = list(range(n))
    ys = [float(p) for p in points]
    mx = sum(xs) / n
    my = sum(ys) / n
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    sxx = sum((x - mx) ** 2 for x in xs)
    slope = sxy / sxx if sxx else 0.0
    intercept = my - slope * mx

    ss_tot = sum((y - my) ** 2 for y in ys)
    ss_res = sum((y - (intercept + slope * x)) ** 2 for x, y in zip(xs, ys))
    r2 = (1 - ss_res / ss_tot) if ss_tot else 0.0

    forecast = [max(intercept + slope * (n - 1 + i), 0.0) for i in range(1, periods + 1)]
    return {
        "forecast": [round(v, 2) for v in forecast],
        "slope": round(slope, 4),
        "r2": round(max(min(r2, 1.0), 0.0), 3),
        "method": "least-squares linear trend",
    }


@router.get("/predictive")
def predictive(db: Session = Depends(get_db)):
    """Forecasts computed from real history.

    Every projection here is a least-squares trend over actual recorded data,
    reported alongside the number of observations and the R-squared of the fit.
    Where there is too little history to fit a line, the series is returned with
    an explicit "insufficient history" method rather than a fabricated number.
    """
    try:
        # ── Pharmacy revenue by month (the only billed revenue we hold) ──
        rev = db.execute(text("""
            SELECT DATE_FORMAT(SaleDate, '%Y-%m') AS period,
                   COALESCE(SUM(NetAmount), 0)     AS value
            FROM hospital.Pharmacy_Sale
            WHERE PaymentStatus = 'Paid'
              AND SaleDate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
            GROUP BY period ORDER BY period
        """)).fetchall()

        # ── Admissions per month, as the occupancy demand driver ──
        adm = db.execute(text("""
            SELECT DATE_FORMAT(AdmissionDate, '%Y-%m') AS period, COUNT(*) AS value
            FROM hospital.IPD_Admission
            WHERE IsDeleted = 0 AND AdmissionDate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
            GROUP BY period ORDER BY period
        """)).fetchall()

        # ── Items consumed most, as a restocking signal ──
        demand = db.execute(text("""
            SELECT ItemName, SUM(-Quantity) AS issued, COUNT(*) AS movements
            FROM inventory.Inventory_StockLedger
            WHERE Quantity < 0 AND TxnDate >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
            GROUP BY ItemId, ItemName ORDER BY issued DESC LIMIT 5
        """)).fetchall()

        # ── Wards trending toward capacity ──
        wards = db.execute(text("""
            SELECT w.WardName, COUNT(b.BedId) total, SUM(b.Status = 'Occupied') occ
            FROM hospital.IPD_Ward w
            LEFT JOIN hospital.IPD_Bed b ON b.WardId = w.WardId AND b.IsDeleted = 0
            WHERE w.IsDeleted = 0 GROUP BY w.WardId, w.WardName HAVING total > 0
            ORDER BY (SUM(b.Status = 'Occupied') / COUNT(b.BedId)) DESC LIMIT 5
        """)).fetchall()

        rev_hist = [{"period": r.period, "value": _f(r.value)} for r in rev]
        adm_hist = [{"period": a.period, "value": int(a.value)} for a in adm]

        # The current month is still accumulating, so fitting it would read a
        # part-month as a collapse and invert the trend. Fit on completed months
        # only; the partial month is still returned for the chart, flagged.
        current = date.today().strftime("%Y-%m")
        rev_complete = [r["value"] for r in rev_hist if r["period"] != current]
        adm_complete = [a["value"] for a in adm_hist if a["period"] != current]

        rev_fit = _linear_forecast(rev_complete)
        adm_fit = _linear_forecast(adm_complete)

        def next_periods(hist, k=3):
            """Label the forecast months following the last completed one."""
            complete = [h for h in hist if h["period"] != current]
            if not complete:
                return []
            y, m = (int(x) for x in complete[-1]["period"].split("-"))
            out = []
            for _ in range(k):
                m += 1
                if m > 12:
                    m, y = 1, y + 1
                out.append("{}-{:02d}".format(y, m))
            return out

        return {
            "revenue": {
                "history": rev_hist,
                "forecastPeriods": next_periods(rev_hist),
                "observations": len(rev_complete),
                "partialPeriod": current,
                **rev_fit,
            },
            "admissions": {
                "history": adm_hist,
                "forecastPeriods": next_periods(adm_hist),
                "observations": len(adm_complete),
                "partialPeriod": current,
                **adm_fit,
            },
            "demandSignal": [{
                "itemName": d.ItemName, "issued": _f(d.issued), "movements": d.movements,
            } for d in demand],
            "wardPressure": [{
                "ward": w.WardName, "occupied": int(w.occ or 0), "total": int(w.total),
                "utilisation": round((int(w.occ or 0) / int(w.total)) * 100, 1),
            } for w in wards],
        }
    except Exception as e:
        logger.error("[GET /executive/predictive] {}".format(e))
        raise HTTPException(status_code=500, detail="Failed to fetch predictive analytics")
