# Saaf Bir

Interactive waste-management web app for Bir & Gunehar (a Waste Warriors × Bhasha concept).

- **Backend:** FastAPI + SQLite (local) / Postgres (hosted, via `DATABASE_URL`)
- **Frontend:** vanilla HTML/CSS/JS + Leaflet, served by the API
- **Screens:** Live Map · Report a Spot (with camera) · Dashboard (real FY26 data) · Collector · Reports gallery

## Run locally
```bash
uv sync
uv run python scripts/import_csv.py      # seed household data (needs the FY26 CSVs)
uv run uvicorn app.main:app --port 8000
# open http://localhost:8000
```

## Deploy
- Set `DATABASE_URL` to a Postgres connection string (e.g. Neon) → the app uses Postgres.
- No `DATABASE_URL` → local SQLite (`saaf.db`).
- Container: see `Dockerfile`. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.

Data (household CSVs, `saaf.db`) is **not** committed — it contains personal info.
