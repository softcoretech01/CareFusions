import sys
from pathlib import Path

from sqlalchemy import text

from app.database import engine

SQL_DIR = Path(__file__).parent / "sql"


def split_statements(sql: str):

    statements = []
    i = 0
    lines = sql.splitlines()
    buffer = []
    delimiter = ";"

    for line in lines:
        stripped = line.strip()

        # Skip full-line comments and the USE line (engine is already bound
        # to the target database).
        if stripped.startswith("--") or stripped.upper().startswith("USE "):
            continue

        if stripped.upper().startswith("DELIMITER"):
            # Flush anything buffered, then switch delimiter.
            chunk = "\n".join(buffer).strip()
            if chunk:
                statements.append(chunk)
            buffer = []
            delimiter = stripped.split()[1]
            continue

        buffer.append(line)

        if stripped.endswith(delimiter) and delimiter != ";":
            # End of a custom-delimited block (e.g. procedure body).
            chunk = "\n".join(buffer).strip()
            chunk = chunk[: -len(delimiter)].strip()  # drop trailing $$
            if chunk:
                statements.append(chunk)
            buffer = []
        elif delimiter == ";" and stripped.endswith(";"):
            chunk = "\n".join(buffer).strip().rstrip(";").strip()
            if chunk:
                statements.append(chunk)
            buffer = []

    tail = "\n".join(buffer).strip()
    if tail:
        statements.append(tail)
    return statements


def deploy_file(path: Path):
    print(f"→ Deploying {path.name}")
    sql = path.read_text(encoding="utf-8")
    with engine.begin() as conn:
        for stmt in split_statements(sql):
            first = stmt.lstrip().split(None, 1)[0].upper()
            conn.execute(text(stmt))
            print(f"    ran {first} ...")
    print(f"✓ {path.name} done")


def main():
    targets = sys.argv[1:]
    if targets:
        files = [SQL_DIR / t for t in targets]
    else:
        files = sorted(SQL_DIR.glob("*.sql"))

    if not files:
        print("No .sql files found.")
        return

    for f in files:
        if not f.exists():
            print(f"!! {f} not found, skipping")
            continue
        deploy_file(f)

    print("\nAll schema deployed successfully.")


if __name__ == "__main__":
    main()
