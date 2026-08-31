import { useCurrentGame } from "../context/GameContext.jsx";
import { useGameState } from "../hooks/useGameState.js";
import CardInventory from "../components/CardInventory.jsx";
import BoardManager from "../components/BoardManager.jsx";

// Pagina cartelle: archivio globale (import + selezione "messa in gioco")
// e cartelle in gioco per la partita corrente (o quella selezionata in console).
// Sinconizzata via WebSocket con la partita attiva/selezionata.
export default function BoardsPage() {
  const { currentGameId } = useCurrentGame();
  const ws = useGameState(currentGameId);
  const game = ws.game;

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

      <main className="console-main">
        {game ? (
          <>
            <CardInventory game={game} />
            <BoardManager game={game} />
          </>
        ) : (
          <p className="empty">Caricamento partita...</p>
        )}
      </main>
    </div>
  );
}