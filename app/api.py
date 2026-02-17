from fastapi import FastAPI
import joblib
import numpy as np

app = FastAPI(title="Login Anomaly Detection API")

# Load trained model
model = joblib.load("model/login_anomaly_model.pkl")

@app.get("/")
def health_check():
    return {"status": "API is running"}

@app.post("/predict")
def predict_login(
    login_hour: int,
    failed_attempts: int,
    location_change: int,
    ip_risk: int
):
    features = np.array([[login_hour, failed_attempts, location_change, ip_risk]])
    prediction = model.predict(features)

    if prediction[0] == -1:
        return {"prediction": "Suspicious Login"}
    else:
        return {"prediction": "Normal Login"}
