from sqlalchemy import create_engine, inspect
from app.database import engine

def main():
    inspector = inspect(engine)
    columns = inspector.get_columns('IPD_Admission')
    for col in columns:
        print(f"Column: {col['name']}")

if __name__ == '__main__':
    main()
