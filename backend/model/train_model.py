"""
Training pipeline: load/generate data, preprocess, scale, train IF + RF, evaluate, save best.
Produces model.pkl, scaler.pkl, feature_columns.pkl. Kept under ~10s and memory-light.
Suitable for CI/CD and micro instances.
"""
import os
import sys
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    roc_auc_score,
    precision_score,
    recall_score,
    confusion_matrix,
)

# Paths relative to backend root (when run from backend/)
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "model")
DATA_CSV = os.path.join(DATA_DIR, "login_data.csv")
FEATURE_COLUMNS = [
    "login_hour",
    "is_new_device",
    "geo_distance_from_usual",
    "failed_attempts_last_hour",
    "login_velocity",
    "device_risk_score",
    "ip_risk_score",
]
TARGET = "anomaly"


def ensure_data():
    if not os.path.isfile(DATA_CSV):
        backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        sys.path.insert(0, backend_root)
        from data.generate_data import main as generate_main
        generate_main()
    return pd.read_csv(DATA_CSV)


def train_and_evaluate():
    df = ensure_data()
    if TARGET not in df.columns:
        raise ValueError(f"Dataset must contain column '{TARGET}'")
    X = df[FEATURE_COLUMNS].astype(np.float64)
    y = df[TARGET].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    # Isolation Forest (unsupervised): use -score as anomaly score (higher = more anomalous)
    iforest = IsolationForest(n_estimators=100, contamination=0.15, random_state=42)
    iforest.fit(X_train_s)
    if_scores = iforest.decision_function(X_test_s)  # more negative = more anomalous
    if_proba = 1.0 / (1.0 + np.exp(-if_scores))  # squash to 0-1 for ROC
    if_auc = roc_auc_score(y_test, if_proba)
    if_prec = precision_score(y_test, (if_proba >= 0.5).astype(int), zero_division=0)
    if_rec = recall_score(y_test, (if_proba >= 0.5).astype(int), zero_division=0)
    if_cm = confusion_matrix(y_test, (if_proba >= 0.5).astype(int))

    # Random Forest (supervised)
    rf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42)
    rf.fit(X_train_s, y_train)
    rf_proba = rf.predict_proba(X_test_s)[:, 1]
    rf_auc = roc_auc_score(y_test, rf_proba)
    rf_prec = precision_score(y_test, (rf_proba >= 0.5).astype(int), zero_division=0)
    rf_rec = recall_score(y_test, (rf_proba >= 0.5).astype(int), zero_division=0)
    rf_cm = confusion_matrix(y_test, (rf_proba >= 0.5).astype(int))

    print("Isolation Forest: ROC-AUC={:.4f} Precision={:.4f} Recall={:.4f}".format(if_auc, if_prec, if_rec))
    print("Confusion matrix:", if_cm.tolist())
    print("Random Forest:    ROC-AUC={:.4f} Precision={:.4f} Recall={:.4f}".format(rf_auc, rf_prec, rf_rec))
    print("Confusion matrix:", rf_cm.tolist())

    if rf_auc >= if_auc:
        best_model = rf
        best_name = "RandomForest"
    else:
        best_model = iforest
        best_name = "IsolationForest"
    print("Selected:", best_name)

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(best_model, os.path.join(MODEL_DIR, "model.pkl"))
    joblib.dump(scaler, os.path.join(MODEL_DIR, "scaler.pkl"))
    joblib.dump(FEATURE_COLUMNS, os.path.join(MODEL_DIR, "feature_columns.pkl"))
    joblib.dump(best_name, os.path.join(MODEL_DIR, "model_type.pkl"))
    print("Saved model.pkl, scaler.pkl, feature_columns.pkl, model_type.pkl")


if __name__ == "__main__":
    train_and_evaluate()
