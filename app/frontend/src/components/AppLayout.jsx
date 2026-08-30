import { Outlet } from "react-router-dom";
import Navbar from "./Navbar.jsx";

// Layout con navbar di navigazione per le pagine di gestione.
// Il tabellone pubblico (/) e la vista monitor (/monitor) NON usano questo
// layout: restano a tutto schermo senza navbar.
export default function AppLayout() {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
