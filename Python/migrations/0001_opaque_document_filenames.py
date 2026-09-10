"""Rename patient documents stored under guessable names.

Patient documents used to be written as ``<UHID>_<original filename>`` and
served from a public static mount, so the URLs could be derived from a UHID
without ever listing the directory. Uploads now use a random name and are
served only through the authenticated /api/v1/files endpoint, but files written
before that change keep their old names -- and a name that leaks a UHID is
still a name that leaks a UHID, whatever serves it.

This renames them on disk and repoints the database rows in the same pass.

Safe to run more than once: a row that no longer matches the old pattern is
skipped, and a row whose file is already missing is reported rather than
touched.

    python migrations/0001_opaque_document_filenames.py            # dry run
    python migrations/0001_opaque_document_filenames.py --apply    # do it
"""

import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text                                   # noqa: E402
from app.database import SessionLocal                         # noqa: E402

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

SELECT_LEGACY = text("""
    SELECT DocumentId, Uhid, DocumentName, FilePath
    FROM registration.PatientDocument
    WHERE FilePath LIKE '/uploads/UHID-%'
""")

REPOINT = text("""
    UPDATE registration.PatientDocument
    SET FilePath = :new_path
    WHERE DocumentId = :doc_id
""")


def main(apply: bool) -> int:
    db = SessionLocal()
    renamed = repointed_only = missing = 0
    try:
        rows = db.execute(SELECT_LEGACY).fetchall()
        print(f"{len(rows)} document row(s) still stored under a UHID-derived name")

        # One file can back several rows; rename it once and reuse the new name.
        new_name_for: dict[str, str] = {}

        for row in rows:
            old_name = os.path.basename(row.FilePath)
            old_path = os.path.join(UPLOAD_DIR, old_name)

            if old_name in new_name_for:
                new_name = new_name_for[old_name]
            elif os.path.isfile(old_path):
                ext = os.path.splitext(old_name)[1]
                new_name = f"{uuid.uuid4().hex}{ext}"
                if apply:
                    os.rename(old_path, os.path.join(UPLOAD_DIR, new_name))
                new_name_for[old_name] = new_name
                renamed += 1
            else:
                # The row points at a file that is not there. Repointing it would
                # invent a path, so leave it and report it.
                missing += 1
                print(f"  MISSING  doc {row.DocumentId}: {old_name}")
                continue

            if apply:
                db.execute(REPOINT, {"new_path": f"/uploads/{new_name}", "doc_id": row.DocumentId})
            repointed_only += 1

        if apply:
            db.commit()

        print()
        print(f"  files renamed        : {renamed}")
        print(f"  rows repointed       : {repointed_only}")
        print(f"  rows with no file    : {missing}")
        print()
        print("APPLIED" if apply else "DRY RUN — nothing changed. Re-run with --apply.")
        return 0
    except Exception as exc:
        db.rollback()
        print(f"FAILED, rolled back: {exc}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main(apply="--apply" in sys.argv))
