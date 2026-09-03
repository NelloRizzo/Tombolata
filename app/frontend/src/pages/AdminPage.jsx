import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useCurrentGame } from "../context/GameContext.jsx";
import { useGameState } from "../hooks/useGameState.js";
import GameManager from "../components/GameManager.jsx";
import { AdminUsers, AdminCast, AdminTriggers, AdminVideos, AdminSounds } from "../components/AdminPanel.jsx";

const SECTIONS = [
  { key: "games", label: "Partite", icon: "🃏", render: (ws) => <GameManager game={ws.game} /> },
  { key: "users", label: "Utenti", icon: "👥", render: () => <AdminUsers /> },
  { key: "cast", label: "Cast", icon: "🎭", render: (ws) => <AdminCast ws={ws} /> },
  { key: "triggers", label: "Trigger", icon: "⚡", render: (ws) => <AdminTriggers gameId={ws.game?._id} /> },
  { key: "videos", label: "Video", icon: "📽️", render: (ws) => <AdminVideos gameId={ws.game?._id} /> },
  { key: "sounds", label: "Suoni", icon: "🎧", render: (ws) => <AdminSounds gameId={ws.game?._id} /> }
];

export default function AdminPage() {
  const { user } = useAuth();
  const { currentGameId } = useCurrentGame();
  const ws = useGameState(currentGameId);
  const [section, setSection] = useState("games");

  const active = SECTIONS.find((s) => s.key === section) || SECTIONS[0];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [section]);

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-head">
          <span className="admin-sidebar-title">Amministrazione</span>
          <span className="admin-sidebar-user">{user?.displayName || user?.username || ""}</span>
        </div>
        <nav className="admin-sidebar-nav">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              className={`admin-side-link ${section === s.key ? "active" : ""}`}
              onClick={() => setSection(s.key)}
            >
              <span className="admin-side-icon">{s.icon}</span>
              <span className="admin-side-label">{s.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="admin-dashboard-main">
        <header className="admin-dashboard-header">
          <h1>{active.label}</h1>
        </header>
        <div className="admin-dashboard-content">
          {active.render(ws)}
        </div>
      </main>
    </div>
  );
}
