import { useEffect, useState } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { getStats, getRecent } from "../api/client"

const RISK_COLORS = { Low: "#22c55e", Medium: "#eab308", High: "#ef4444" }
const PIE_COLORS = ["#0ea5e9", "#8b5cf6"]

function formatTime(iso) {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString("en-US", { hour12: false }) + " " + d.toLocaleDateString()
  } catch {
    return iso
  }
}

function Dashboard() {
  const [stats, setStats] = useState({
    total_logins: 0,
    suspicious_logins: 0,
    risk_percentage: 0,
  })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        const [s, r] = await Promise.all([getStats(), getRecent()])
        if (!cancelled) {
          setStats(s)
          setRecent(Array.isArray(r) ? r : [])
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || "Failed to load dashboard")
          setStats({ total_logins: 0, suspicious_logins: 0, risk_percentage: 0 })
          setRecent([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [])

  const trendData = recent
    .slice()
    .reverse()
    .map((e, i) => ({
      index: i + 1,
      score: e.risk_score,
      time: formatTime(e.timestamp),
    }))

  const deviceData = [
    { name: "Known device", value: recent.filter((e) => e.is_new_device === 0).length },
    { name: "New device", value: recent.filter((e) => e.is_new_device === 1).length },
  ].filter((d) => d.value > 0)
  if (deviceData.length === 0) deviceData.push({ name: "No data", value: 1 })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-slate-400">Loading dashboard…</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-slate-200 mb-8">Security Overview</h2>

      {error && (
        <div className="mb-6 p-4 bg-amber-900/30 border border-amber-600 rounded-lg text-amber-200">
          {error} — Ensure the API is running and CORS is enabled.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 hover:border-cyan-500 transition">
          <p className="text-slate-400 text-sm">Total Logins</p>
          <h3 className="text-4xl font-bold text-white mt-3">{stats.total_logins.toLocaleString()}</h3>
        </div>
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 hover:border-red-500 transition">
          <p className="text-slate-400 text-sm">Suspicious Logins</p>
          <h3 className="text-4xl font-bold text-red-500 mt-3">{stats.suspicious_logins.toLocaleString()}</h3>
        </div>
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 hover:border-yellow-400 transition">
          <p className="text-slate-400 text-sm">Risk Percentage</p>
          <h3 className="text-4xl font-bold text-yellow-400 mt-3">{stats.risk_percentage}%</h3>
        </div>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <div className="bg-slate-900 p-8 rounded-xl border border-slate-800">
          <p className="text-slate-400 mb-4">Risk Trend (recent logins)</p>
          <div className="h-64">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <XAxis dataKey="index" stroke="#94a3b8" fontSize={12} />
                  <YAxis domain={[0, 1]} stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: "#1e293b", border: "1px solid #334155" }}
                    labelStyle={{ color: "#e2e8f0" }}
                    formatter={(v) => [Number(v).toFixed(2), "Risk score"]}
                  />
                  <Line type="monotone" dataKey="score" stroke="#22d3ee" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 rounded-lg bg-slate-800">
                No trend data yet. Use Analyze to submit logins.
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-xl border border-slate-800">
          <p className="text-slate-400 mb-4">Device distribution (recent)</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {deviceData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-12 bg-slate-900 p-8 rounded-xl border border-slate-800">
        <p className="text-slate-400 mb-4">Recent logins</p>
        <div className="overflow-x-auto">
          {recent.length === 0 ? (
            <p className="text-slate-500">No recent logins. Use Analyze to submit a login.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="pb-3 pr-4">Time</th>
                  <th className="pb-3 pr-4">Risk score</th>
                  <th className="pb-3 pr-4">Classification</th>
                  <th className="pb-3 pr-4">Level</th>
                  <th className="pb-3">Device</th>
                </tr>
              </thead>
              <tbody>
                {[...recent].reverse().slice(0, 20).map((row, i) => (
                  <tr key={i} className="border-b border-slate-800">
                    <td className="py-2 pr-4 text-slate-300">{formatTime(row.timestamp)}</td>
                    <td className="py-2 pr-4 font-mono">{(row.risk_score ?? 0).toFixed(2)}</td>
                    <td className="py-2 pr-4">{row.classification ?? "—"}</td>
                    <td className="py-2 pr-4">
                      <span
                        className="font-medium"
                        style={{ color: RISK_COLORS[row.risk_level] || "#94a3b8" }}
                      >
                        {row.risk_level ?? "—"}
                      </span>
                    </td>
                    <td className="py-2">{row.is_new_device === 1 ? "New" : "Known"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
