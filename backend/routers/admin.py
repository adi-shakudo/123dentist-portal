import json
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

from db import get_db, Clinic, Task, ClinicTask, ClinicFile, PortalUser
from llm import process_instructions
from email_service import send_sent_back_notification, send_welcome_email
from auth import slugify, generate_password, hash_password
import sse

router = APIRouter(prefix="/api/admin", tags=["admin"])


def require_admin(request: Request):
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if user.get("role") not in ("admin", "internal_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ── Clinics ──────────────────────────────────────────────────────────────────


class ClinicCreate(BaseModel):
    name: str
    email_contact: str


class ClinicUpdate(BaseModel):
    name: Optional[str] = None
    email_contact: Optional[str] = None


@router.get("/clinics")
def list_clinics(request: Request, db: Session = Depends(get_db)):
    require_admin(request)
    clinics = db.query(Clinic).order_by(Clinic.created_at.desc()).all()
    result = []
    for c in clinics:
        active = [t for t in c.tasks if t.enabled]
        complete = [t for t in active if t.status == "Complete"]
        progress = round(len(complete) / len(active) * 100) if active else 0
        portal_user = db.query(PortalUser).filter(PortalUser.clinic_id == c.id).first()
        result.append(
            {
                "id": c.id,
                "name": c.name,
                "email_contact": c.email_contact,
                "username": portal_user.username if portal_user else None,
                "progress": progress,
                "tasks_complete": len(complete),
                "tasks_total": len(active),
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
        )
    return result


@router.post("/clinics")
def create_clinic(request: Request, body: ClinicCreate, db: Session = Depends(get_db)):
    require_admin(request)

    # Ensure unique username by appending a counter if needed
    base_slug = slugify(body.name)
    username = base_slug
    counter = 2
    while db.query(PortalUser).filter(PortalUser.username == username).first():
        username = f"{base_slug}-{counter}"
        counter += 1

    clinic = Clinic(name=body.name, email_contact=body.email_contact)
    db.add(clinic)
    db.flush()

    # Instantiate all tasks for this clinic
    all_tasks = db.query(Task).order_by(Task.sort_order).all()
    for task in all_tasks:
        ct = ClinicTask(
            clinic_id=clinic.id, task_id=task.id, enabled=True, status="Not Started"
        )
        db.add(ct)

    # Create portal user
    password = generate_password()
    portal_user = PortalUser(
        username=username,
        password_hash=hash_password(password),
        role="clinic_partner",
        email=body.email_contact,
        clinic_id=clinic.id,
    )
    db.add(portal_user)
    db.commit()
    db.refresh(clinic)

    # Send welcome email
    send_welcome_email(
        clinic_name=body.name,
        email=body.email_contact,
        username=username,
        password=password,
    )

    return {
        "id": clinic.id,
        "name": clinic.name,
        "username": username,
        "message": "Clinic created with all tasks",
    }


@router.get("/clinics/{clinic_id}")
def get_clinic(clinic_id: str, request: Request, db: Session = Depends(get_db)):
    require_admin(request)
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    return {
        "id": clinic.id,
        "name": clinic.name,
        "email_contact": clinic.email_contact,
        "created_at": clinic.created_at.isoformat() if clinic.created_at else None,
    }


@router.patch("/clinics/{clinic_id}")
def update_clinic(
    clinic_id: str, body: ClinicUpdate, request: Request, db: Session = Depends(get_db)
):
    require_admin(request)
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    if body.name is not None:
        clinic.name = body.name
    if body.email_contact is not None:
        clinic.email_contact = body.email_contact
    db.commit()
    return {"message": "Updated"}


# ── Clinic Info ───────────────────────────────────────────────────────────────


class InfoUpdate(BaseModel):
    details: Optional[List[Any]] = None
    contacts: Optional[List[Any]] = None


@router.get("/clinics/{clinic_id}/info")
def get_clinic_info(clinic_id: str, request: Request, db: Session = Depends(get_db)):
    require_admin(request)
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    return {
        "details": json.loads(clinic.details) if clinic.details else [],
        "contacts": json.loads(clinic.contacts) if clinic.contacts else [],
    }


@router.patch("/clinics/{clinic_id}/info")
def update_clinic_info(
    clinic_id: str, body: InfoUpdate, request: Request, db: Session = Depends(get_db)
):
    require_admin(request)
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    if body.details is not None:
        clinic.details = json.dumps(body.details)
    if body.contacts is not None:
        clinic.contacts = json.dumps(body.contacts)
    db.commit()
    return {
        "details": json.loads(clinic.details) if clinic.details else [],
        "contacts": json.loads(clinic.contacts) if clinic.contacts else [],
    }


# ── Clinic Tasks ──────────────────────────────────────────────────────────────


class ClinicTaskUpdate(BaseModel):
    enabled: Optional[bool] = None
    status: Optional[str] = None


VALID_STATUSES = {"Not Started", "Submitted", "Sent Back for Revision", "Complete"}


@router.get("/clinics/{clinic_id}/tasks")
def get_clinic_tasks(clinic_id: str, request: Request, db: Session = Depends(get_db)):
    require_admin(request)
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")

    cts = (
        db.query(ClinicTask)
        .join(Task)
        .filter(ClinicTask.clinic_id == clinic_id)
        .order_by(Task.sort_order)
        .all()
    )
    tasks = []
    for ct in cts:
        t = ct.task
        files = (
            db.query(ClinicFile)
            .filter(ClinicFile.clinic_id == clinic_id, ClinicFile.task_id == t.id)
            .all()
        )
        tasks.append(
            {
                "clinic_task_id": ct.id,
                "task_id": t.id,
                "ref_id": t.ref_id,
                "name": t.name,
                "phase": t.phase,
                "exhibit": t.exhibit,
                "priority": t.priority,
                "is_tbd": t.is_tbd,
                "enabled": ct.enabled,
                "status": ct.status,
                "updated_at": ct.updated_at.isoformat() if ct.updated_at else None,
                "what_to_provide": t.what_to_provide,
                "how_to_prepare": t.how_to_prepare,
                "data_room_path": t.data_room_path,
                "due_week": t.due_week,
                "raw_instructions": t.raw_instructions,
                "files": [
                    {
                        "id": f.id,
                        "filename": f.original_filename,
                        "uploaded_at": f.uploaded_at.isoformat(),
                    }
                    for f in files
                ],
            }
        )
    return tasks


@router.patch("/clinics/{clinic_id}/tasks/{clinic_task_id}")
async def update_clinic_task(
    clinic_id: str,
    clinic_task_id: str,
    body: ClinicTaskUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    require_admin(request)
    ct = (
        db.query(ClinicTask)
        .filter(
            ClinicTask.id == clinic_task_id,
            ClinicTask.clinic_id == clinic_id,
        )
        .first()
    )
    if not ct:
        raise HTTPException(status_code=404, detail="Task not found")

    old_status = ct.status
    if body.enabled is not None:
        ct.enabled = body.enabled
    if body.status is not None:
        if body.status not in VALID_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Must be one of: {VALID_STATUSES}",
            )
        ct.status = body.status
    ct.updated_at = datetime.utcnow()
    db.commit()

    # Email on Sent Back for Revision
    if (
        body.status == "Sent Back for Revision"
        and old_status != "Sent Back for Revision"
    ):
        clinic = ct.clinic
        task = ct.task
        send_sent_back_notification(
            clinic_name=clinic.name,
            clinic_email=clinic.email_contact,
            task_name=task.name,
            task_ref=task.ref_id,
            what_to_provide=task.what_to_provide,
        )

    # SSE push to clinic
    await sse.publish(
        clinic_id,
        "status_changed",
        {
            "task_id": ct.task_id,
            "status": ct.status,
            "enabled": ct.enabled,
        },
    )

    return {"message": "Updated", "status": ct.status}


# ── Task Instructions ─────────────────────────────────────────────────────────


class InstructionUpdate(BaseModel):
    raw: str


@router.get("/tasks")
def list_tasks(request: Request, db: Session = Depends(get_db)):
    require_admin(request)
    tasks = db.query(Task).order_by(Task.sort_order).all()
    return [
        {
            "id": t.id,
            "ref_id": t.ref_id,
            "name": t.name,
            "phase": t.phase,
            "exhibit": t.exhibit,
            "priority": t.priority,
            "is_tbd": t.is_tbd,
            "raw_instructions": t.raw_instructions,
            "what_to_provide": t.what_to_provide,
            "how_to_prepare": t.how_to_prepare,
            "data_room_path": t.data_room_path,
            "due_week": t.due_week,
        }
        for t in tasks
    ]


@router.patch("/tasks/{task_id}/instructions")
def update_task_instructions(
    task_id: str,
    body: InstructionUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    require_admin(request)
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.raw_instructions = body.raw
    # Run through LLM
    try:
        structured = process_instructions(body.raw)
        task.what_to_provide = structured.get("what_to_provide")
        task.how_to_prepare = structured.get("how_to_prepare")
        task.data_room_path = structured.get("data_room_path")
        task.due_week = structured.get("due_week")
        if structured.get("priority") in ("High", "Medium", "Low"):
            task.priority = structured["priority"]
    except Exception as e:
        print(f"[llm] Instruction processing failed: {e}")
        # Still save raw — don't block the admin

    db.commit()
    return {
        "message": "Instructions updated",
        "what_to_provide": task.what_to_provide,
        "how_to_prepare": task.how_to_prepare,
        "data_room_path": task.data_room_path,
        "due_week": task.due_week,
        "priority": task.priority,
    }
