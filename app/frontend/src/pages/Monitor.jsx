import BoardView from "../components/BoardView.jsx";

// Vista "proiettore/monitor": tabellone a tutto schermo, senza navbar
// e senza alcun elemento di navigazione. Collegata dal tabellone pubblico.
export default function Monitor() {
  return <BoardView showChrome={false} />;
}
