import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv(r'd:\project\CareFusions\Python\.env')
user = os.environ.get('DB_USER')
password = os.environ.get('DB_PASSWORD')
host = os.environ.get('DB_HOST')
port = os.environ.get('DB_PORT')
dbname = os.environ.get('DB_NAME')

url = f"mysql+pymysql://{user}:{password}@{host}:{port}/{dbname}"
engine = create_engine(url)

vw_catalogitem = """
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `inventory`.`vw_catalogitem` AS 
select 
  'MEDICINE' AS `ItemType`,
  `m`.`MedicineId` AS `ItemId`,
  `m`.`MedicineCode` AS `ItemCode`,
  trim(concat(`m`.`GenericName`,' ',coalesce(`m`.`Strength`,''))) AS `ItemName`,
  `c`.`CategoryName` AS `Category`,
  `s`.`SubCategoryName` AS `SubCategory`,
  NULL AS `Department`,
  NULL AS `Brand`,
  NULL AS `Manufacturer`,
  NULL AS `Vendor`,
  `m`.`Unit` AS `Uom`,
  NULL AS `HsnCode`,
  `m`.`Gst` AS `GstPercentage`,
  `m`.`ReorderLevel` AS `ReorderLevel`,
  NULL AS `MinStock`,
  NULL AS `MaxStock`,
  `m`.`BatchTracking` AS `BatchRequired`,
  `m`.`ExpiryRequired` AS `ExpiryRequired`,
  `m`.`ControlledDrug` AS `ControlledDrug`,
  `m`.`PurchasePrice` AS `StandardRate`,
  NULL AS `LastPurchaseRate`,
  `m`.`Barcode` AS `Barcode`,
  `m`.`Status` AS `Status`,
  `m`.`IsDeleted` AS `IsDeleted` 
from `admin`.`Master_Medicine` `m` 
left join `admin`.`Master_Category` `c` on `m`.`CategoryId` = `c`.`CategoryId`
left join `admin`.`Master_SubCategory` `s` on `m`.`SubCategoryId` = `s`.`SubCategoryId`
union all 
select 
  coalesce(`i`.`InventoryType`,'MEDICAL_ITEM') AS `ItemType`,
  `i`.`ItemId` AS `ItemId`,
  `i`.`ItemCode` AS `ItemCode`,
  `i`.`ItemName` AS `ItemName`,
  `i`.`Category` AS `Category`,
  `i`.`SubCategory` AS `SubCategory`,
  `i`.`Department` AS `Department`,
  `i`.`Brand` AS `Brand`,
  `i`.`Manufacturer` AS `Manufacturer`,
  `i`.`Vendor` AS `Vendor`,
  `i`.`Uom` AS `Uom`,
  `i`.`HsnCode` AS `HsnCode`,
  `i`.`GstPercentage` AS `GstPercentage`,
  `i`.`ReorderLevel` AS `ReorderLevel`,
  `i`.`MinStock` AS `MinStock`,
  `i`.`MaxStock` AS `MaxStock`,
  `i`.`BatchRequired` AS `BatchRequired`,
  `i`.`ExpiryRequired` AS `ExpiryRequired`,
  0 AS `ControlledDrug`,
  `i`.`StandardRate` AS `StandardRate`,
  `i`.`LastPurchaseRate` AS `LastPurchaseRate`,
  `i`.`Barcode` AS `Barcode`,
  `i`.`Status` AS `Status`,
  `i`.`IsDeleted` AS `IsDeleted` 
from `admin`.`Master_Item` `i`
"""

with engine.connect() as conn:
    print("Dropping old Vw_CatalogItem")
    conn.execute(text("DROP VIEW IF EXISTS `inventory`.`vw_catalogitem`"))
    print("Creating new Vw_CatalogItem")
    conn.execute(text(vw_catalogitem))
    print("Done")
