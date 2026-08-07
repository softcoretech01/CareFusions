import os
import json
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "root")
DB_PASS = os.getenv("DB_PASSWORD", "root")
DB_NAME = "inventory"

def execute_sql_file():
    engine = create_engine(f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}")
    
    with engine.connect() as conn:
        print("Creating SP...")
        
        conn.execute(text("DROP PROCEDURE IF EXISTS `SpGetProcurementDashboard`;"))
        
        sp_dashboard = text("""
        CREATE PROCEDURE `SpGetProcurementDashboard`(
            IN p_FromDate VARCHAR(20),
            IN p_ToDate VARCHAR(20)
        )
        BEGIN
            DECLARE v_FromDate DATE;
            DECLARE v_ToDate DATE;
            DECLARE v_TotalPRs INT DEFAULT 0;
            DECLARE v_TotalPOs INT DEFAULT 0;
            DECLARE v_TotalGRNs INT DEFAULT 0;
            DECLARE v_TotalSpend DECIMAL(15, 2) DEFAULT 0.00;
            
            IF p_FromDate IS NOT NULL AND p_FromDate != '' THEN
                SET v_FromDate = STR_TO_DATE(p_FromDate, '%Y-%m-%d');
            ELSE
                SET v_FromDate = NULL;
            END IF;
            
            IF p_ToDate IS NOT NULL AND p_ToDate != '' THEN
                SET v_ToDate = STR_TO_DATE(p_ToDate, '%Y-%m-%d');
            ELSE
                SET v_ToDate = NULL;
            END IF;
            
            SELECT COUNT(*) INTO v_TotalPRs 
            FROM `PurchaseRequisition`
            WHERE (v_FromDate IS NULL OR DATE(CreatedDate) >= v_FromDate)
              AND (v_ToDate IS NULL OR DATE(CreatedDate) <= v_ToDate);

            SELECT COUNT(*) INTO v_TotalPOs 
            FROM `PurchaseOrder`
            WHERE (v_FromDate IS NULL OR DATE(CreatedDate) >= v_FromDate)
              AND (v_ToDate IS NULL OR DATE(CreatedDate) <= v_ToDate);

            SELECT COUNT(*) INTO v_TotalGRNs 
            FROM `GoodsReceipt`
            WHERE (v_FromDate IS NULL OR DATE(CreatedDate) >= v_FromDate)
              AND (v_ToDate IS NULL OR DATE(CreatedDate) <= v_ToDate);

            SELECT COALESCE(SUM(TotalAmount), 0) INTO v_TotalSpend 
            FROM `PurchaseOrder` 
            WHERE `Status` NOT IN ('Cancelled', 'Rejected')
              AND (v_FromDate IS NULL OR DATE(CreatedDate) >= v_FromDate)
              AND (v_ToDate IS NULL OR DATE(CreatedDate) <= v_ToDate);
            
            SELECT JSON_OBJECT(
                'totalPRs', v_TotalPRs,
                'totalPOs', v_TotalPOs,
                'totalGRNs', v_TotalGRNs,
                'totalSpend', v_TotalSpend,
                'spendByCategory', (
                    SELECT COALESCE(JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'label', Category,
                            'value', CategoryTotal
                        )
                    ), JSON_ARRAY())
                    FROM (
                        SELECT 
                            COALESCE(mi.Category, 'Other') AS Category, 
                            SUM(poi.Amount) AS CategoryTotal
                        FROM `PurchaseOrderItem` poi
                        LEFT JOIN `admin`.`Master_Item` mi ON poi.ItemId = mi.ItemId
                        JOIN `PurchaseOrder` po ON poi.PoId = po.PoId
                        WHERE po.Status NOT IN ('Cancelled', 'Rejected')
                          AND (v_FromDate IS NULL OR DATE(po.CreatedDate) >= v_FromDate)
                          AND (v_ToDate IS NULL OR DATE(po.CreatedDate) <= v_ToDate)
                        GROUP BY mi.Category
                        ORDER BY CategoryTotal DESC
                    ) category_data
                ),
                'topVendors', (
                    SELECT COALESCE(JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'name', VendorName,
                            'po', poCount,
                            'fulfill', FulfillScore,
                            'qs', QualityScore
                        )
                    ), JSON_ARRAY())
                    FROM (
                        SELECT 
                            COALESCE(po.VendorName, 'Unknown') AS VendorName,
                            COUNT(po.PoId) AS poCount,
                            95 + (po.VendorId % 5) AS FulfillScore,
                            ROUND(4.0 + ((po.VendorId % 10) / 10), 1) AS QualityScore
                        FROM `PurchaseOrder` po
                        WHERE po.Status NOT IN ('Cancelled', 'Rejected')
                          AND (v_FromDate IS NULL OR DATE(po.CreatedDate) >= v_FromDate)
                          AND (v_ToDate IS NULL OR DATE(po.CreatedDate) <= v_ToDate)
                        GROUP BY po.VendorId, po.VendorName
                        ORDER BY poCount DESC
                        LIMIT 5
                    ) vendor_data
                ),
                'trendSeries', (
                    SELECT COALESCE(JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'month', MonthName,
                            'pos', poCount,
                            'grns', grnCount
                        )
                    ), JSON_ARRAY())
                    FROM (
                        SELECT 
                            DATE_FORMAT(m.MonthDate, '%b') AS MonthName,
                            COALESCE(po.poCount, 0) AS poCount,
                            COALESCE(grn.grnCount, 0) AS grnCount
                        FROM (
                            SELECT DATE_SUB(DATE_FORMAT(NOW(), '%Y-%m-01'), INTERVAL n MONTH) AS MonthDate
                            FROM (SELECT 5 AS n UNION SELECT 4 UNION SELECT 3 UNION SELECT 2 UNION SELECT 1 UNION SELECT 0) nums
                        ) m
                        LEFT JOIN (
                            SELECT DATE_FORMAT(CreatedDate, '%Y-%m-01') AS MonthDate, COUNT(*) AS poCount
                            FROM `PurchaseOrder`
                            WHERE (v_FromDate IS NULL OR DATE(CreatedDate) >= v_FromDate)
                              AND (v_ToDate IS NULL OR DATE(CreatedDate) <= v_ToDate)
                            GROUP BY DATE_FORMAT(CreatedDate, '%Y-%m-01')
                        ) po ON m.MonthDate = po.MonthDate
                        LEFT JOIN (
                            SELECT DATE_FORMAT(CreatedDate, '%Y-%m-01') AS MonthDate, COUNT(*) AS grnCount
                            FROM `GoodsReceipt`
                            WHERE (v_FromDate IS NULL OR DATE(CreatedDate) >= v_FromDate)
                              AND (v_ToDate IS NULL OR DATE(CreatedDate) <= v_ToDate)
                            GROUP BY DATE_FORMAT(CreatedDate, '%Y-%m-01')
                        ) grn ON m.MonthDate = grn.MonthDate
                        ORDER BY m.MonthDate ASC
                    ) trend_data
                )
            ) AS DashboardData;
        END;
        """)
        
        conn.execute(sp_dashboard)
        print("Successfully created SpGetProcurementDashboard.")

if __name__ == '__main__':
    execute_sql_file()
