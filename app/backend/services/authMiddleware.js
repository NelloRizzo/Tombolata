import { verifyToken } from "./auth.js";

// Middleware che autentica l'utente dal Bearer token
export function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ ok: false, message: "Token mancante" });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ ok: false, message: "Token non valido o scaduto" });
  }
  req.user = payload;
  next();
}

// Middleware di autorizzazione per ruolo ('admin' ha sempre accesso)
export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ ok: false, message: "Non autenticato" });
    if (req.user.roles.includes("admin")) return next();
    const has = req.user.roles.some((r) => roles.includes(r));
    if (!has) {
      return res.status(403).json({ ok: false, message: "Permessi insufficienti" });
    }
    next();
  };
}
