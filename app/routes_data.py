"""Dashboard aggregates computed from the imported FY26 household data."""
from fastapi import APIRouter

from .db import get_conn

router = APIRouter(prefix="/api")

MONTH_ORDER = ["Apr-2025", "May-2025", "Jun-2025", "Jul-2025", "Aug-2025", "Sep-2025",
               "Oct-2025", "Nov-2025", "Dec-2025", "Jan-2026", "Feb-2026", "Mar-2026"]


@router.get("/dashboard")
def dashboard():
    with get_conn() as conn:
        total = conn.execute("SELECT COUNT(*) c FROM households").fetchone()["c"]

        by_type = {r["type"] or "Unknown": r["c"] for r in conn.execute(
            "SELECT type, COUNT(*) c FROM households GROUP BY type").fetchall()}

        by_village = {r["village"] or "Unknown": r["c"] for r in conn.execute(
            "SELECT village, COUNT(*) c FROM households GROUP BY village").fetchall()}

        # fee totals
        fees = conn.execute(
            """SELECT COALESCE(SUM(monthly_fee*service_months),0) due,
                      COALESCE(SUM(fee_paid),0) paid,
                      COALESCE(SUM(current_balance),0) outstanding
               FROM households""").fetchone()
        due, paid = fees["due"], fees["paid"]
        collection_rate = round(paid / due * 100, 1) if due else 0.0

        # active vs inactive — based on each household's most recent non-empty month status
        active = conn.execute(
            """SELECT COUNT(*) c FROM households h
               WHERE EXISTS (
                 SELECT 1 FROM household_months m
                 WHERE m.household_id = h.id AND m.status LIKE 'Active%')"""
        ).fetchone()["c"]
        active_pct = round(active / total * 100, 1) if total else 0.0

        # per-ward: household count + active rate (top wards by size)
        wards = []
        for r in conn.execute(
            """SELECT village, ward, COUNT(*) c FROM households
               GROUP BY village, ward ORDER BY c DESC LIMIT 6""").fetchall():
            w_active = conn.execute(
                """SELECT COUNT(*) c FROM households h
                   WHERE h.village=? AND h.ward=? AND EXISTS (
                     SELECT 1 FROM household_months m
                     WHERE m.household_id=h.id AND m.status LIKE 'Active%')""",
                (r["village"], r["ward"])).fetchone()["c"]
            wards.append({
                "ward": f"{r['village']} W{r['ward']}",
                "households": r["c"],
                "active_pct": round(w_active / r["c"] * 100, 1) if r["c"] else 0.0,
            })

        # monthly trend: active households per month
        rawtrend = {r["month"]: r["c"] for r in conn.execute(
            """SELECT month, COUNT(*) c FROM household_months
               WHERE status LIKE 'Active%' GROUP BY month""").fetchall()}
        trend = [{"month": m, "active": rawtrend.get(m, 0)} for m in MONTH_ORDER]

    return {
        "total_households": total,
        "by_type": by_type,
        "by_village": by_village,
        "active_households": active,
        "active_pct": active_pct,
        "fee_due": round(due, 0),
        "fee_paid": round(paid, 0),
        "fee_outstanding": round(fees["outstanding"] or 0, 0),
        "collection_rate": collection_rate,
        "wards": wards,
        "trend": trend,
    }
