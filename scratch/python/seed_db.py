from sqlalchemy import create_engine, text
engine = create_engine('mysql+pymysql://root:H3s#2026#01@100.86.181.18:3320/admin')
with engine.connect() as conn:
    conn.execute(text('''
    CREATE TABLE IF NOT EXISTS Master_ProcedureType (
        ProcedureTypeId INT AUTO_INCREMENT PRIMARY KEY,
        TypeName VARCHAR(100) NOT NULL UNIQUE
    );
    '''))
    conn.execute(text('''
    INSERT IGNORE INTO Master_ProcedureType (TypeName) VALUES 
    ('Consultation'), ('Dressing'), ('Injection'), ('Minor Surgery'), 
    ('Major Surgery'), ('Endoscopy'), ('Dialysis'), ('Physiotherapy'), 
    ('ICU Procedure'), ('Emergency Procedure');
    '''))
    conn.commit()
print('Success!')
