from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Any, List
import logging
import os
import shutil

from app.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["Patient Documents"])

SP_NAME = "registration.SpPatientDocument"

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def _call_sp(db: Session, opt: str, **kwargs) -> Any:
    params = {
        "p_Opt": opt,
        "p_DocumentId": kwargs.get("DocumentId", None),
        "p_Uhid": kwargs.get("Uhid", None),
        "p_DocumentType": kwargs.get("DocumentType", None),
        "p_DocumentName": kwargs.get("DocumentName", None),
        "p_FilePath": kwargs.get("FilePath", None),
        "p_Size": kwargs.get("Size", None),
        "p_UploadedBy": kwargs.get("UploadedBy", "Admin")
    }

    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_DocumentId, :p_Uhid, :p_DocumentType, 
            :p_DocumentName, :p_FilePath, :p_Size, :p_UploadedBy
        )
    """)
    result = db.execute(sql, params)
    return result

def _map_row_to_dict(row) -> dict:
    d = dict(row._mapping)
    if "UploadDate" in d and d["UploadDate"] is not None:
        d["UploadDate"] = str(d["UploadDate"])
    return d

@router.get("/{uhid}")
def get_documents_by_uhid(uhid: str, db: Session = Depends(get_db)):
    try:
        result = _call_sp(db, "SELECT_BY_UHID", Uhid=uhid)
        rows = result.fetchall()
        return [_map_row_to_dict(r) for r in rows]
    except Exception as e:
        logger.error(f"[GET /documents/{uhid}] Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch documents")

@router.post("/")
async def upload_document(
    uhid: str = Form(...),
    documentType: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        file_name = file.filename
        file_path = os.path.join(UPLOAD_DIR, f"{uhid}_{file_name}")
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        file_size_bytes = os.path.getsize(file_path)
        size_str = f"{(file_size_bytes / (1024 * 1024)):.2f} MB"
        
        rel_path = f"/uploads/{uhid}_{file_name}"
        
        result = _call_sp(
            db, 
            "INSERT", 
            Uhid=uhid,
            DocumentType=documentType,
            DocumentName=file_name,
            FilePath=rel_path,
            Size=size_str
        )
        row = result.fetchone()
        db.commit()
        return _map_row_to_dict(row)
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /documents/] Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload document")

@router.delete("/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    try:
        # We could also SELECT the row first and delete the physical file, but for now just delete DB record
        _call_sp(db, "DELETE", DocumentId=document_id)
        db.commit()
        return {"detail": "Document deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /documents/{document_id}] Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete document")
