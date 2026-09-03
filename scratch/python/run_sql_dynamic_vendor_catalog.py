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
        print("Creating SpGetDynamicVendorCatalog procedure...")
        
        conn.execute(text("DROP PROCEDURE IF EXISTS `SpGetDynamicVendorCatalog`;"))
        
        sp_dynamic_catalog = text("""
        CREATE PROCEDURE `SpGetDynamicVendorCatalog`()
        BEGIN
            SELECT 
                v.VendorId AS id,
                v.VendorId AS vendorId,
                v.VendorCode AS vendorCode,
                v.VendorName AS vendorName,
                COALESCE(v.GstNumber, '') AS gstNumber,
                COALESCE(v.ContactPerson, '') AS contactPerson,
                COALESCE(v.City, '') AS city,
                COALESCE((
                    SELECT ROUND(AVG(
                        CASE
                            WHEN grn.ReceivedDate <= po.ExpectedDelivery THEN 5.0
                            WHEN DATEDIFF(grn.ReceivedDate, po.ExpectedDelivery) <= 3 THEN 4.0
                            WHEN DATEDIFF(grn.ReceivedDate, po.ExpectedDelivery) <= 7 THEN 3.0
                            ELSE 2.0
                        END
                    ), 1)
                    FROM inventory.GoodsReceipt grn
                    JOIN inventory.PurchaseOrder po ON grn.PoNumber = po.PoNumber
                    WHERE grn.VendorId = v.VendorId
                ), 0.0) AS rating,
                (
                    SELECT COUNT(DISTINCT vq.QuotationId) 
                    FROM inventory.VendorQuotation vq 
                    WHERE vq.VendorId = v.VendorId AND vq.IsActive = 1
                ) AS activeContracts,
                (
                    SELECT COALESCE(JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'itemId', sub.ItemId,
                            'itemCode', sub.ItemCode,
                            'itemName', sub.ItemName,
                            'category', sub.Category,
                            'contractValidUntil', sub.ContractValidUntil,
                            'catalogPrice', sub.CatalogPrice,
                            'lastUpdate', sub.LastUpdate
                        )
                    ), JSON_ARRAY())
                    FROM (
                        SELECT 
                            mi.ItemId,
                            mi.ItemCode,
                            mi.ItemName,
                            mi.Category,
                            MAX(DATE_FORMAT(COALESCE(vq.ValidityDate, CURRENT_DATE), '%Y-%m-%d')) AS ContractValidUntil,
                            MAX(COALESCE(vqi.QuotedRate, poi.Rate, 0.00)) AS CatalogPrice,
                            MAX(DATE_FORMAT(COALESCE(vq.CreatedDate, po.CreatedDate, CURRENT_DATE), '%Y-%m-%d')) AS LastUpdate,
                            COALESCE(vq.VendorId, po.VendorId, rfqv.VendorId) AS VendorId
                        FROM admin.Master_Item mi
                        LEFT JOIN inventory.VendorQuotationItem vqi ON mi.ItemId = vqi.ItemId
                        LEFT JOIN inventory.VendorQuotation vq ON vqi.QuotationId = vq.QuotationId
                        LEFT JOIN inventory.PurchaseOrderItem poi ON mi.ItemId = poi.ItemId
                        LEFT JOIN inventory.PurchaseOrder po ON poi.PoId = po.PoId
                        LEFT JOIN inventory.RequestForQuotationItem rfqi ON mi.ItemId = rfqi.ItemId
                        LEFT JOIN inventory.RequestForQuotationVendor rfqv ON rfqi.RfqId = rfqv.RfqId
                        WHERE mi.ItemName IS NOT NULL AND mi.ItemName != 'null'
                        GROUP BY mi.ItemId, mi.ItemCode, mi.ItemName, mi.Category, COALESCE(vq.VendorId, po.VendorId, rfqv.VendorId)
                    ) sub
                    WHERE sub.VendorId = v.VendorId
                ) AS items
            FROM admin.Master_Vendor v
            WHERE v.Status = 'Active' AND v.IsDeleted = 0
            ORDER BY v.VendorId DESC;
        END;
        """)
        
        conn.execute(sp_dynamic_catalog)
        conn.commit()
        print("Successfully created SpGetDynamicVendorCatalog.")

if __name__ == '__main__':
    execute_sql_file()
