import { createContext, useCallback, useContext, useMemo, useState } from "react";

const KEY = "tombolata.currentGameId";

const GameContext = createContext(null);

// Partita corrente del browser (persistita in localStorage): tutte le azioni
// della dashboard e il tabellone pubblico referenziano la partita selezionata.
export function CurrentGameProvider({ children }) {
  const [currentGameId, setCurrentGameId] = useState(() => {
    try {
      return localStorage.getItem(KEY) || null;
    } catch {
      return null;
    }
  });

  const setCurrentGame = useCallback((id) => {
    const next = id || null;
    try {
      if (next) localStorage.setItem(KEY, next);
      else localStorage.removeItem(KEY);
    } catch {
      // localStorage non disponibile: la selezione resta di sessione
    }
    setCurrentGameId(next);
  }, []);

  const value = useMemo(
    () => ({ currentGameId, setCurrentGame }),
    [currentGameId, setCurrentGame]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useCurrentGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useCurrentGame deve essere usato dentro CurrentGameProvider");
  return ctx;
}