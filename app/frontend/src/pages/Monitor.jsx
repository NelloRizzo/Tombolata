import BoardView from "../components/BoardView.jsx";
import { useCurrentGame } from "../context/GameContext.jsx";

// Vista "proiettore/monitor": tabellone a tutto schermo, senza navbar
// e senza alcun elemento di navigazione. Collegata dal tabellone pubblico.
export default function Monitor() {
  const { currentGameId } = useCurrentGame();
  return <BoardView showChrome={false} gameId={currentGameId} />;
}
