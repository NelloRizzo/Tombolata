import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCurrentGame } from "../context/GameContext.jsx";
import { apiRequest } from "../api.js";
import { ADMIN_SECTIONS } from "../pages/AdminPage.jsx";

const ROLE_SEZIONI = [
  { key: "admin", label: "Gestione", icon: "⚙️", to: "/admin" },
  { key: "director", label: "Regia", icon: "🎬", to: "/console?tab=director" },
  { key: "drawer", label: "Estrazione", icon: "🎰", to: "/console?tab=drawer" },
  { key: "video", label: "Video", icon: "📽️", to: "/console?tab=video" },
  { key: "audio", label: "Audio", icon: "🎧", to: "/console?tab=audio" },
  { key: "actor", label: "Attore", icon: "🎭", to: "/console?tab=actor" }
];

function GameSelector() {
  const { currentGameId, setCurrentGame } = useCurrentGame();
  const [games, setGames] = useState([]);

  useEffect(() => {
    apiRequest("/api/game/history")
      .then((json) => { if (json.ok) setGames(json.data); })
      .catch(() => {});
  }, [currentGameId]);

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

export default function Sidebar() {
  const { user, hasRole, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const inManagement = ["/console", "/admin", "/boards"].includes(location.pathname);
  const canManageBoards = hasRole("drawer") || hasRole("director") || hasRole("admin");
  const sezioni = ROLE_SEZIONI.filter((s) => hasRole(s.key));

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <Link to="/" className="navbar-logo">
          🎄 Tombolata
        </Link>
      </div>

      <GameSelector />

      <nav className="sidebar-nav">
        <a href="/board" target="_blank" rel="noopener noreferrer" className="nav-link" title="Apri il tabellone pubblico in una nuova finestra">
          <span className="nav-icon">🖥️</span>
          <span className="nav-label">Tabellone</span>
        </a>

        <a href="/monitor" target="_blank" rel="noopener noreferrer" className="nav-link" title="Apri il tabellone proiettore in una nuova finestra">
          <span className="nav-icon">📺</span>
          <span className="nav-label">Proiettore</span>
        </a>

        {canManageBoards && (
          <NavLink
            to="/boards"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            title="Gestione cartelle"
          >
            <span className="nav-icon">🎟️</span>
            <span className="nav-label">Cartelle</span>
          </NavLink>
        )}

        {(inManagement && sezioni.length > 0) && (
          <div className="sidebar-divider" />
        )}

        {inManagement && sezioni.length > 0
          ? sezioni.map((s) => (
              <NavLink
                key={s.key}
                to={s.to}
                className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                title={s.label}
              >
                <span className="nav-icon">{s.icon}</span>
                <span className="nav-label">{s.label}</span>
              </NavLink>
            ))
          : (
              <Link to="/console" className="nav-link">
                <span className="nav-icon">🎬</span>
                <span className="nav-label">Regia</span>
              </Link>
            )}

        {location.pathname === "/admin" && (
          <>
            <div className="sidebar-divider" />
            {ADMIN_SECTIONS.map((s) => (
              <NavLink
                key={s.key}
                to={`/admin?sez=${s.key}`}
                className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                title={s.label}
              >
                <span className="nav-icon">{s.icon}</span>
                <span className="nav-label">{s.label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
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
    </aside>
  );
}
