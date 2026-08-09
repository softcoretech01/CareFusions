import logging
import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.vendor_catalog import VendorCatalogCreate, VendorCatalogUpdate, VendorCatalogResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/vendor-catalogs", tags=["Procurement - Vendor Catalog"])

SP_NAME = "inventory.SpManageVendorCatalog"

def _map_row(row) -> dict:
    items_raw = row.items if hasattr(row, 'items') and row.items else getattr(row, 'Items', None)
    if isinstance(items_raw, str):
        try:
            items_list = json.loads(items_raw)
        except Exception:
            items_list = []
    elif isinstance(items_raw, list):
        items_list = items_raw
    else:
        items_list = []

    raw_rating = getattr(row, 'rating', getattr(row, 'Rating', None))
    rating_val = float(raw_rating) if raw_rating is not None else 4.5

    return {
        "id":               getattr(row, 'id', getattr(row, 'CatalogId', getattr(row, 'VendorId', 0))),
        "vendorId":         getattr(row, 'vendorId', getattr(row, 'VendorId', 0)),
        "vendorName":       getattr(row, 'vendorName', getattr(row, 'VendorName', '')),
        "vendorCode":       getattr(row, 'vendorCode', getattr(row, 'VendorCode', '')),
        "gstNumber":        getattr(row, 'gstNumber', getattr(row, 'GstNumber', '')),
        "contactPerson":    getattr(row, 'contactPerson', getattr(row, 'ContactPerson', '')),
        "city":             getattr(row, 'city', getattr(row, 'City', '')),
        "rating":           rating_val,
        "activeContracts":  getattr(row, 'activeContracts', getattr(row, 'ActiveContracts', 0)),
        "createdBy":        getattr(row, 'createdBy', getattr(row, 'CreatedBy', 'Admin')),
        "createdDate":      getattr(row, 'createdDate', getattr(row, 'CreatedDate', None)),
        "modifiedBy":       getattr(row, 'modifiedBy', getattr(row, 'ModifiedBy', None)),
        "modifiedDate":     getattr(row, 'modifiedDate', getattr(row, 'ModifiedDate', None)),
        "isActive":         bool(getattr(row, 'isActive', getattr(row, 'IsActive', True))),
        "items":            items_list
    }

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_vendor_catalog(catalog_data: VendorCatalogCreate, db: Session = Depends(get_db)):
    try:
        items_json = json.dumps([item.dict() for item in catalog_data.items]) if catalog_data.items else None
        
        query = text(f"""
            CALL {SP_NAME}(
                'CREATE', 0, :vendorId, :vendorName, :vendorCode, :gstNumber, :contactPerson,
                :city, :rating, :activeContracts, 'Admin', :itemsJson
            )
        """)
        
        result = db.execute(query, {
            "vendorId": catalog_data.vendorId,
            "vendorName": catalog_data.vendorName,
            "vendorCode": catalog_data.vendorCode,
            "gstNumber": catalog_data.gstNumber,
            "contactPerson": catalog_data.contactPerson,
            "city": catalog_data.city,
            "rating": catalog_data.rating,
            "activeContracts": catalog_data.activeContracts,
            "itemsJson": items_json
        }).fetchone()
        
        db.commit()
        return {"id": result.CatalogId, "message": result.Message}
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating Vendor Catalog: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{catalog_id}", response_model=dict)
def update_vendor_catalog(catalog_id: int, catalog_data: VendorCatalogUpdate, db: Session = Depends(get_db)):
    try:
        items_json = json.dumps([item.dict() for item in catalog_data.items]) if catalog_data.items else None

        query = text(f"""
            CALL {SP_NAME}(
                'UPDATE', :catalogId, :vendorId, :vendorName, :vendorCode, :gstNumber, :contactPerson,
                :city, :rating, :activeContracts, 'Admin', :itemsJson
            )
        """)
        
        result = db.execute(query, {
            "catalogId": catalog_id,
            "vendorId": catalog_data.vendorId,
            "vendorName": catalog_data.vendorName,
            "vendorCode": catalog_data.vendorCode,
            "gstNumber": catalog_data.gstNumber,
            "contactPerson": catalog_data.contactPerson,
            "city": catalog_data.city,
            "rating": catalog_data.rating,
            "activeContracts": catalog_data.activeContracts,
            "itemsJson": items_json
        }).fetchone()
        
        db.commit()
        return {"id": result.CatalogId, "message": result.Message}
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating Vendor Catalog: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/", response_model=List[VendorCatalogResponse])
def get_all_vendor_catalogs(db: Session = Depends(get_db)):
    try:
        query = text("CALL `inventory`.`SpGetDynamicVendorCatalog`()")
        results = db.execute(query).fetchall()
        return [_map_row(r) for r in results]
    except Exception as e:
        logger.error(f"Error fetching Vendor Catalogs: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{catalog_id}", response_model=VendorCatalogResponse)
def get_vendor_catalog_by_id(catalog_id: int, db: Session = Depends(get_db)):
    try:
        query = text(f"""
            SELECT 
                r.*,
                (SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'itemId', i.ItemId,
                        'itemCode', i.ItemCode,
                        'itemName', i.ItemName,
                        'category', i.Category,
                        'contractValidUntil', i.ContractValidUntil,
                        'catalogPrice', i.CatalogPrice,
                        'lastUpdate', i.LastUpdate
                    )
                ) FROM `inventory`.`VendorCatalogItem` i WHERE i.CatalogId = r.CatalogId) AS Items
            FROM `inventory`.`VendorCatalog` r
            WHERE r.CatalogId = :catalogId
        """)
        result = db.execute(query, {"catalogId": catalog_id}).fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Vendor Catalog not found")
        return _map_row(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Vendor Catalog {catalog_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{catalog_id}")
def delete_vendor_catalog(catalog_id: int, db: Session = Depends(get_db)):
    try:
        query = text(f"CALL {SP_NAME}('DELETE', :catalogId, 0, NULL, NULL, NULL, NULL, NULL, 0, 0, 'Admin', NULL)")
        result = db.execute(query, {"catalogId": catalog_id}).fetchone()
        db.commit()
        return {"id": result.CatalogId, "message": result.Message}
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting Vendor Catalog {catalog_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
