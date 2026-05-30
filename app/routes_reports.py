"""Reports: residents/collectors flag spots or missed pickups, with optional photo."""
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

from .db import get_conn

router = APIRouter(prefix="/api")

MAX_PHOTO = 8 * 1024 * 1024  # 8 MB cap


@router.post("/reports")
async def create_report(
    kind: str = Form(...),
    spot_type: str = Form(""),
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None),
    note: str = Form(""),
    source: str = Form("resident"),
    photo: Optional[UploadFile] = File(None),
):
    if kind not in ("spot", "missed"):
        raise HTTPException(400, "kind must be 'spot' or 'missed'")
    blob = None
    mime = None
    if photo is not None:
        data = await photo.read()
        if len(data) > MAX_PHOTO:
            raise HTTPException(413, "photo too large")
        if data:
            blob = data
            mime = photo.content_type or "image/jpeg"
    with get_conn() as conn:
        cur = conn.execute(
            """INSERT INTO reports (kind, spot_type, lat, lng, note, photo, photo_mime, source)
               VALUES (?,?,?,?,?,?,?,?)""",
            (kind, spot_type, lat, lng, note, blob, mime, source),
        )
        conn.commit()
        rid = cur.lastrowid
    return {"id": rid, "ok": True}


@router.get("/reports")
def list_reports(limit: int = 50):
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT id, kind, spot_type, lat, lng, note, source, created_at,
                      (photo IS NOT NULL) AS has_photo
               FROM reports ORDER BY id DESC LIMIT ?""", (limit,)).fetchall()
    return {"reports": [dict(r) for r in rows]}


@router.get("/reports/{rid}/photo")
def report_photo(rid: int):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT photo, photo_mime FROM reports WHERE id=?", (rid,)).fetchone()
    if not row or row["photo"] is None:
        raise HTTPException(404, "no photo")
    return Response(content=row["photo"], media_type=row["photo_mime"] or "image/jpeg")
