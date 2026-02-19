import { Link, useLocation } from "react-router-dom"

function Navbar() {
  const location = useLocation()

  const linkStyle = (path) =>
    `transition duration-200 ${
      location.pathname === path
        ? "text-cyan-400"
        : "text-slate-300 hover:text-cyan-400"
    }`

  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-8 py-4 flex justify-between items-center shadow-md">
      <h1 className="text-xl font-semibold text-cyan-400 tracking-wide">
        Login Risk Intelligence
      </h1>

      <div className="space-x-8 font-medium">
        <Link to="/" className={linkStyle("/")}>
          Dashboard
        </Link>

        <Link to="/analyze" className={linkStyle("/analyze")}>
          Analyze Login
        </Link>
      </div>
    </nav>
  )
}

export default Navbar
