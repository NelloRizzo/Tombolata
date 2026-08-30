import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const ROLE_SEZIONI = [
  { key: "admin", label: "Gestione", icon: "⚙️" },
  { key: "regista", label: "Regia", icon: "🎬" },
  { key: "drawer", label: "Estrazione", icon: "🎰" },
  { key: "video", label: "Video", icon: "📽️" },
  { key: "fonico", label: "Audio", icon: "🎧" },
  { key: "attore", label: "Attore", icon: "🎭" },
  { key: "spettatore", label: "Tabellone", icon: "🖥️" }
];

export default function Navbar() {
  const { user, hasRole, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const inConsole = location.pathname === "/console";
  const sezioni = ROLE_SEZIONI.filter((s) => hasRole(s.key));

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className="app-navbar">
      <div className="navbar-brand">
        <Link to="/" className="navbar-logo">
          🎄 Tombolata
        </Link>
      </div>

      <nav className="navbar-links">
        {inConsole ? (
          sezioni.length > 0 ? (
            sezioni.map((s) => (
              <NavLink
                key={s.key}
                to={`/console?tab=${s.key}`}
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
                title={s.label}
              >
                <span className="nav-icon">{s.icon}</span>
                <span className="nav-label">{s.label}</span>
              </NavLink>
            ))
          ) : (
            <span className="nav-empty">Nessuna sezione disponibile</span>
          )
        ) : (
          <Link to="/console" className="nav-link">
            <span className="nav-icon">🖥️</span>
            <span className="nav-label">Regia</span>
          </Link>
        )}
      </nav>

      <div className="navbar-actions">
        {user ? (
          <>
            <span className="navbar-user" title={user.displayName || user.username}>
              {user.displayName || user.username}
            </span>
            <button className="navbar-logout" onClick={handleLogout}>
              Esci
            </button>
          </>
        ) : (
          <NavLink to="/login" className="nav-link">
            <span className="nav-icon">🔑</span>
            <span className="nav-label">Login</span>
          </NavLink>
        )}
      </div>
    </header>
  );
}
