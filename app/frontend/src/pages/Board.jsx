import BoardView from "../components/BoardView.jsx";
import { useCurrentGame } from "../context/GameContext.jsx";

// Tabellone pubblico: a tutto schermo, senza navbar, con il link
// per aprire la vista monitor a schermo intero (/monitor).
// Segue la partita corrente selezionata nella dashboard (localeStorage).
export default function Board() {
  const { currentGameId } = useCurrentGame();
  return <BoardView showChrome gameId={currentGameId} />;
}
