import { useCurrentGame } from "../context/GameContext.jsx";
import { useGameState } from "../hooks/useGameState.js";
import BoardManager from "../components/BoardManager.jsx";

// Pagina a parte per la gestione delle cartelle.
// Sinconizzata via WebSocket con la partita attiva (o quella selezionata in console).
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
          <BoardManager game={game} />
        ) : (
          <p className="empty">Caricamento partita...</p>
        )}
      </main>
    </div>
  );
}