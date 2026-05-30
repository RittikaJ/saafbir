"""Saaf Bir — FastAPI backend serving the web app + REST API over SQLite/Postgres.

Runs both as a long-lived server (Render via uvicorn) and as a single Vercel
serverless function (Vercel auto-detects this `app` at the `app/main.py`
entrypoint). The startup hook initialises the DB schema; on serverless this
runs per cold start, which is fine because init_db() is idempotent
(CREATE TABLE IF NOT EXISTS). It is wrapped so a transient DB outage during a
cold start cannot crash the whole function — the schema is recreated on the
next request that reaches a route's get_conn() anyway.
"""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .db import init_db

logger = logging.getLogger("saaf")

WEB_DIR = Path(__file__).resolve().parent.parent / "web"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Idempotent schema bootstrap. Don't let a brief DB hiccup crash startup;
    # CREATE TABLE IF NOT EXISTS is safe to retry on the next cold start.
    try:
        init_db()
    except Exception:  # noqa: BLE001 - never block app startup on the DB
        logger.exception("init_db() failed during startup; continuing")
    yield


app = FastAPI(title="Saaf Bir", lifespan=lifespan)


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
