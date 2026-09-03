"""Remove ServiceCategory / EstimatedDuration / ReportTat from the Radiology
Service master.

The API no longer sends these three fields, so SpMasterRadiologyService has to
lose the matching parameters (plus p_CategoryFilter, which filtered on the
column that is going away) and Master_RadiologyService has to lose the columns.
Until this runs, GET /radiology-services/ returns 500: the router passes 18
parameters and the live procedure still expects 22.

The live procedure is the source of truth - Python/sql/radiology_service_master.sql
has drifted from it - so the definition is read back and transformed rather than
re-authored here.

    python apply_remove_radiology_service_details.py            # dry run
    python apply_remove_radiology_service_details.py --apply    # execute

Backup taken beforehand: Python/backups/radiology_service_before_removal.sql
(table DDL, every row, and the original procedure). DROP COLUMN cannot be
rolled back, so keep that file until you are satisfied.
"""
import argparse
import re

from sqlalchemy import text

from app.database import engine

PROC = "SpMasterRadiologyService"
TABLE = "Master_RadiologyService"
GONE = ("ServiceCategory", "EstimatedDuration", "ReportTat", "CategoryFilter")

M = re.MULTILINE

# Every pattern is line-anchored on purpose. An unanchored `ReportTat,` also
# matches the tail of `ServiceCategory, EstimatedDuration, ReportTat,` and
# would silently truncate that line instead of removing it.
EDITS = [
    (r'^[ \t]*IN\s+p_ServiceCategory\s+VARCHAR\(\d+\),\n', 'param p_ServiceCategory', 1),
    (r'^[ \t]*IN\s+p_EstimatedDuration\s+INT,\n', 'param p_EstimatedDuration', 1),
    (r'^[ \t]*IN\s+p_ReportTat\s+INT,\n', 'param p_ReportTat', 1),
    (r'^[ \t]*IN\s+p_CategoryFilter\s+VARCHAR\(\d+\),\n', 'param p_CategoryFilter', 1),

    (r'^[ \t]*ServiceCategory,[ \t]*\n', 'select column ServiceCategory', 0),
    (r'^[ \t]*EstimatedDuration,[ \t]*\n', 'select column EstimatedDuration', 0),
    (r'^[ \t]*ReportTat,[ \t]*\n', 'select column ReportTat', 0),

    (r"^[ \t]*OR ServiceCategory LIKE CONCAT\('%', p_Search, '%'\)[ \t]*\n",
     'search on ServiceCategory', 0),

    (r"^[ \t]*AND \(\n[ \t]*p_CategoryFilter IS NULL OR p_CategoryFilter = ''\n"
     r"[ \t]*OR ServiceCategory = p_CategoryFilter\n[ \t]*\)[ \t]*\n",
     'CategoryFilter clause', 1),

    (r'^[ \t]*ServiceCategory, EstimatedDuration, ReportTat,[ \t]*\n', 'INSERT columns', 1),
    (r'^[ \t]*p_ServiceCategory, p_EstimatedDuration, p_ReportTat,[ \t]*\n', 'INSERT values', 1),

    (r'^[ \t]*ServiceCategory\s*=\s*p_ServiceCategory,[ \t]*\n', 'UPDATE ServiceCategory', 1),
    (r'^[ \t]*EstimatedDuration\s*=\s*p_EstimatedDuration,[ \t]*\n', 'UPDATE EstimatedDuration', 1),
    (r'^[ \t]*ReportTat\s*=\s*p_ReportTat,[ \t]*\n', 'UPDATE ReportTat', 1),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true",
                    help="execute; without it nothing is written")
    args = ap.parse_args()

    with engine.connect() as conn:
        cols = [r[0] for r in conn.execute(text(
            "SELECT COLUMN_NAME FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t"), {"t": TABLE})]
        present = [c for c in GONE[:3] if c in cols]
        if not present:
            print(f"{TABLE} already has none of "
                  f"{', '.join(GONE[:3])} - nothing to do.")
            return

        sp = conn.execute(text(f"SHOW CREATE PROCEDURE {PROC}")).fetchone()[2]

    before = len(sp)
    for pattern, label, count in EDITS:
        sp, n = re.subn(pattern, '', sp, count=count, flags=M)
        if n == 0:
            raise SystemExit(f"ABORT: could not find {label} in {PROC}. "
                             "The procedure has changed; re-check by hand.")
        print(f"  removed {label} x{n}")

    leftover = [m.group(0).strip() for m in
                re.finditer(rf'[^\n]*({"|".join(GONE)})[^\n]*', sp)]
    if leftover:
        raise SystemExit("ABORT: references survived:\n  " + "\n  ".join(leftover))

    print(f"\nprocedure {before} -> {len(sp)} chars")
    print(f"columns to drop: {', '.join(present)}")

    if not args.apply:
        print("\nDRY RUN - nothing was changed. Re-run with --apply.")
        return

    with engine.connect() as conn:
        conn.execute(text(f"DROP PROCEDURE IF EXISTS {PROC}"))
        conn.execute(text(sp))
        drops = ", ".join(f"DROP COLUMN {c}" for c in present)
        conn.execute(text(f"ALTER TABLE {TABLE} {drops}"))
        conn.commit()

        params = conn.execute(text(
            "SELECT COUNT(*) FROM information_schema.PARAMETERS "
            "WHERE SPECIFIC_SCHEMA = DATABASE() AND SPECIFIC_NAME = :p"),
            {"p": PROC}).scalar()
        remaining = [r[0] for r in conn.execute(text(
            "SELECT COLUMN_NAME FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t"), {"t": TABLE})]

    print(f"\ndone: {PROC} now takes {params} parameters")
    print(f"      {TABLE} now has {len(remaining)} columns")


if __name__ == "__main__":
    main()
