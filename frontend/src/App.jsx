import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Navbar from "./components/Navbar"
import Dashboard from "./pages/Dashboard"
import Analyze from "./pages/Analyze"

function App() {
  return (
    <Router>
      <div className="bg-slate-950 min-h-screen text-white">
        <Navbar />

        <main className="p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analyze" element={<Analyze />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
