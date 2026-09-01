import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCurrentGame } from "../context/GameContext.jsx";
import { useGameState } from "../hooks/useGameState.js";
import DrawerPanel from "../components/DrawerPanel.jsx";
import DirectorPanel from "../components/DirectorPanel.jsx";
import VideoPanel from "../components/VideoPanel.jsx";
import AudioPanel from "../components/AudioPanel.jsx";
import ActorPanel from "../components/ActorPanel.jsx";
import SpectatorPanel from "../components/SpectatorPanel.jsx";
import AdminPanel from "../components/AdminPanel.jsx";
import PublicBoardPopup from "../components/PublicBoardPopup.jsx";

const ROLE_LABELS = {
  admin: "Gestione",
  director: "Regia",
  video: "Video",
  audio: "Audio",
  drawer: "Estrazione",
  actor: "Attore"
};

const ROLE_ORDER = ["admin", "director", "video", "audio", "drawer", "actor"];

export default function ConsoleHome() {
  const { user, hasRole } = useAuth();
  const { currentGameId } = useCurrentGame();
  const ws = useGameState(currentGameId);
  const [searchParams, setSearchParams] = useSearchParams();
  // Manteniamo un fallback interno per il caso di nessuna query string.
  const [fallbackTab, setFallbackTab] = useState(null);

  const myRoles = ROLE_ORDER.filter((r) => hasRole(r));

  if (myRoles.length === 0) {
    return (
      <div className="console-page">
        <header className="console-header">
          <div className="console-title">
            <h1>Postazione Tabellone</h1>
            <span className="user-welcome">
              Benvenuto, {user.displayName || user.username}
            </span>
          </div>
        </header>
        <main className="console-main">
          <SpectatorPanel ws={ws} />
        </main>
        <PublicBoardPopup narration={ws.narration} gameId={currentGameId} />
      </div>
    );
  }

  const queryTab = searchParams.get("tab");
  const requested = queryTab && myRoles.includes(queryTab) ? queryTab : null;
  const activeTab = requested || fallbackTab || myRoles[0];

  function selectTab(role) {
    if (!myRoles.includes(role)) return;
    setFallbackTab(role);
    setSearchParams({ tab: role });
  }

  return (
    <div className="console-page">
      <header className="console-header">
        <div className="console-title">
          <h1>Postazione {ROLE_LABELS[activeTab]}</h1>
          <span className="user-welcome">
            Benvenuto, {user.displayName || user.username}
          </span>
        </div>
      </header>

      <main className="console-main">
        {activeTab === "admin" && <AdminPanel ws={ws} />}
        {activeTab === "director" && <DirectorPanel ws={ws} gameId={currentGameId} />}
        {activeTab === "video" && <VideoPanel ws={ws} gameId={currentGameId} />}
        {activeTab === "audio" && <AudioPanel ws={ws} gameId={currentGameId} />}
        {activeTab === "drawer" && <DrawerPanel ws={ws} gameId={currentGameId} />}
        {activeTab === "actor" && <ActorPanel ws={ws} gameId={currentGameId} />}
      </main>

      <PublicBoardPopup narration={ws.narration} gameId={currentGameId} />
    </div>
  );
}
