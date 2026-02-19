"""
Lightweight domain-engineered login behavior dataset for Login Risk Intelligence.
Target: 10k–20k rows, 8 features + binary label. Suitable for micro EC2 and CI/CD.
"""
import os
import random
import pandas as pd

RANDOM_SEED = 42
TARGET_ROWS = 15_000  # within 10k–20k
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "login_data.csv")

FEATURE_NAMES = [
    "login_hour",
    "is_new_device",
    "geo_distance_from_usual",
    "failed_attempts_last_hour",
    "login_velocity",
    "device_risk_score",
    "ip_risk_score",
]


def generate_row(normal: bool) -> list:
    if normal:
        login_hour = random.choices(
            range(24), weights=[1] * 8 + [4] * 10 + [1] * 6, k=1
        )[0]  # bias 8–17
        is_new_device = random.choice([0, 0, 0, 1])
        geo_distance_from_usual = round(random.uniform(0, 50), 2)
        failed_attempts_last_hour = random.choice([0, 0, 0, 1])
        login_velocity = round(random.uniform(0.1, 2.0), 4)
        device_risk_score = round(random.uniform(0, 0.3), 4)
        ip_risk_score = round(random.uniform(0, 0.3), 4)
        anomaly = 0
    else:
        login_hour = random.randint(0, 23)
        is_new_device = random.choice([0, 1, 1, 1])
        geo_distance_from_usual = round(random.uniform(50, 3000), 2)
        failed_attempts_last_hour = random.randint(1, 10)
        login_velocity = round(random.uniform(1.5, 15.0), 4)
        device_risk_score = round(random.uniform(0.4, 1.0), 4)
        ip_risk_score = round(random.uniform(0.4, 1.0), 4)
        anomaly = 1
    return [
        login_hour,
        is_new_device,
        geo_distance_from_usual,
        failed_attempts_last_hour,
        login_velocity,
        device_risk_score,
        ip_risk_score,
        anomaly,
    ]


def main():
    random.seed(RANDOM_SEED)
    # ~85% normal, ~15% anomaly for realistic class balance
    n_anomaly = int(TARGET_ROWS * 0.15)
    n_normal = TARGET_ROWS - n_anomaly
    rows = []
    for _ in range(n_normal):
        rows.append(generate_row(normal=True))
    for _ in range(n_anomaly):
        rows.append(generate_row(normal=False))
    random.shuffle(rows)

    df = pd.DataFrame(rows, columns=FEATURE_NAMES + ["anomaly"])
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    df.to_csv(OUTPUT_PATH, index=False)
    print(f"Generated {len(df)} rows -> {OUTPUT_PATH}")
    return df


if __name__ == "__main__":
    main()
