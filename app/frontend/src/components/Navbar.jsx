import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCurrentGame } from "../context/GameContext.jsx";
import { apiRequest } from "../api.js";

const ROLE_SEZIONI = [
  { key: "admin", label: "Gestione", icon: "⚙️" },
  { key: "director", label: "Regia", icon: "🎬" },
  { key: "drawer", label: "Estrazione", icon: "🎰" },
  { key: "video", label: "Video", icon: "📽️" },
  { key: "audio", label: "Audio", icon: "🎧" },
  { key: "actor", label: "Attore", icon: "🎭" }
];

function GameSelector() {
  const { currentGameId, setCurrentGame } = useCurrentGame();
  const [games, setGames] = useState([]);

  useEffect(() => {
    apiRequest("/api/game/history")
      .then((json) => { if (json.ok) setGames(json.data); })
      .catch(() => {});
  }, []);

  const currentName = games.find((g) => String(g._id) === String(currentGameId))?.name;

  return (
    <label className="game-selector" title="Partita corrente della dashboard">
      <span className="gs-label">{currentName || (currentGameId ? "Partita selezionata" : "Partita auto")}</span>
      <select value={currentGameId || ""} onChange={(e) => setCurrentGame(e.target.value || null)}>
        <option value="">✓ Partita attiva (automatica)</option>
        {games.filter((g) => g.status !== "finished").map((g) => (
          <option key={g._id} value={g._id}>
            {g.name}{g.status === "scheduled" ? " (programmata)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function Navbar() {
  const { user, hasRole, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const inConsole = location.pathname === "/console" || location.pathname === "/admin";
  const inBoards = location.pathname === "/boards";
  const sezioni = ROLE_SEZIONI.filter((s) => hasRole(s.key));
  const canManageBoards = hasRole("drawer") || hasRole("director") || hasRole("admin");

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
        <Link to="/board" className="nav-link" title="Tabellone pubblico">
          <span className="nav-icon">🖥️</span>
          <span className="nav-label">Tabellone</span>
        </Link>

        {canManageBoards && (inConsole || inBoards) && (
          <Link
            to="/boards"
            className={`nav-link ${inBoards ? "active" : ""}`}
            title="Gestione cartelle"
          >
            <span className="nav-icon">🎟️</span>
            <span className="nav-label">Cartelle</span>
          </Link>
        )}

        {inConsole ? (
          sezioni.length > 0 ? (
            sezioni.map((s) =>
              s.key === "admin" ? (
                <NavLink
                  key={s.key}
                  to="/admin"
                  className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                  title={s.label}
                >
                  <span className="nav-icon">{s.icon}</span>
                  <span className="nav-label">{s.label}</span>
                </NavLink>
              ) : (
                <NavLink
                  key={s.key}
                  to={`/console?tab=${s.key}`}
                  className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                  title={s.label}
                >
                  <span className="nav-icon">{s.icon}</span>
                  <span className="nav-label">{s.label}</span>
                </NavLink>
              )
            )
          ) : null
        ) : (
          <Link to="/console" className="nav-link">
            <span className="nav-icon">🖥️</span>
            <span className="nav-label">Regia</span>
          </Link>
        )}
      </nav>

      <div className="navbar-actions">
        <GameSelector />
        {user ? (
          <>
            <span className="navbar-user" title={user.displayName || user.username}>
              {user.displayName || user.username}
            </span>
            <button className="navbar-logout" onClick={handleLogout}>Esci</button>
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