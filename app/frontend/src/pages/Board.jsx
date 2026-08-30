import BoardView from "../components/BoardView.jsx";

// Tabellone pubblico: a tutto schermo, senza navbar, con il link
// per aprire la vista monitor a schermo intero (/monitor).
export default function Board() {
  return <BoardView showChrome />;
}
