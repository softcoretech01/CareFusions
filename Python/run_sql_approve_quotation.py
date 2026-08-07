import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASS = os.getenv("DB_PASSWORD", "root")
DB_NAME = "inventory"
DB_PORT = os.getenv("DB_PORT", "3306")

def execute_sql_file():
    engine = create_engine(f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}")
    
    drop_sp = "DROP PROCEDURE IF EXISTS `SpApproveVendorQuotation`;"
    
    create_sp = """
    CREATE PROCEDURE `SpApproveVendorQuotation` (
        IN p_RfqNo VARCHAR(50),
        IN p_ApprovedQuotationNo VARCHAR(50),
        IN p_ActionBy VARCHAR(100)
    )
    BEGIN
        -- First, mark all quotations for this RFQ as 'Rejected'
        UPDATE `VendorQuotation`
        SET `Status` = 'Rejected',
            `ModifiedBy` = p_ActionBy,
            `ModifiedDate` = CURRENT_TIMESTAMP
        WHERE `RfqNo` = p_RfqNo;

        -- Then, mark the specific one as 'Approved'
        UPDATE `VendorQuotation`
        SET `Status` = 'Approved',
            `ModifiedBy` = p_ActionBy,
            `ModifiedDate` = CURRENT_TIMESTAMP
        WHERE `RfqNo` = p_RfqNo 
          AND `QuotationNo` = p_ApprovedQuotationNo;

        SELECT 'Approval workflow completed successfully' AS Message;
    END;
    """

    with engine.begin() as conn:
        print("Creating SpApproveVendorQuotation SP...")
        conn.execute(text(drop_sp))
        conn.execute(text(create_sp))
        print("Successfully created SpApproveVendorQuotation.")

if __name__ == '__main__':
    execute_sql_file()
