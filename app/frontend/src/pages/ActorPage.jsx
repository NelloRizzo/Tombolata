import { useAuth } from "../context/AuthContext.jsx";
import { useCurrentGame } from "../context/GameContext.jsx";
import { useGameState } from "../hooks/useGameState.js";
import ActorPanel from "../components/ActorPanel.jsx";

export default function ActorPage() {
  const { logout, user } = useAuth();
  const { currentGameId } = useCurrentGame();
  const ws = useGameState(currentGameId);

  return (
    <div className="presenter-page">
      <header className="presenter-page-header">
        <span className="presenter-page-title">🎭 Attore</span>
        <span className="presenter-page-user">{user?.displayName || user?.username}</span>
        <button className="navbar-logout" onClick={() => { logout(); window.location.href = "/"; }}>
          Esci
        </button>
      </header>
      <main className="presenter-page-main">
        <ActorPanel ws={ws} gameId={currentGameId} />
      </main>
    </div>
  );
}