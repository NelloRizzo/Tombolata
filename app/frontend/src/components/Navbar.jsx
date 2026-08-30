import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCurrentGame } from "../context/GameContext.jsx";
import { apiRequest } from "../api.js";

const ROLE_SEZIONI = [
  { key: "admin", label: "Gestione", icon: "⚙️" },
  { key: "regista", label: "Regia", icon: "🎬" },
  { key: "drawer", label: "Estrazione", icon: "🎰" },
  { key: "video", label: "Video", icon: "📽️" },
  { key: "fonico", label: "Audio", icon: "🎧" },
  { key: "attore", label: "Attore", icon: "🎭" },
  { key: "spettatore", label: "Tabellone", icon: "🖥️" }
];

// Selezione della partita corrente: le azioni della dashboard e il tabellone
// pubblico di questo browser si riferiscono alla partita scelta.
function GameSelector() {
  const { currentGameId, setCurrentGame } = useCurrentGame();
  const [games, setGames] = useState([]);

  useEffect(() => {
    apiRequest("/api/game/history")
      .then((json) => {
        if (json.ok) setGames(json.data);
      })
      .catch(() => {});
  }, []);

  const currentName = games.find((g) => String(g._id) === String(currentGameId))?.name;

  return (
    <label className="game-selector" title="Partita corrente della dashboard">
      <span className="gs-label">{currentName || (currentGameId ? "Partita selezionata" : "Partita auto")}</span>
      <select
        value={currentGameId || ""}
        onChange={(e) => setCurrentGame(e.target.value || null)}
      >
        <option value="">✓ Partita attiva (automatica)</option>
        {games
          .filter((g) => g.status !== "finished")
          .map((g) => (
            <option key={g._id} value={g._id}>
              {g.name}
              {g.status === "scheduled" ? " (programmata)" : ""}
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
        <GameSelector />
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
