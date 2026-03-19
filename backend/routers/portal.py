from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from db import get_db, Clinic, Task, ClinicTask, ClinicFile
import sse

router = APIRouter(prefix="/api/portal", tags=["portal"])


def get_clinic_from_session(request: Request, db: Session) -> Clinic:
    # Auth removed for demo — use ?clinic_id= query param or first clinic
    clinic_id = request.query_params.get("clinic_id")
    if clinic_id:
        clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    else:
        clinic = db.query(Clinic).first()
    if not clinic:
        raise HTTPException(
            status_code=404,
            detail="No clinic found. Create a clinic via the admin panel first.",
        )
    return clinic


@router.get("/me")
def get_me(request: Request, db: Session = Depends(get_db)):
    clinic = get_clinic_from_session(request, db)
    active = [t for t in clinic.tasks if t.enabled]
    complete = [t for t in active if t.status == "Complete"]
    return {
        "clinic_id": clinic.id,
        "clinic_name": clinic.name,
        "progress": round(len(complete) / len(active) * 100) if active else 0,
        "tasks_complete": len(complete),
        "tasks_total": len(active),
    }


@router.get("/tasks")
def get_portal_tasks(request: Request, db: Session = Depends(get_db)):
    clinic = get_clinic_from_session(request, db)

    cts = (
        db.query(ClinicTask)
        .join(Task)
        .filter(ClinicTask.clinic_id == clinic.id, ClinicTask.enabled == True)
        .order_by(Task.sort_order)
        .all()
    )

    tasks = []
    for ct in cts:
        t = ct.task
        files = (
            db.query(ClinicFile)
            .filter(
                ClinicFile.clinic_id == clinic.id,
                ClinicFile.task_id == t.id,
            )
            .all()
        )
        tasks.append(
            {
                "task_id": t.id,
                "ref_id": t.ref_id,
                "name": t.name,
                "phase": t.phase,
                "exhibit": t.exhibit,
                "priority": t.priority,
                "is_tbd": t.is_tbd,
                "status": ct.status,
                "what_to_provide": t.what_to_provide,
                "how_to_prepare": t.how_to_prepare,
                "data_room_path": t.data_room_path,
                "due_week": t.due_week,
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


@router.get("/progress")
def get_progress(request: Request, db: Session = Depends(get_db)):
    clinic = get_clinic_from_session(request, db)

    cts = (
        db.query(ClinicTask)
        .join(Task)
        .filter(ClinicTask.clinic_id == clinic.id, ClinicTask.enabled == True)
        .all()
    )

    by_exhibit: dict[str, dict] = {}
    for ct in cts:
        ex = ct.task.exhibit
        if ex not in by_exhibit:
            by_exhibit[ex] = {"total": 0, "complete": 0}
        by_exhibit[ex]["total"] += 1
        if ct.status == "Complete":
            by_exhibit[ex]["complete"] += 1

    total = sum(v["total"] for v in by_exhibit.values())
    complete = sum(v["complete"] for v in by_exhibit.values())
    overall = round(complete / total * 100) if total else 0

    sections = [
        {
            "exhibit": ex,
            "total": v["total"],
            "complete": v["complete"],
            "pct": round(v["complete"] / v["total"] * 100) if v["total"] else 0,
        }
        for ex, v in by_exhibit.items()
    ]

    return {
        "overall_pct": overall,
        "tasks_complete": complete,
        "tasks_total": total,
        "sections": sections,
    }


@router.get("/events")
async def portal_events(request: Request, db: Session = Depends(get_db)):
    """SSE endpoint — pushes real-time events to the clinic's browser."""
    clinic = get_clinic_from_session(request, db)
    q = sse.subscribe(clinic.id)

    return StreamingResponse(
        sse.event_generator(clinic.id, q),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
