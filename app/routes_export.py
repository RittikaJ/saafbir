"""Export: download the whole SQLite DB (SQLite only), or any table as CSV (both backends)."""
import csv
import io

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse

from .db import DB_PATH, IS_PG, TABLE_COLUMNS, get_conn

router = APIRouter(prefix="/api/export")

EXPORTABLE = set(TABLE_COLUMNS)


@router.get("/db")
def export_db():
    """Download the entire database as one file.

    Only meaningful on SQLite (the whole DB is a single portable file). On
    Postgres there is no local file to ship, so we return a clear message and
    point the caller at the per-table CSV exports instead.
    """
    if IS_PG:
        return JSONResponse(
            status_code=409,
            content={
                "error": "single-file DB export is unavailable on Postgres",
                "hint": "use the per-table CSV exports at /api/export/{table}.csv "
                        "(households, household_months, reports, pickups, camps), "
                        "or pg_dump the managed database directly.",
            },
        )
    if not DB_PATH.exists():
        raise HTTPException(404, "no database yet")
    return FileResponse(DB_PATH, media_type="application/x-sqlite3", filename="saaf.db")


@router.get("/{table}.csv")
def export_table_csv(table: str):
    if table not in EXPORTABLE:
        raise HTTPException(404, "unknown table")
    # never stream photo BLOBs into a CSV
    cols = [c for c in TABLE_COLUMNS[table] if c != "photo"]
    with get_conn() as conn:
        rows = conn.execute(f"SELECT {', '.join(cols)} FROM {table}").fetchall()

    def gen():
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(cols)
        yield buf.getvalue()
        for r in rows:
            buf.seek(0)
            buf.truncate(0)
            w.writerow([r[c] for c in cols])
            yield buf.getvalue()

    return StreamingResponse(
        gen(), media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={table}.csv"})
