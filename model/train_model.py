import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib

# Load dataset
data = pd.read_csv("data/login_data.csv")

# Features only (no label needed for Isolation Forest)
X = data[["login_hour", "failed_attempts", "location_change", "ip_risk"]]

# Train model
model = IsolationForest(
    n_estimators=100,
    contamination=0.3,
    random_state=42
)
model.fit(X)

# Save trained model
joblib.dump(model, "model/login_anomaly_model.pkl")

print("Model trained and saved successfully")
