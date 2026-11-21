import { useCurrentGame } from "../context/GameContext.jsx";
import { useGameState } from "../hooks/useGameState.js";
import LotteryPanel from "../components/LotteryPanel.jsx";

export default function LotteryPage() {
  const { currentGameId } = useCurrentGame();
  useGameState(currentGameId);
  return (
    <div className="admin-dashboard">
      <main className="admin-dashboard-main">
        <header className="admin-dashboard-header">
          <h1>Lotteria — Estrazione</h1>
        </header>
        <div className="admin-dashboard-content">
          <LotteryPanel mode="draw" />
        </div>
      </main>
    </div>
  );
}
