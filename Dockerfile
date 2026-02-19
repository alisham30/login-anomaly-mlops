FROM python:3.10-slim

WORKDIR /app

# Backend (API + model artifacts from pipeline)
COPY backend/ /app

# Built frontend (from Jenkins "Build Frontend" stage); served on same port, no 5173/3000
COPY frontend/dist /app/static

RUN pip install --no-cache-dir -r requirements.txt

ENV STATIC_DIR=/app/static
EXPOSE 8000

CMD ["uvicorn", "app.api:app", "--host", "0.0.0.0", "--port", "8000"]
