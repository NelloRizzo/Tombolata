import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { CurrentGameProvider } from "./context/GameContext.jsx";
import Home from "./pages/Home.jsx";
import Board from "./pages/Board.jsx";
import Monitor from "./pages/Monitor.jsx";
import PresenterPage from "./pages/PresenterPage.jsx";
import ActorPage from "./pages/ActorPage.jsx";
import Login from "./pages/Login.jsx";
import ConsoleHome from "./pages/ConsoleHome.jsx";
import BoardsPage from "./pages/BoardsPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import LotteryPage from "./pages/LotteryPage.jsx";
import AppLayout from "./components/AppLayout.jsx";

function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="loading">Caricamento...</div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <Outlet />;
}

// Layout con navbar per le pagine di gestione (login, console).
function ManagementLayout() {
  return <AppLayout />;
}

export default function App() {
  return (
    <AuthProvider>
      <CurrentGameProvider>
        <Routes>
          {/* A tutto schermo, senza navbar */}
          <Route path="/" element={<Home />} />
          <Route path="/board" element={<Board />} />
          <Route path="/monitor" element={<Monitor />} />
          <Route path="/presenter" element={<ProtectedRoute />}>
            <Route index element={<PresenterPage />} />
          </Route>
       <Route path="/actor" element={<ProtectedRoute />}>
            <Route index element={<ActorPage />} />
          </Route>

          {/* Con navbar */}
          <Route element={<ManagementLayout />}>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/console" element={<ConsoleHome />} />
              <Route path="/boards" element={<BoardsPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/lottery" element={<LotteryPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CurrentGameProvider>
    </AuthProvider>
  );
}
