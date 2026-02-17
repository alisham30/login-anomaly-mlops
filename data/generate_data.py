import pandas as pd
import random

rows = []

for _ in range(500):  # 500 realistic login records
    login_hour = random.randint(0, 23)

    # Normal office hours
    if 8 <= login_hour <= 18:
        failed_attempts = random.choice([0, 0, 0, 1])
        location_change = 0
        ip_risk = 0
        label = 0
    else:
        failed_attempts = random.randint(2, 6)
        location_change = random.choice([0, 1])
        ip_risk = random.choice([0, 1])
        label = 1

    rows.append([
        login_hour,
        failed_attempts,
        location_change,
        ip_risk,
        label
    ])

df = pd.DataFrame(
    rows,
    columns=[
        "login_hour",
        "failed_attempts",
        "location_change",
        "ip_risk",
        "label"
    ]
)

df.to_csv("data/login_data.csv", index=False)
print("login_data.csv generated with", len(df), "rows")
