"""Apply Python/sql/pro_workflow_hardening.sql.

The migration is written to be replayable, but MariaDB does not accept
"IF NOT EXISTS" on every clause (CHECK constraints in particular), so this
runner treats the "it is already there" errors as success and reports them
separately from real failures.

Nothing here drops a column, deletes a row, or rewrites data.

    Python/venv/Scripts/python.exe Python/apply_pro_migration.py [--dry-run]
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text  # noqa: E402

from app.database import SessionLocal  # noqa: E402

SQL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sql",
                        "pro_workflow_hardening.sql")

# Errors that mean "this part of the migration is already applied".
ALREADY_APPLIED = (
    "duplicate column name",
    "duplicate key name",
    "already exists",
    "duplicate check constraint name",
    "check constraint",
)


def statements(sql: str):
    """Split the script into statements, dropping comment-only noise.

    The script has no strings containing semicolons, so a plain split is safe
    and avoids pulling in a SQL parser for a dozen DDL statements.
    """
    without_comments = re.sub(r"^\s*--.*$", "", sql, flags=re.MULTILINE)
    for chunk in without_comments.split(";"):
        stmt = chunk.strip()
        if stmt:
            yield stmt


def label(stmt: str) -> str:
    flat = " ".join(stmt.split())
    return flat[:110] + ("..." if len(flat) > 110 else "")


def main() -> int:
    dry_run = "--dry-run" in sys.argv

    with open(SQL_PATH, encoding="utf-8") as fh:
        sql = fh.read()

    stmts = list(statements(sql))
    print(f"{len(stmts)} statements in {os.path.basename(SQL_PATH)}"
          + (" (dry run)" if dry_run else ""))
    print()

    applied, skipped, failed = [], [], []
    db = SessionLocal()
    try:
        for stmt in stmts:
            if dry_run:
                print("  WOULD RUN :", label(stmt))
                continue
            try:
                db.execute(text(stmt))
                db.commit()
                applied.append(label(stmt))
                print("  applied   :", label(stmt))
            except Exception as exc:  # noqa: BLE001 - the message is the signal
                db.rollback()
                msg = str(exc).lower()
                if any(marker in msg for marker in ALREADY_APPLIED):
                    skipped.append(label(stmt))
                    print("  already   :", label(stmt))
                else:
                    failed.append((label(stmt), str(exc).splitlines()[0][:200]))
                    print("  FAILED    :", label(stmt))
                    print("              ", str(exc).splitlines()[0][:200])
    finally:
        db.close()

    if dry_run:
        return 0

    print()
    print(f"applied {len(applied)}, already-present {len(skipped)}, failed {len(failed)}")
    if failed:
        print()
        print("FAILURES:")
        for stmt, err in failed:
            print(" -", stmt)
            print("   ", err)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
