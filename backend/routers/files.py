from fastapi import APIRouter, HTTPException, Depends, Request, Response
from datetime import datetime, timezone
from database import db
from auth import require_auth
import base64
import uuid

router = APIRouter()

_temp_downloads = {}


@router.post("/download-file")
async def download_file(request: Request):
    body = await request.body()
    filename = request.headers.get("X-Filename", "download.xlsx")
    content_type = request.headers.get("X-Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    download_id = str(uuid.uuid4())
    _temp_downloads[download_id] = {
        "data": body, "filename": filename, "content_type": content_type,
        "created": datetime.now(timezone.utc)
    }
    return {"download_id": download_id}


@router.get("/download-file/{download_id}")
async def get_download_file(download_id: str):
    entry = _temp_downloads.pop(download_id, None)
    if not entry:
        raise HTTPException(status_code=404, detail="Download expired or not found")
    return Response(
        content=entry["data"], media_type=entry["content_type"],
        headers={"Content-Disposition": f'attachment; filename="{entry["filename"]}"'}
    )


@router.post("/projects/{project_id}/gantt")
async def upload_gantt_chart(project_id: str, request: Request, user: dict = Depends(require_auth)):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    body = await request.body()
    filename = request.headers.get("X-Filename", "gantt.png")
    content_type = request.headers.get("X-Content-Type", "image/png")
    encoded = base64.b64encode(body).decode("utf-8")
    await db.projects.update_one({"id": project_id}, {"$set": {
        "gantt_chart": {"filename": filename, "content_type": content_type, "data": encoded, "uploaded_at": datetime.now(timezone.utc).isoformat()},
        "updated_at": datetime.now(timezone.utc).isoformat()
    }})
    return {"message": "Gantt chart uploaded", "filename": filename}


@router.delete("/projects/{project_id}/gantt")
async def delete_gantt_chart(project_id: str, user: dict = Depends(require_auth)):
    await db.projects.update_one({"id": project_id}, {"$unset": {"gantt_chart": ""}})
    return {"message": "Gantt chart removed"}


@router.get("/projects/{project_id}/gantt")
async def get_gantt_chart(project_id: str):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0, "gantt_chart": 1})
    if not project or not project.get("gantt_chart"):
        raise HTTPException(status_code=404, detail="No Gantt chart found")
    gc = project["gantt_chart"]
    data = base64.b64decode(gc["data"])
    return Response(content=data, media_type=gc.get("content_type", "image/png"),
                    headers={"Content-Disposition": f'inline; filename="{gc.get("filename", "gantt.png")}"'})
