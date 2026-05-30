"""Saaf Bir — FastAPI backend serving the web app + REST API over SQLite."""
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .db import init_db

WEB_DIR = Path(__file__).resolve().parent.parent / "web"

app = FastAPI(title="Saaf Bir")


@app.on_event("startup")
def _startup() -> None:
    init_db()


@app.get("/healthz")
def healthz():
    return {"ok": True}


# routers are included as they're built
from . import routes_data, routes_reports, routes_pickups, routes_export  # noqa: E402

app.include_router(routes_data.router)
app.include_router(routes_reports.router)
app.include_router(routes_pickups.router)
app.include_router(routes_export.router)

# serve the frontend at / (mounted last so /api/* and /healthz win)
app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="web")
