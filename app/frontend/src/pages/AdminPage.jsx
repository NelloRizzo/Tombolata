import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useCurrentGame } from "../context/GameContext.jsx";
import { useGameState } from "../hooks/useGameState.js";
import GameManager from "../components/GameManager.jsx";
import { AdminUsers, AdminCast, AdminTriggers, AdminVideos, AdminSounds } from "../components/AdminPanel.jsx";

export const ADMIN_SECTIONS = [
  { key: "games", label: "Partite", icon: "🃏", render: (ws) => <GameManager game={ws.game} /> },
  { key: "users", label: "Utenti", icon: "👥", render: () => <AdminUsers /> },
  { key: "cast", label: "Cast", icon: "🎭", render: (ws) => <AdminCast ws={ws} /> },
  { key: "triggers", label: "Trigger", icon: "⚡", render: (ws) => <AdminTriggers gameId={ws.game?._id} /> },
  { key: "videos", label: "Video", icon: "📽️", render: (ws) => <AdminVideos gameId={ws.game?._id} /> },
  { key: "sounds", label: "Suoni", icon: "🎧", render: (ws) => <AdminSounds gameId={ws.game?._id} /> }
];

export default function AdminPage() {
  const { currentGameId } = useCurrentGame();
  const ws = useGameState(currentGameId);
  const [searchParams] = useSearchParams();

  const sez = searchParams.get("sez");
  const active = ADMIN_SECTIONS.find((s) => s.key === sez) || ADMIN_SECTIONS[0];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [sez]);

  return (
    <div className="admin-dashboard">
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
