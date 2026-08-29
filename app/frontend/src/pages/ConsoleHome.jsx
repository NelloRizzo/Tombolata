import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
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
  admin: "Admin",
  regista: "Regia",
  video: "Video",
  fonico: "Fonico",
  drawer: "Estrazione",
  attore: "Attore",
  spettatore: "Tabellone"
};

export default function ConsoleHome() {
  const { user, logout, hasRole } = useAuth();
  const ws = useGameState();
  const [tab, setTab] = useState(null);

  const orderedRoles = ["admin", "regista", "video", "fonico", "drawer", "attore", "spettatore"];
  const myRoles = orderedRoles.filter((r) => hasRole(r));

  if (myRoles.length === 0) {
    return (
      <div className="console-page">
        <p>Account senza ruoli attivi. Contatta l'amministratore.</p>
      </div>
    );
  }

  const activeTab = tab && myRoles.includes(tab) ? tab : myRoles[0];

  return (
    <div className="console-page">
      <header className="console-header">
        <div className="console-title">
          <h1>Postazione {ROLE_LABELS[activeTab]}</h1>
          <span className="user-welcome">Benvenuto, {user.displayName || user.username}</span>
        </div>
        <div className="console-meta">
          <button className="btn-sm" onClick={logout}>Esci</button>
        </div>
      </header>

      <nav className="role-tabs">
        {myRoles.map((r) => (
          <button
            key={r}
            className={`role-tab ${activeTab === r ? "active" : ""}`}
            onClick={() => setTab(r)}
          >
            {ROLE_LABELS[r]}
          </button>
        ))}
      </nav>

      <main className="console-main">
        {activeTab === "admin" && <AdminPanel ws={ws} />}
        {activeTab === "regista" && <RegistaPanel ws={ws} />}
        {activeTab === "video" && <VideoPanel ws={ws} />}
        {activeTab === "fonico" && <FonicoPanel ws={ws} />}
        {activeTab === "drawer" && <DrawerPanel ws={ws} />}
        {activeTab === "attore" && <AttorePanel ws={ws} />}
        {activeTab === "spettatore" && <SpettatorePanel ws={ws} />}
      </main>

      <PublicBoardPopup narration={ws.narration} />
    </div>
  );
}
