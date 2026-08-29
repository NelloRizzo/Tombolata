import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiUrl } from "../hooks/useWebSocket.js";

const AuthContext = createContext(null);

const TOKEN_KEY = "tombolata_token";
const USER_KEY = "tombolata_user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    const uRaw = localStorage.getItem(USER_KEY);
    if (t) {
      setToken(t);
      try {
        setUser(JSON.parse(uRaw));
      } catch {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await fetch(apiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.message || "Login fallito");
    localStorage.setItem(TOKEN_KEY, json.token);
    localStorage.setItem(USER_KEY, JSON.stringify(json.user));
    setToken(json.token);
    setUser(json.user);
    return json.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (role) => {
      if (!user) return false;
      return user.roles.includes("admin") || user.roles.includes(role);
    },
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, token, login, logout, hasRole, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
