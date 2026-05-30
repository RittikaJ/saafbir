"""Import the FY26 Bir & Gunehar user-fee CSVs into the active backend.

Backend is chosen by the same DATABASE_URL env var the app uses (Postgres if
set to a postgres URL, else local SQLite). See app/db.py.

CSV layout (verified): 74 columns.
  Row 1 = group headers ("Due Month -->", month names) — skipped.
  Row 2 = field names.
  Cols 0..13  = household summary:
    Project Code, Panchayat, Unique Id, Ward No., Name, Phone #, Household Type,
    Monthly User Fee, Previous FY balance, Service Months, User Fee Paid,
    Current FY balance, Adjustments, Reasons for Adjustments
  Cols 14..73 = 12 monthly blocks of 5:
    {Month, Status, Transaction Date, Receipt No, Amount}

Idempotent: clears the imported tables and re-loads. Run:
    uv run python scripts/import_csv.py
"""
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.db import get_conn, init_db  # noqa: E402

CSV_DIR = Path(__file__).resolve().parent.parent.parent  # CCB/
CSVS = [
    CSV_DIR / "WWS_Rural_User Fee_Data_FY26_BIR - Bir.csv",
    CSV_DIR / "WWS_Rural_User Fee_Data_FY26_BIR - Gunehar.csv",
]

SUMMARY_COLS = 14
BLOCK = 5
N_MONTHS = 12


def _num(v):
    if v is None:
        return None
    v = str(v).strip().replace(",", "")
    if v == "":
        return None
    try:
        return float(v)
    except ValueError:
        return None


def _int(v):
    f = _num(v)
    return int(f) if f is not None else None


def import_file(conn, path: Path, seen: set) -> int:
    with open(path, newline="", encoding="utf-8-sig") as fh:
        rows = list(csv.reader(fh))
    # row 0 = group header, row 1 = field names, data starts row 2
    count = 0
    for r in rows[2:]:
        if len(r) < SUMMARY_COLS:
            continue
        uid = (r[2] or "").strip()
        if not uid:  # skip blank/spacer rows
            continue
        if uid in seen:  # tables are cleared up-front, so just skip dup ids
            continue
        seen.add(uid)
        conn.execute(
            """INSERT INTO households
               (id, village, ward, name, phone, type, monthly_fee, prev_balance,
                service_months, fee_paid, current_balance)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (uid, (r[1] or "").strip(), (r[3] or "").strip(), (r[4] or "").strip(),
             (r[5] or "").strip(), (r[6] or "").strip(), _num(r[7]), _num(r[8]),
             _int(r[9]), _num(r[10]), _num(r[11])),
        )
        # monthly blocks
        for m in range(N_MONTHS):
            base = SUMMARY_COLS + m * BLOCK
            if base + 1 >= len(r):
                break
            month = (r[base] or "").strip()
            status = (r[base + 1] or "").strip()
            if not month and not status:
                continue
            txn = (r[base + 2] or "").strip() if base + 2 < len(r) else ""
            receipt = (r[base + 3] or "").strip() if base + 3 < len(r) else ""
            amount = _num(r[base + 4]) if base + 4 < len(r) else None
            conn.execute(
                """INSERT INTO household_months
                   (household_id, month, status, txn_date, receipt_no, amount)
                   VALUES (?,?,?,?,?,?)""",
                (uid, month, status, txn, receipt, amount),
            )
        count += 1
    return count


def main():
    init_db()
    with get_conn() as conn:
        # children first to respect the FK from household_months -> households
        conn.execute("DELETE FROM household_months")
        conn.execute("DELETE FROM households")
        total = 0
        seen: set = set()
        for path in CSVS:
            if not path.exists():
                print(f"  ! missing: {path.name}")
                continue
            n = import_file(conn, path, seen)
            print(f"  imported {n:>5} households from {path.name}")
            total += n
        conn.commit()
        # quick verification
        by_type = conn.execute(
            "SELECT type, COUNT(*) c FROM households GROUP BY type ORDER BY c DESC"
        ).fetchall()
        by_village = conn.execute(
            "SELECT village, COUNT(*) c FROM households GROUP BY village"
        ).fetchall()
    print(f"\n  total households: {total}")
    print("  by village:", {row['village']: row['c'] for row in by_village})
    print("  by type:   ", {row['type']: row['c'] for row in by_type})


if __name__ == "__main__":
    main()
