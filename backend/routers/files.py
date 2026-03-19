import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional

from db import get_db, Clinic, Task, ClinicFile
from storage import upload_file, get_presigned_url, delete_file
import sse

router = APIRouter(prefix="/api/admin/clinics", tags=["files"])


def require_admin(request: Request):
    # Auth removed for demo
    return {"role": "internal_admin", "preferred_username": "admin"}


@router.post("/{clinic_id}/files")
async def upload_clinic_file(
    clinic_id: str,
    request: Request,
    file: UploadFile = File(...),
    task_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    user = require_admin(request)
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")

    if task_id:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

    content = await file.read()
    file_id = str(uuid.uuid4())
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "bin"
    storage_key = f"{clinic_id}/{file_id}.{ext}"

    ok = upload_file(
        storage_key, content, file.content_type or "application/octet-stream"
    )
    if not ok:
        raise HTTPException(status_code=500, detail="File upload to storage failed")

    record = ClinicFile(
        id=file_id,
        clinic_id=clinic_id,
        task_id=task_id,
        filename=storage_key,
        original_filename=file.filename,
        storage_key=storage_key,
        file_size=len(content),
        mime_type=file.content_type,
        uploaded_by=user.get("preferred_username", "admin"),
    )
    db.add(record)
    db.commit()

    # SSE push to clinic
    await sse.publish(
        clinic_id,
        "file_uploaded",
        {
            "file_id": file_id,
            "task_id": task_id,
            "filename": file.filename,
        },
    )

    return {
        "id": file_id,
        "filename": file.filename,
        "task_id": task_id,
        "size": len(content),
    }


@router.get("/{clinic_id}/files")
def list_clinic_files(clinic_id: str, request: Request, db: Session = Depends(get_db)):
    require_admin(request)
    files = (
        db.query(ClinicFile)
        .filter(ClinicFile.clinic_id == clinic_id)
        .order_by(ClinicFile.uploaded_at.desc())
        .all()
    )
    return [
        {
            "id": f.id,
            "filename": f.original_filename,
            "task_id": f.task_id,
            "file_size": f.file_size,
            "mime_type": f.mime_type,
            "uploaded_by": f.uploaded_by,
            "uploaded_at": f.uploaded_at.isoformat(),
        }
        for f in files
    ]


@router.get("/{clinic_id}/files/{file_id}/download")
def download_file(
    clinic_id: str, file_id: str, request: Request, db: Session = Depends(get_db)
):
    # Auth removed for demo — open download access

    f = (
        db.query(ClinicFile)
        .filter(ClinicFile.id == file_id, ClinicFile.clinic_id == clinic_id)
        .first()
    )
    if not f:
        raise HTTPException(status_code=404, detail="File not found")

    url = get_presigned_url(f.storage_key)
    if not url:
        raise HTTPException(status_code=500, detail="Could not generate download URL")
    return RedirectResponse(url=url)


@router.delete("/{clinic_id}/files/{file_id}")
def delete_clinic_file(
    clinic_id: str, file_id: str, request: Request, db: Session = Depends(get_db)
):
    require_admin(request)
    f = (
        db.query(ClinicFile)
        .filter(ClinicFile.id == file_id, ClinicFile.clinic_id == clinic_id)
        .first()
    )
    if not f:
        raise HTTPException(status_code=404, detail="File not found")

    delete_file(f.storage_key)
    db.delete(f)
    db.commit()
    return {"message": "Deleted"}
