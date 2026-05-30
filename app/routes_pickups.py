"""Collector activity: log a pickup as collected, paid, or skipped (with reason)."""
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .db import get_conn

router = APIRouter(prefix="/api")


class PickupIn(BaseModel):
    household_id: Optional[str] = None
    action: str  # collected | paid | skipped
    reason: Optional[str] = None
    amount: Optional[float] = None


@router.post("/pickups")
def create_pickup(p: PickupIn):
    if p.action not in ("collected", "paid", "skipped"):
        raise HTTPException(400, "action must be collected|paid|skipped")
    with get_conn() as conn:
        cur = conn.execute(
            """INSERT INTO pickups (household_id, action, reason, amount)
               VALUES (?,?,?,?)""",
            (p.household_id, p.action, p.reason, p.amount),
        )
        conn.commit()
        return {"id": cur.lastrowid, "ok": True}


@router.get("/pickups")
def list_pickups(limit: int = 100):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM pickups ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    return {"pickups": [dict(r) for r in rows]}
