import axios from "axios"

// Production (same origin): "" so API calls go to same host. Dev: localhost:8000.
const baseURL =
  typeof import.meta.env?.VITE_API_URL !== "undefined"
    ? import.meta.env.VITE_API_URL
    : import.meta.env.PROD
      ? ""
      : "http://localhost:8000"

export const api = axios.create({ baseURL, timeout: 10000 })

export async function getStats() {
  const { data } = await api.get("/dashboard/stats")
  return data
}

export async function getRecent() {
  const { data } = await api.get("/dashboard/recent")
  return data.recent || []
}

export async function predict(features) {
  const { data } = await api.post("/predict", features)
  return data
}
