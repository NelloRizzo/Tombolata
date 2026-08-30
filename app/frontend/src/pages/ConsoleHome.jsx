import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCurrentGame } from "../context/GameContext.jsx";
import { useGameState } from "../hooks/useGameState.js";
import DrawerPanel from "../components/DrawerPanel.jsx";
import RegistaPanel from "../components/RegistaPanel.jsx";
import VideoPanel from "../components/VideoPanel.jsx";
import FonicoPanel from "../components/FonicoPanel.jsx";
import AttorePanel from "../components/AttorePanel.jsx";
import SpettatorePanel from "../components/SpettatorePanel.jsx";
import AdminPanel from "../components/AdminPanel.jsx";
import PublicBoardPopup from "../components/PublicBoardPopup.jsx";

const ROLE_LABELS = {
  admin: "Gestione",
  regista: "Regia",
  video: "Video",
  fonico: "Fonico",
  drawer: "Estrazione",
  attore: "Attore",
  spettatore: "Tabellone"
};

const ROLE_ORDER = ["admin", "regista", "video", "fonico", "drawer", "attore", "spettatore"];

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
        <p>Account senza ruoli attivi. Contatta l'amministratore.</p>
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
        {activeTab === "regista" && <RegistaPanel ws={ws} gameId={currentGameId} />}
        {activeTab === "video" && <VideoPanel ws={ws} gameId={currentGameId} />}
        {activeTab === "fonico" && <FonicoPanel ws={ws} gameId={currentGameId} />}
        {activeTab === "drawer" && <DrawerPanel ws={ws} gameId={currentGameId} />}
        {activeTab === "attore" && <AttorePanel ws={ws} gameId={currentGameId} />}
        {activeTab === "spettatore" && <SpettatorePanel ws={ws} />}
      </main>

      <PublicBoardPopup narration={ws.narration} />
    </div>
  );
}
