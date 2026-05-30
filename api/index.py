"""Vercel serverless entrypoint — exposes the FastAPI app from app/main.py.
Vercel's Python runtime only treats files under api/ as functions, so this
thin shim imports the real app (which lives in app/main.py)."""
import sys
from pathlib import Path

# make the project root importable (so `import app.main` works on Vercel)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app  # noqa: E402,F401  (Vercel serves this ASGI `app`)
