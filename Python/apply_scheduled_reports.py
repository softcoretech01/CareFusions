"""Create the scheduled-report tables.

The Scheduled Reports screen was entirely hardcoded: five sample schedules and
five sample execution rows lived in the React component, so nothing survived a
refresh. These two tables give it a real home.

Run once:  python apply_scheduled_reports.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text

from app.database import engine

SCHEDULE_TABLE = """
CREATE TABLE IF NOT EXISTS admin.Sch_Report (
    ScheduleId      INT AUTO_INCREMENT PRIMARY KEY,
    ScheduleCode    VARCHAR(20)  NOT NULL UNIQUE,
    Name            VARCHAR(200) NOT NULL,
    Description     TEXT,
    Category        VARCHAR(50)  NOT NULL DEFAULT 'Financial',
    ReportTemplate  VARCHAR(100),
    Frequency       VARCHAR(50)  NOT NULL DEFAULT 'Daily',
    RunTime         VARCHAR(10),
    DeliveryMethod  VARCHAR(100),
    Recipients      TEXT,
    Status          VARCHAR(20)  NOT NULL DEFAULT 'Active',
    LastRunAt       DATETIME     NULL,
    NextRunAt       DATETIME     NULL,
    LastExecStatus  VARCHAR(20),
    CreatedBy       VARCHAR(100) DEFAULT 'Admin',
    CreatedDate     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    ModifiedBy      VARCHAR(100),
    ModifiedDate    DATETIME     NULL,
    IsDeleted       TINYINT      NOT NULL DEFAULT 0
)
"""

RUN_TABLE = """
CREATE TABLE IF NOT EXISTS admin.Sch_ReportRun (
    RunId       INT AUTO_INCREMENT PRIMARY KEY,
    ScheduleId  INT          NOT NULL,
    StartedAt   DATETIME     NOT NULL,
    DurationMs  INT,
    Status      VARCHAR(20)  NOT NULL DEFAULT 'Success',
    DeliveredTo VARCHAR(200),
    Message     TEXT,
    ResultJson  LONGTEXT     NULL,
    CreatedBy   VARCHAR(100) DEFAULT 'Admin',
    INDEX idx_schedule (ScheduleId),
    FOREIGN KEY (ScheduleId) REFERENCES admin.Sch_Report(ScheduleId) ON DELETE CASCADE
)
"""


def main():
    with engine.connect() as con:
        con.execute(text(SCHEDULE_TABLE))
        con.execute(text(RUN_TABLE))
        con.commit()

        n = con.execute(text("SELECT COUNT(*) FROM admin.Sch_Report")).scalar()
        runs = con.execute(text("SELECT COUNT(*) FROM admin.Sch_ReportRun")).scalar()
        print("Scheduled report tables ready.")
        print(f"  admin.Sch_Report     rows = {n}")
        print(f"  admin.Sch_ReportRun  rows = {runs}")


if __name__ == "__main__":
    main()
