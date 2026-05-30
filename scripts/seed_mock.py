"""Seed a SMALL, realistic mock dataset into the active backend.

Purpose: the full FY26 import (1,184 households) times out over a throttled
network. This inserts ~80 households + 12 months each + a few sample reports —
small enough to complete quickly — so the dashboard shows real-looking numbers.

Commits incrementally so partial progress persists even on a slow link.
Run:  uv run python scripts/seed_mock.py
"""
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.db import get_conn, init_db  # noqa: E402

random.seed(42)

MONTHS = ["Apr-2025", "May-2025", "Jun-2025", "Jul-2025", "Aug-2025", "Sep-2025",
          "Oct-2025", "Nov-2025", "Dec-2025", "Jan-2026", "Feb-2026", "Mar-2026"]
VILLAGES = [("Bir", ["1", "2", "3", "4", "5"]), ("Gunehar", ["1", "2", "3", "4"])]
TYPES = ["Residential"] * 7 + ["Commercial"] * 2 + ["Other"]
ACTIVE = "Active - Willing to Pay User Fee"
INACTIVE = "Inactive - No waste generation"
FIRST = ["Meer", "Phula", "Tulsi", "Devanand", "Hari", "Rajni", "Sita", "Mohan",
         "Kamla", "Suresh", "Anita", "Vijay", "Geeta", "Ramesh", "Pooja"]
LAST = ["Chand", "Devi", "Ram", "Kumar", "Lal", "Singh", "Sharma", "Negi", "Thakur"]


def main():
    init_db()
    with get_conn() as conn:
        conn.execute("DELETE FROM household_months")
        conn.execute("DELETE FROM households")
        conn.commit()

        n = 0
        for village, wards in VILLAGES:
            count = 45 if village == "Bir" else 35
            for i in range(count):
                hid = f"{village[:3].upper()}-{i+1}"
                htype = random.choice(TYPES)
                fee = 50 if htype == "Residential" else random.choice([100, 150, 200])
                ward = random.choice(wards)
                months_active = random.randint(0, 12)
                paid = fee * months_active
                conn.execute(
                    """INSERT INTO households
                       (id,village,ward,name,phone,type,monthly_fee,prev_balance,
                        service_months,fee_paid,current_balance)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                    (hid, village, ward,
                     f"{random.choice(FIRST)} {random.choice(LAST)}",
                     f"9{random.randint(700000000, 899999999)}", htype, fee, 0,
                     months_active, paid, fee * (12 - months_active)),
                )
                # monthly statuses: active for the first `months_active` months
                for mi, month in enumerate(MONTHS):
                    active = mi < months_active
                    conn.execute(
                        """INSERT INTO household_months
                           (household_id,month,status,txn_date,receipt_no,amount)
                           VALUES (?,?,?,?,?,?)""",
                        (hid, month, ACTIVE if active else INACTIVE,
                         "" if not active else f"2025-{(mi%12)+1:02d}-15",
                         "" if not active else f"R{random.randint(1000,9999)}",
                         fee if active else None),
                    )
                n += 1
                conn.commit()  # commit per household -> resilient on slow links

        # a few sample reports (no photos)
        samples = [
            ("spot", "Burning plastic", 32.043, 76.725),
            ("spot", "Littering / dumping", 32.052, 76.725),
            ("missed", "Missed pickup · 25th", 32.046, 76.722),
        ]
        for kind, st, lat, lng in samples:
            conn.execute(
                "INSERT INTO reports (kind,spot_type,lat,lng,source) VALUES (?,?,?,?,?)",
                (kind, st, lat, lng, "resident"))
        conn.commit()

        total = conn.execute("SELECT COUNT(*) c FROM households").fetchone()["c"]
        rep = conn.execute("SELECT COUNT(*) c FROM reports").fetchone()["c"]
    print(f"seeded households={total} reports={rep}")


if __name__ == "__main__":
    main()
