import BoardView from "../components/BoardView.jsx";
import { useCurrentGame } from "../context/GameContext.jsx";

// Tabellone pubblico: a tutto schermo, senza navbar e senza link.
// La vista proiettore è raggiungibile direttamente via /monitor.
// Segue la partita corrente selezionata nella dashboard (localStorage).
export default function Board() {
  const { currentGameId } = useCurrentGame();
  return <BoardView showChrome gameId={currentGameId} />;
}
