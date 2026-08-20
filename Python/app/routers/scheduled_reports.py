import csv
import io as _io
import json
import logging
import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/scheduled-reports", tags=["Scheduled Reports"])


# ── Schemas ───────────────────────────────────────────────────
class ScheduleIn(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    category: str = Field("Financial", max_length=50)
    reportTemplate: Optional[str] = Field(None, max_length=100)
    frequency: str = Field("Daily", max_length=50)
    runTime: Optional[str] = Field(None, max_length=10)
    deliveryMethod: Optional[str] = Field(None, max_length=100)
    recipients: Optional[str] = None
    status: str = Field("Active", max_length=20)
    createdBy: Optional[str] = None


class StatusIn(BaseModel):
    status: str


def _iso(v):
    return v.isoformat() if v else None


def _map(r) -> dict:
    return {
        "id": r.ScheduleCode,
        "scheduleId": r.ScheduleId,
        "name": r.Name,
        "description": r.Description or "",
        "category": r.Category,
        "reportTemplate": r.ReportTemplate or "",
        "frequency": r.Frequency,
        "runTime": r.RunTime or "",
        "deliveryMethod": r.DeliveryMethod or "",
        "recipients": r.Recipients or "",
        "status": r.Status,
        "lastRunAt": _iso(r.LastRunAt),
        "nextRunAt": _iso(r.NextRunAt),
        "lastExecStatus": r.LastExecStatus or "",
        "author": r.CreatedBy or "",
        "createdDate": _iso(r.CreatedDate),
    }


SELECT_COLS = (
    "SELECT ScheduleId, ScheduleCode, Name, Description, Category, ReportTemplate, "
    "       Frequency, RunTime, DeliveryMethod, Recipients, Status, LastRunAt, "
    "       NextRunAt, LastExecStatus, CreatedBy, CreatedDate "
    "FROM admin.Sch_Report "
)


def _next_code(db: Session) -> str:
    """SR-1001, SR-1002 ... derived from the highest existing code."""
    row = db.execute(text(
        "SELECT MAX(CAST(SUBSTRING(ScheduleCode, 4) AS UNSIGNED)) AS n "
        "FROM admin.Sch_Report WHERE ScheduleCode LIKE 'SR-%'"
    )).fetchone()
    return f"SR-{(row.n or 1000) + 1}"


def _find(db: Session, code: str):
    return db.execute(
        text(SELECT_COLS + "WHERE ScheduleCode = :c AND IsDeleted = 0"), {"c": code}
    ).fetchone()


# ── Endpoints ─────────────────────────────────────────────────
@router.get("/")
def list_schedules(db: Session = Depends(get_db)):
    try:
        rows = db.execute(text(
            SELECT_COLS + "WHERE IsDeleted = 0 ORDER BY ScheduleId DESC"
        )).fetchall()
        return [_map(r) for r in rows]
    except Exception as e:
        logger.error(f"[GET /scheduled-reports] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch schedules")


@router.get("/runs")
def list_runs(limit: int = 50, db: Session = Depends(get_db)):
    """Execution history across all schedules, newest first."""
    try:
        rows = db.execute(text("""
            SELECT r.RunId, r.StartedAt, r.DurationMs, r.Status, r.DeliveredTo,
                   r.Message, s.Name AS ScheduleName, s.ScheduleCode
            FROM admin.Sch_ReportRun r
            JOIN admin.Sch_Report s ON s.ScheduleId = r.ScheduleId
            ORDER BY r.StartedAt DESC LIMIT :lim
        """), {"lim": max(1, min(limit, 500))}).fetchall()
        return [{
            "runId": r.RunId,
            "startedAt": _iso(r.StartedAt),
            "durationMs": r.DurationMs,
            "status": r.Status,
            "deliveredTo": r.DeliveredTo or "",
            "message": r.Message or "",
            "scheduleName": r.ScheduleName,
            "scheduleCode": r.ScheduleCode,
        } for r in rows]
    except Exception as e:
        logger.error(f"[GET /scheduled-reports/runs] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch run history")


@router.get("/{code}")
def get_schedule(code: str, db: Session = Depends(get_db)):
    row = _find(db, code)
    if not row:
        raise HTTPException(status_code=404, detail=f"Schedule {code} not found")
    return _map(row)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_schedule(payload: ScheduleIn, db: Session = Depends(get_db)):
    try:
        code = _next_code(db)
        db.execute(text("""
            INSERT INTO admin.Sch_Report
                (ScheduleCode, Name, Description, Category, ReportTemplate, Frequency,
                 RunTime, DeliveryMethod, Recipients, Status, CreatedBy, CreatedDate)
            VALUES
                (:code, :name, :descr, :cat, :tpl, :freq,
                 :time, :delivery, :rcpt, :status, :by, NOW())
        """), {
            "code": code, "name": payload.name, "descr": payload.description,
            "cat": payload.category, "tpl": payload.reportTemplate,
            "freq": payload.frequency, "time": payload.runTime,
            "delivery": payload.deliveryMethod, "rcpt": payload.recipients,
            "status": payload.status, "by": payload.createdBy or "Admin",
        })
        db.commit()
        return _map(_find(db, code))
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /scheduled-reports] {e}")
        raise HTTPException(status_code=500, detail="Failed to create schedule")


@router.put("/{code}")
def update_schedule(code: str, payload: ScheduleIn, db: Session = Depends(get_db)):
    try:
        if not _find(db, code):
            raise HTTPException(status_code=404, detail=f"Schedule {code} not found")
        db.execute(text("""
            UPDATE admin.Sch_Report SET
                Name = :name, Description = :descr, Category = :cat,
                ReportTemplate = :tpl, Frequency = :freq, RunTime = :time,
                DeliveryMethod = :delivery, Recipients = :rcpt, Status = :status,
                ModifiedBy = :by, ModifiedDate = NOW()
            WHERE ScheduleCode = :code AND IsDeleted = 0
        """), {
            "code": code, "name": payload.name, "descr": payload.description,
            "cat": payload.category, "tpl": payload.reportTemplate,
            "freq": payload.frequency, "time": payload.runTime,
            "delivery": payload.deliveryMethod, "rcpt": payload.recipients,
            "status": payload.status, "by": payload.createdBy or "Admin",
        })
        db.commit()
        return _map(_find(db, code))
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /scheduled-reports/{code}] {e}")
        raise HTTPException(status_code=500, detail="Failed to update schedule")


@router.patch("/{code}/status")
def set_status(code: str, payload: StatusIn, db: Session = Depends(get_db)):
    try:
        if not _find(db, code):
            raise HTTPException(status_code=404, detail=f"Schedule {code} not found")
        db.execute(text(
            "UPDATE admin.Sch_Report SET Status = :s, ModifiedDate = NOW() "
            "WHERE ScheduleCode = :code AND IsDeleted = 0"
        ), {"s": payload.status, "code": code})
        db.commit()
        return _map(_find(db, code))
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /scheduled-reports/{code}/status] {e}")
        raise HTTPException(status_code=500, detail="Failed to update status")


@router.delete("/{code}")
def delete_schedule(code: str, db: Session = Depends(get_db)):
    """Soft delete, so run history keeps pointing at something."""
    try:
        if not _find(db, code):
            raise HTTPException(status_code=404, detail=f"Schedule {code} not found")
        db.execute(text(
            "UPDATE admin.Sch_Report SET IsDeleted = 1, ModifiedDate = NOW() "
            "WHERE ScheduleCode = :code"
        ), {"code": code})
        db.commit()
        return {"message": f"Schedule {code} deleted"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /scheduled-reports/{code}] {e}")
        raise HTTPException(status_code=500, detail="Failed to delete schedule")


@router.get("/{code}/runs")
def schedule_runs(code: str, db: Session = Depends(get_db)):
    try:
        rows = db.execute(text("""
            SELECT r.RunId, r.StartedAt, r.DurationMs, r.Status, r.DeliveredTo, r.Message
            FROM admin.Sch_ReportRun r
            JOIN admin.Sch_Report s ON s.ScheduleId = r.ScheduleId
            WHERE s.ScheduleCode = :c
            ORDER BY r.StartedAt DESC
        """), {"c": code}).fetchall()
        return [{
            "runId": r.RunId, "startedAt": _iso(r.StartedAt), "durationMs": r.DurationMs,
            "status": r.Status, "deliveredTo": r.DeliveredTo or "", "message": r.Message or "",
        } for r in rows]
    except Exception as e:
        logger.error(f"[GET /scheduled-reports/{code}/runs] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch runs")


# ── Report execution ──────────────────────────────────────────
# Each template is a real query over live data. There is no PDF renderer and no
# mail server wired up, so a run computes the figures, records the attempt in
# admin.Sch_ReportRun and returns the payload; it does not email anything.
TEMPLATES = {
    "Revenue Report": {
        "sql": """
            SELECT
              (SELECT COALESCE(SUM(NetAmount), 0) FROM hospital.OpBill
                 WHERE YEAR(BillDate) = YEAR(CURDATE())
                   AND MONTH(BillDate) = MONTH(CURDATE()))                    AS opBills,
              (SELECT COALESCE(SUM(NetAmount), 0) FROM hospital.IpBill
                 WHERE YEAR(BillDate) = YEAR(CURDATE())
                   AND MONTH(BillDate) = MONTH(CURDATE()))                    AS ipBills,
              (SELECT COALESCE(SUM(NetAmount), 0) FROM hospital.Pharmacy_Sale
                 WHERE PaymentStatus = 'Paid'
                   AND YEAR(SaleDate) = YEAR(CURDATE())
                   AND MONTH(SaleDate) = MONTH(CURDATE()))                    AS pharmacy,
              (SELECT COALESCE(SUM(NetReceivable), 0) FROM hospital.Ins_Settlement
                 WHERE Status = 'Reconciled'
                   AND YEAR(ReconciledDate) = YEAR(CURDATE())
                   AND MONTH(ReconciledDate) = MONTH(CURDATE()))              AS insurance
        """,
        "summary": lambda rows: (
            "Month to date \u2014 OP {:,.0f}, IP {:,.0f}, pharmacy {:,.0f}, insurance {:,.0f}".format(
                rows[0]["opBills"], rows[0]["ipBills"], rows[0]["pharmacy"], rows[0]["insurance"])
        ),
    },
    "Bed Occupancy": {
        "sql": "SELECT COUNT(*) AS total, SUM(Status = 'Occupied') AS occupied "
               "FROM hospital.IPD_Bed WHERE IsDeleted = 0",
        "summary": lambda rows: "{} of {} beds occupied".format(
            int(rows[0]["occupied"] or 0), int(rows[0]["total"] or 0)),
    },
    "Doctor Performance": {
        "sql": "SELECT Doctor, COUNT(*) AS appointments FROM registration.Trn_Appointment "
               "WHERE Doctor IS NOT NULL AND Doctor <> '' "
               "GROUP BY Doctor ORDER BY appointments DESC LIMIT 10",
        "summary": lambda rows: "{} doctor(s) ranked by appointment volume".format(len(rows)),
    },
    "Cash Flow": {
        "sql": """
            SELECT
              (SELECT COALESCE(SUM(NetAmount), 0) FROM hospital.IpBill
                 WHERE PaymentStatus = 'Paid')                                AS ipCollected,
              (SELECT COALESCE(SUM(NetAmount), 0) FROM hospital.IpBill
                 WHERE PaymentStatus <> 'Paid')                               AS ipOutstanding,
              (SELECT COALESCE(SUM(NetAmount), 0) FROM hospital.OpBill
                 WHERE PaymentStatus = 'Paid')                                AS opCollected,
              (SELECT COALESCE(SUM(NetAmount), 0) FROM hospital.OpBill
                 WHERE PaymentStatus <> 'Paid')                               AS opOutstanding
        """,
        "summary": lambda rows: "Collected {:,.0f}, outstanding {:,.0f}".format(
            rows[0]["ipCollected"] + rows[0]["opCollected"],
            rows[0]["ipOutstanding"] + rows[0]["opOutstanding"]),
    },
}


class RunIn(BaseModel):
    triggeredBy: Optional[str] = None


@router.post("/{code}/run")
def run_now(code: str, payload: RunIn = RunIn(), db: Session = Depends(get_db)):
    """Execute a schedule immediately and record the run."""
    sched = _find(db, code)
    if not sched:
        raise HTTPException(status_code=404, detail=f"Schedule {code} not found")

    tpl = TEMPLATES.get(sched.ReportTemplate or "")
    started = time.perf_counter()
    rows, status_text, message = [], "Success", ""

    try:
        if not tpl:
            raise ValueError(
                f"No query is defined for template '{sched.ReportTemplate or 'none'}'")
        result = db.execute(text(tpl["sql"])).fetchall()
        rows = [{k: (float(v) if hasattr(v, "quantize") else v)
                 for k, v in r._mapping.items()} for r in result]
        message = tpl["summary"](rows) if rows else "Query returned no rows"
    except Exception as e:
        status_text = "Failed"
        message = str(e)[:400]
        logger.error(f"[POST /scheduled-reports/{code}/run] {e}")

    duration_ms = int((time.perf_counter() - started) * 1000)

    try:
        db.execute(text("""
            INSERT INTO admin.Sch_ReportRun
                (ScheduleId, StartedAt, DurationMs, Status, DeliveredTo, Message,
                 ResultJson, CreatedBy)
            VALUES (:sid, NOW(), :ms, :st, :to, :msg, :rows, :by)
        """), {
            "sid": sched.ScheduleId, "ms": duration_ms, "st": status_text,
            # Delivery is not implemented; say so rather than claim an email went out.
            "to": "Generated in-app (no delivery configured)",
            "msg": message,
            # Keep the output so the run can be downloaded afterwards.
            "rows": json.dumps(rows, default=str) if rows else None,
            "by": payload.triggeredBy or "Admin",
        })
        run_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()
        db.execute(text("""
            UPDATE admin.Sch_Report
            SET LastRunAt = NOW(), LastExecStatus = :st
            WHERE ScheduleId = :sid
        """), {"st": status_text, "sid": sched.ScheduleId})
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /scheduled-reports/{code}/run] could not record run: {e}")
        raise HTTPException(status_code=500, detail="Report ran but the run could not be recorded")

    return {
        "runId": run_id,
        "scheduleCode": code,
        "template": sched.ReportTemplate,
        "status": status_text,
        "durationMs": duration_ms,
        "message": message,
        "rows": rows,
        "delivered": False,
    }


@router.get("/runs/{run_id}/download")
def download_run(run_id: int, fmt: str = "csv", db: Session = Depends(get_db)):
    """Download what a run produced, as CSV or JSON.

    The output is whatever the template query returned, stored on the run. Runs
    recorded before this column existed have nothing to download.
    """
    row = db.execute(text("""
        SELECT r.RunId, r.StartedAt, r.Status, r.ResultJson, s.ScheduleCode, s.Name
        FROM admin.Sch_ReportRun r
        JOIN admin.Sch_Report s ON s.ScheduleId = r.ScheduleId
        WHERE r.RunId = :id
    """), {"id": run_id}).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
    if not row.ResultJson:
        raise HTTPException(
            status_code=404,
            detail="This run produced no downloadable output (it failed, or predates result capture)")

    try:
        rows = json.loads(row.ResultJson)
    except Exception:
        raise HTTPException(status_code=500, detail="Stored result is not readable")

    stamp = row.StartedAt.strftime("%Y%m%d-%H%M%S") if row.StartedAt else "run"
    base = f"{row.ScheduleCode}-{stamp}"

    if fmt.lower() == "json":
        return StreamingResponse(
            _io.BytesIO(json.dumps(rows, indent=2).encode("utf-8")),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{base}.json"'},
        )

    buf = _io.StringIO()
    if rows:
        writer = csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    else:
        buf.write("no rows\n")

    return StreamingResponse(
        _io.BytesIO(buf.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{base}.csv"'},
    )
