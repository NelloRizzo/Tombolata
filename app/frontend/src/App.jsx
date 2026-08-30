import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Board from "./pages/Board.jsx";
import Monitor from "./pages/Monitor.jsx";
import Login from "./pages/Login.jsx";
import ConsoleHome from "./pages/ConsoleHome.jsx";
import AppLayout from "./components/AppLayout.jsx";

function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Caricamento...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

// Layout con navbar per le pagine di gestione (login, console).
function ManagementLayout() {
  return <AppLayout />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* A tutto schermo, senza navbar */}
        <Route path="/" element={<Board />} />
        <Route path="/monitor" element={<Monitor />} />

        {/* Con navbar */}
        <Route element={<ManagementLayout />}>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/console" element={<ConsoleHome />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
