import { useState } from "react";
import { useCurrentGame } from "../context/GameContext.jsx";
import { useGameState } from "../hooks/useGameState.js";
import CardInventory from "../components/CardInventory.jsx";
import BoardManager from "../components/BoardManager.jsx";
import WinCheckPanel from "../components/WinCheckPanel.jsx";

// Pagina cartelle, organizzata in due sezioni distinte:
// 1. "Cartelle in gioco": gestione dell'archivio (import + selezione "messa in
//    gioco"/"tolta dal gioco") e delle cartelle in gioco della partita corrente.
// 2. "Controllo vincite": verifica, sulle cartelle in gioco, di quale vincita
//    ogni cartella ha raggiunto in base ai numeri estratti.
// Sinconizzata via WebSocket con la partita attiva/selezionata.
export default function BoardsPage() {
  const { currentGameId } = useCurrentGame();
  const ws = useGameState(currentGameId);
  const game = ws.game;
  const [tab, setTab] = useState("check");

  return (
    <div className="console-page">
      <header className="console-header">
        <div className="console-title">
          <h1>Gestione cartelle</h1>
          <span className="user-welcome">
            Partita: {game?.name || (currentGameId ? "..." : "attiva")}
          </span>
        </div>
      </header>

      <nav className="page-tabs">
        <button
          className={`role-tab${tab === "play" ? " active" : ""}`}
          onClick={() => setTab("play")}
        >
          Cartelle in gioco
        </button>
        <button
          className={`role-tab${tab === "check" ? " active" : ""}`}
          onClick={() => setTab("check")}
        >
          Controllo vincite
        </button>
      </nav>

      <main className="console-main">
        {game ? (
          tab === "check" ? (
            <WinCheckPanel game={game} />
          ) : (
            <>
              <CardInventory game={game} />
              <BoardManager game={game} />
            </>
          )
        ) : (
          <p className="empty">Caricamento partita...</p>
        )}
      </main>
    </div>
  );
}