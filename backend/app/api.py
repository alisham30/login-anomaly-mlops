"""
Login Risk Intelligence API.
Loads model on startup; exposes /predict, /dashboard/stats, /dashboard/recent.
When STATIC_DIR is set (e.g. in Docker), serves built frontend on same port.
"""
import os
from collections import deque
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import joblib
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

# Paths relative to backend root (when run from /app in Docker or backend locally)
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE, "model")
MODEL_PATH = os.path.join(MODEL_DIR, "model.pkl")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")
FEATURE_COLUMNS_PATH = os.path.join(MODEL_DIR, "feature_columns.pkl")
MODEL_TYPE_PATH = os.path.join(MODEL_DIR, "model_type.pkl")

model = None
scaler = None
feature_columns = None
model_type = None
recent_store = deque(maxlen=100)


def load_artifacts():
    global model, scaler, feature_columns, model_type
    for path, name in [
        (MODEL_PATH, "model"),
        (SCALER_PATH, "scaler"),
        (FEATURE_COLUMNS_PATH, "feature_columns"),
        (MODEL_TYPE_PATH, "model_type"),
    ]:
        if not os.path.isfile(path):
            raise FileNotFoundError(f"Missing artifact: {path}")
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    feature_columns = joblib.load(FEATURE_COLUMNS_PATH)
    model_type = joblib.load(MODEL_TYPE_PATH)


def risk_score_from_model(X: np.ndarray) -> float:
    if model_type == "RandomForest":
        return float(model.predict_proba(X)[0, 1])
    # IsolationForest: decision_function more negative = more anomalous
    dec = model.decision_function(X)[0]
    return float(1.0 / (1.0 + np.exp(dec)))


def classification_and_level(score: float) -> tuple[str, str]:
    if score < 0.33:
        return "Normal", "Low"
    if score < 0.66:
        return "Normal", "Medium"
    return "Suspicious", "High"


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_artifacts()
    yield
    # no cleanup needed


app = FastAPI(title="Login Risk Intelligence API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictRequest(BaseModel):
    login_hour: int = Field(..., ge=0, le=23)
    is_new_device: int = Field(..., ge=0, le=1)
    geo_distance_from_usual: float = Field(..., ge=0)
    failed_attempts_last_hour: int = Field(..., ge=0)
    login_velocity: float = Field(..., ge=0)
    device_risk_score: float = Field(..., ge=0, le=1)
    ip_risk_score: float = Field(..., ge=0, le=1)


@app.get("/health")
def health_check():
    return {"status": "API is running"}


@app.post("/predict")
def predict(req: PredictRequest):
    row = [
        req.login_hour,
        req.is_new_device,
        req.geo_distance_from_usual,
        req.failed_attempts_last_hour,
        req.login_velocity,
        req.device_risk_score,
        req.ip_risk_score,
    ]
    X = np.array([row], dtype=np.float64)
    X = scaler.transform(X)
    score = risk_score_from_model(X)
    classification, risk_level = classification_and_level(score)
    entry = {
        "risk_score": round(score, 4),
        "classification": classification,
        "risk_level": risk_level,
        "is_new_device": req.is_new_device,
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
    }
    recent_store.append(entry)
    return entry


@app.get("/dashboard/stats")
def dashboard_stats():
    n = len(recent_store)
    if n == 0:
        return {
            "total_logins": 0,
            "suspicious_logins": 0,
            "risk_percentage": 0.0,
        }
    suspicious = sum(1 for e in recent_store if e["classification"] == "Suspicious")
    return {
        "total_logins": n,
        "suspicious_logins": suspicious,
        "risk_percentage": round(100.0 * suspicious / n, 2),
    }


@app.get("/dashboard/recent")
def dashboard_recent():
    return {"recent": list(recent_store)}


# Serve built frontend when STATIC_DIR exists (Docker production; single port, no 5173/3000)
STATIC_DIR = os.environ.get("STATIC_DIR", "")
if STATIC_DIR and os.path.isdir(STATIC_DIR):
    assets_dir = os.path.join(STATIC_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    def serve_spa_root():
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        path = os.path.join(STATIC_DIR, full_path)
        if os.path.isfile(path):
            return FileResponse(path)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
else:
    @app.get("/")
    def root_health():
        return {"status": "API is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
