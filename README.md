# Login Anomaly MLOps

A full-stack MLOps application that detects suspicious login events in real time using machine learning. A FastAPI backend serves predictions from a trained scikit-learn model, while a React + Vite frontend provides a live dashboard and an interactive risk-analysis form. Everything ships in a single Docker container and is built end-to-end by a Jenkins pipeline.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Features](#features)
   - [Backend API](#backend-api)
   - [ML Model Training](#ml-model-training)
   - [Synthetic Data Generation](#synthetic-data-generation)
   - [Frontend Dashboard](#frontend-dashboard)
   - [Frontend Analyze Page](#frontend-analyze-page)
   - [Navbar & Routing](#navbar--routing)
   - [API Client](#api-client)
3. [Input Features](#input-features)
4. [Risk Scoring & Classification](#risk-scoring--classification)
5. [Project Structure](#project-structure)
6. [Getting Started](#getting-started)
   - [Local Development](#local-development)
   - [Docker (Production)](#docker-production)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Configuration](#configuration)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                      Login Anomaly MLOps                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  FRONTEND  (React 19 + Vite 7 + Tailwind CSS 4)                 │
│  ├─ Dashboard   — real-time KPIs, trend chart, device chart,    │
│  │               recent-logins table                            │
│  ├─ Analyze     — 7-feature form → instant risk prediction      │
│  ├─ Navbar      — active-link navigation                        │
│  └─ api/client  — Axios wrapper (getStats, getRecent, predict)  │
│                                                                  │
│  BACKEND  (FastAPI + uvicorn, port 8000)                        │
│  ├─ POST /predict          — ML inference on 7 features         │
│  ├─ GET  /dashboard/stats  — aggregate KPIs                     │
│  ├─ GET  /dashboard/recent — last 100 predictions               │
│  ├─ GET  /health           — liveness probe                     │
│  └─ GET  /                 — SPA root / health fallback         │
│                                                                  │
│  ML MODEL  (scikit-learn)                                       │
│  ├─ Trains: Random Forest (supervised) +                        │
│  │          Isolation Forest (unsupervised)                     │
│  ├─ Selects: best ROC-AUC                                       │
│  └─ Artifacts: model.pkl, scaler.pkl, feature_columns.pkl,     │
│                model_type.pkl                                   │
│                                                                  │
│  DATA  (synthetic, 15 000 records)                              │
│  ├─ 85 % normal logins                                          │
│  └─ 15 % anomalous logins                                       │
│                                                                  │
│  DEPLOYMENT                                                      │
│  ├─ Docker  — python:3.10-slim, single container, port 8000     │
│  └─ Jenkins — checkout → train → build frontend → Docker image  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Features

### Backend API

| Feature | Detail |
|---|---|
| Framework | FastAPI with automatic OpenAPI docs (`/docs`, `/redoc`) |
| CORS | Wildcard (`*`) – suitable for demo / internal use |
| Lifespan startup | Loads four model artifacts via `joblib` before accepting requests |
| `POST /predict` | Accepts 7 login-event features, scales them, runs ML inference, returns `risk_score`, `classification`, `risk_level`, `is_new_device`, and UTC `timestamp` |
| `GET /dashboard/stats` | Returns `total_logins`, `suspicious_logins`, `risk_percentage` computed over the in-memory store |
| `GET /dashboard/recent` | Returns the last 100 predictions as a list |
| `GET /health` | Returns `{"status": "API is running"}` – suitable as a container health probe |
| In-memory store | `collections.deque(maxlen=100)` – O(1) append, automatic eviction |
| SPA serving | When `STATIC_DIR` env var is set, mounts built frontend assets and serves `index.html` for all unmatched routes (single-port production deployment) |

### ML Model Training

| Feature | Detail |
|---|---|
| Data source | `backend/data/login_data.csv`; auto-generated if absent |
| Preprocessing | 80 / 20 stratified train/test split, `StandardScaler` normalization |
| Isolation Forest | Unsupervised; `n_estimators=100`, `contamination=0.15`, `random_state=42`; anomaly score via `decision_function` → sigmoid |
| Random Forest | Supervised; `n_estimators=100`, `max_depth=12`, `random_state=42`; probabilities via `predict_proba` |
| Metrics logged | ROC-AUC, Precision, Recall, Confusion Matrix for both models |
| Model selection | Best ROC-AUC wins; both models always trained for comparison |
| Saved artifacts | `model.pkl`, `scaler.pkl`, `feature_columns.pkl`, `model_type.pkl` |
| Reproducibility | Fixed `random_state=42` throughout |
| Performance | Completes in ~10 s on a micro instance; memory-light for CI/CD |

### Synthetic Data Generation

| Feature | Detail |
|---|---|
| Total records | 15 000 (configurable) |
| Class balance | ~85 % normal, ~15 % anomalous |
| Normal logins | Business-hours bias (08:00–17:00), low geo-distance (0–50 km), zero failed attempts, slow velocity (0.1–2.0 /min), low device/IP risk (0–0.3) |
| Anomalous logins | Any hour (0–23), mostly new devices, large geo-distance (50–3000 km), multiple failures (1–10), high velocity (1.5–15 /min), elevated risk scores (0.4–1.0) |
| Determinism | `numpy.random.seed(42)` |
| Output | `backend/data/login_data.csv` |

### Frontend Dashboard

| Feature | Detail |
|---|---|
| KPI Cards | Three cards: **Total Logins**, **Suspicious Logins** (red), **Risk %** (yellow) |
| Risk Trend Chart | Recharts `LineChart` — X: sequential index, Y: risk score (0–1); cyan line |
| Device Distribution | Recharts `PieChart` (donut) — Known vs New device breakdown from recent predictions |
| Recent Logins Table | Last 20 entries in reverse-chronological order; columns: Time, Risk Score, Classification, Level, Device; color-coded by risk level |
| Loading state | Spinner shown while API calls are in-flight |
| Error boundary | Friendly error message with CORS troubleshooting hint |
| Responsive layout | Three-column grid on desktop, stacked on mobile (Tailwind CSS) |

### Frontend Analyze Page

| Feature | Detail |
|---|---|
| Input form | 7 fields mirroring the `PredictRequest` schema |
| Sliders | `login_hour` (0–23) and `device_risk_score` / `ip_risk_score` (0–1) rendered as range sliders |
| Dropdown | `is_new_device` — "0 (Known)" / "1 (New)" |
| Number inputs | `geo_distance_from_usual`, `failed_attempts_last_hour`, `login_velocity` |
| Default values | Sensible defaults (hour=14, distance=10, velocity=0.5, scores=0.1) |
| Result card | Displays risk score (large bold text), classification, risk level |
| Color coding | High → red border/text; Medium → yellow; Low → emerald |
| Loading state | Button disabled and relabeled "Analyzing…" during fetch |
| Error display | API validation errors surfaced to the user |

### Navbar & Routing

| Feature | Detail |
|---|---|
| Title | "Login Risk Intelligence" in cyan |
| Links | **Dashboard** (`/`) and **Analyze Login** (`/analyze`) |
| Active link | Cyan highlight on current route via React Router `useLocation` |
| Router | React Router v7 (`BrowserRouter` + `Routes`) |

### API Client

| Feature | Detail |
|---|---|
| Library | Axios 1.7 |
| Base URL | Empty string in production (same origin); `http://localhost:8000` in development; overridable via `VITE_API_URL` |
| Timeout | 10 seconds |
| `getStats()` | `GET /dashboard/stats` |
| `getRecent()` | `GET /dashboard/recent` → extracts `data.recent` array |
| `predict(features)` | `POST /predict` with feature payload |

---

## Input Features

All seven features are required for every prediction:

| Feature | Type | Range | Description |
|---|---|---|---|
| `login_hour` | int | 0–23 | Hour of the login attempt (local or UTC) |
| `is_new_device` | int | 0 or 1 | Whether the device has not been seen before for this user |
| `geo_distance_from_usual` | float | ≥ 0 km | Distance from the user's typical login location |
| `failed_attempts_last_hour` | int | ≥ 0 | Number of failed login attempts in the preceding hour |
| `login_velocity` | float | ≥ 0 /min | Rate of login attempts per minute |
| `device_risk_score` | float | 0–1 | Device reputation score (higher = riskier) |
| `ip_risk_score` | float | 0–1 | IP address reputation score (higher = riskier) |

---

## Risk Scoring & Classification

| Risk Score | Classification | Risk Level |
|---|---|---|
| < 0.33 | Normal | Low |
| 0.33 – 0.65 | Normal | Medium |
| ≥ 0.66 | Suspicious | High |

**Score derivation**

- **Random Forest** — `predict_proba(X)[0, 1]` (probability of class 1 / anomaly)
- **Isolation Forest** — `sigmoid(decision_function(X))` squashes the raw score to \[0, 1\]; more-negative raw values (more anomalous) map to scores closer to 1

---

## Project Structure

```
login-anomaly-mlops/
├── backend/
│   ├── app/
│   │   └── api.py               # FastAPI application
│   ├── data/
│   │   └── generate_data.py     # Synthetic dataset generator
│   ├── model/
│   │   └── train_model.py       # Training pipeline
│   └── requirements.txt         # Python dependencies
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js        # Axios API wrapper
│   │   ├── components/
│   │   │   └── Navbar.jsx       # Navigation bar
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx    # Real-time metrics dashboard
│   │   │   └── Analyze.jsx      # Login risk analysis form
│   │   ├── App.jsx              # Root component + router
│   │   ├── main.jsx             # React entry point
│   │   └── index.css            # Tailwind CSS import
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── eslint.config.js
├── scripts/
│   └── check-docker-disk.sh     # Docker disk-space diagnostics
├── Dockerfile                   # Single-container production build
├── Jenkinsfile                  # CI/CD pipeline definition
└── README.md
```

---

## Getting Started

### Local Development

**Prerequisites:** Python 3.10+, Node.js 18+

```bash
# 1. Install Python dependencies
pip install -r backend/requirements.txt

# 2. Train the model (generates data automatically if absent)
python backend/model/train_model.py

# 3. Start the API
uvicorn backend.app.api:app --reload --port 8000

# 4. In a separate terminal, start the frontend
cd frontend
npm install
npm run dev          # served at http://localhost:5173
```

The frontend dev server proxies API calls to `http://localhost:8000` automatically.

### Docker (Production)

```bash
# 1. Build frontend
cd frontend && npm ci && npm run build && cd ..

# 2. Build and run Docker image
docker build -t login-anomaly-mlops .
docker run -p 8000:8000 login-anomaly-mlops
```

Open `http://localhost:8000` — both the API and the React SPA are served from the same port.

---

## CI/CD Pipeline

The Jenkins pipeline (`Jenkinsfile`) runs six stages automatically on every commit:

| Stage | What it does |
|---|---|
| Checkout Code | Clones the repository |
| Verify Python | Checks `python3` and `pip` versions |
| Install Dependencies | `pip install -r backend/requirements.txt` |
| Train ML Model | `python3 backend/model/train_model.py` — produces four `.pkl` artifacts |
| Build Frontend | `npm ci` + `npm run build` in a safe temp directory (avoids snap EACCES) |
| Build Docker Image | `docker build -t login-anomaly-mlops .` using legacy builder |

---

## Configuration

| Variable | Where | Default | Description |
|---|---|---|---|
| `STATIC_DIR` | Backend env | `""` | Absolute path to built frontend `dist/`; enables SPA serving in Docker |
| `VITE_API_URL` | Frontend `.env` | *(none)* | Override API base URL; defaults to same-origin in prod, `localhost:8000` in dev |
| `PORT` | Docker / uvicorn | `8000` | Listening port |
