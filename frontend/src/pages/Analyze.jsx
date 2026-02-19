import { useState } from "react"
import { predict } from "../api/client"

const defaultForm = {
  login_hour: 14,
  is_new_device: 0,
  geo_distance_from_usual: 10,
  failed_attempts_last_hour: 0,
  login_velocity: 0.5,
  device_risk_score: 0.1,
  ip_risk_score: 0.1,
}

function Analyze() {
  const [form, setForm] = useState(defaultForm)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    const num = e.target.type === "number" ? parseFloat(value) || 0 : value
    setForm((prev) => ({ ...prev, [name]: num }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const payload = {
        login_hour: Number(form.login_hour),
        is_new_device: Number(form.is_new_device),
        geo_distance_from_usual: Number(form.geo_distance_from_usual),
        failed_attempts_last_hour: Number(form.failed_attempts_last_hour),
        login_velocity: Number(form.login_velocity),
        device_risk_score: Number(form.device_risk_score),
        ip_risk_score: Number(form.ip_risk_score),
      }
      const data = await predict(payload)
      setResult(data)
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Request failed")
    } finally {
      setLoading(false)
    }
  }

  const riskColor = result
    ? result.risk_level === "High"
      ? "text-red-400"
      : result.risk_level === "Medium"
        ? "text-yellow-400"
        : "text-emerald-400"
    : "text-slate-200"
  const borderColor = result
    ? result.risk_level === "High"
      ? "border-red-500"
      : result.risk_level === "Medium"
        ? "border-yellow-500"
        : "border-emerald-500"
    : "border-slate-800"

  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-200 mb-6">Analyze Login</h2>

      <form
        onSubmit={handleSubmit}
        className="bg-slate-900 p-6 rounded-lg border border-slate-800 max-w-xl"
      >
        <div className="grid gap-4">
          <label className="block text-slate-400 text-sm">Login hour (0–23)</label>
          <input
            type="number"
            name="login_hour"
            min={0}
            max={23}
            value={form.login_hour}
            onChange={handleChange}
            className="bg-slate-800 p-3 rounded text-white outline-none focus:ring-2 focus:ring-cyan-500"
          />

          <label className="block text-slate-400 text-sm">New device (0 = No, 1 = Yes)</label>
          <select
            name="is_new_device"
            value={form.is_new_device}
            onChange={handleChange}
            className="bg-slate-800 p-3 rounded text-white outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value={0}>No</option>
            <option value={1}>Yes</option>
          </select>

          <label className="block text-slate-400 text-sm">Geo distance from usual (km)</label>
          <input
            type="number"
            name="geo_distance_from_usual"
            min={0}
            step={0.01}
            value={form.geo_distance_from_usual}
            onChange={handleChange}
            className="bg-slate-800 p-3 rounded text-white outline-none focus:ring-2 focus:ring-cyan-500"
          />

          <label className="block text-slate-400 text-sm">Failed attempts (last hour)</label>
          <input
            type="number"
            name="failed_attempts_last_hour"
            min={0}
            value={form.failed_attempts_last_hour}
            onChange={handleChange}
            className="bg-slate-800 p-3 rounded text-white outline-none focus:ring-2 focus:ring-cyan-500"
          />

          <label className="block text-slate-400 text-sm">Login velocity (logins/min)</label>
          <input
            type="number"
            name="login_velocity"
            min={0}
            step={0.01}
            value={form.login_velocity}
            onChange={handleChange}
            className="bg-slate-800 p-3 rounded text-white outline-none focus:ring-2 focus:ring-cyan-500"
          />

          <label className="block text-slate-400 text-sm">Device risk score (0–1)</label>
          <input
            type="number"
            name="device_risk_score"
            min={0}
            max={1}
            step={0.01}
            value={form.device_risk_score}
            onChange={handleChange}
            className="bg-slate-800 p-3 rounded text-white outline-none focus:ring-2 focus:ring-cyan-500"
          />

          <label className="block text-slate-400 text-sm">IP risk score (0–1)</label>
          <input
            type="number"
            name="ip_risk_score"
            min={0}
            max={1}
            step={0.01}
            value={form.ip_risk_score}
            onChange={handleChange}
            className="bg-slate-800 p-3 rounded text-white outline-none focus:ring-2 focus:ring-cyan-500"
          />

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-semibold py-3 rounded transition"
          >
            {loading ? "Analyzing…" : "Analyze Risk"}
          </button>
        </div>
      </form>

      {result && (
        <div
          className={`mt-6 p-6 bg-slate-900 rounded-lg border-2 ${borderColor} max-w-xl`}
        >
          <p className="text-slate-400">Risk score</p>
          <h3 className={`text-4xl font-bold mt-2 ${riskColor}`}>
            {(result.risk_score ?? 0).toFixed(2)}
          </h3>
          <p className="text-slate-300 mt-2">
            Classification: <span className="font-semibold">{result.classification ?? "—"}</span>
            {" · "}
            Level: <span className={`font-semibold ${riskColor}`}>{result.risk_level ?? "—"}</span>
          </p>
        </div>
      )}
    </div>
  )
}

export default Analyze
