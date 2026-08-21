import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/upload", tags=["Upload"])

# Anchored to the Python/ directory rather than os.getcwd(): the working
# directory depends on where uvicorn was launched from, so uploads used to be
# written to one folder and served from another, and files 404'd.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/")
async def upload_file(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
    
    try:
        # Generate a unique filename to prevent collisions
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
            
        # Return the path that the frontend will use to access it via StaticFiles
        # The frontend will prepend the backend API base url if needed,
        # but storing the relative path '/uploads/...' is usually best.
        return {"url": f"/uploads/{unique_filename}"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
