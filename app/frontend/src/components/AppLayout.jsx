import { Outlet } from "react-router-dom";
import Navbar from "./Navbar.jsx";

// Layout di gestione con sidebar a sinistra e contenuto a destra.
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
