import { Router } from "express";
import User from "../models/User.js";
import { hashPassword, verifyPassword, signToken } from "../services/auth.js";
import { authenticate, requireRoles } from "../services/authMiddleware.js";

const router = Router();

// Login pubblico
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ ok: false, message: "Username e password richiesti" });
    }
    const user = await User.findOne({ username, active: true });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ ok: false, message: "Credenziali non valide" });
    }
    const token = signToken({
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName,
      roles: user.roles,
      character: user.character
    });
    res.json({
      ok: true,
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        displayName: user.displayName,
        roles: user.roles,
        character: user.character
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// Info utente corrente
router.get("/me", authenticate, async (req, res) => {
  res.json({ ok: true, user: req.user });
});

// Lista utenti (solo admin)
router.get("/users", authenticate, requireRoles("admin"), async (req, res) => {
  try {
    const users = await User.find({}).select("-passwordHash").sort({ username: 1 });
    res.json({ ok: true, data: users });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// Crea utente (solo admin)
router.post("/users", authenticate, requireRoles("admin"), async (req, res) => {
  try {
    const { username, password, displayName, roles, character, active } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ ok: false, message: "Username e password richiesti" });
    }
    if (await User.findOne({ username })) {
      return res.status(409).json({ ok: false, message: "Username già esistente" });
    }
    const user = new User({
      username,
      passwordHash: hashPassword(password),
      displayName: displayName || username,
      roles: roles && roles.length ? roles : ["spettatore"],
      character: character || null,
      active: active !== false
    });
    await user.save();
    const safe = user.toObject();
    delete safe.passwordHash;
    res.status(201).json({ ok: true, data: safe });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// Aggiorna utente (solo admin)
router.put("/users/:id", authenticate, requireRoles("admin"), async (req, res) => {
  try {
    const { password, displayName, roles, character, active } = req.body || {};
    const update = {};
    if (password) update.passwordHash = hashPassword(password);
    if (displayName !== undefined) update.displayName = displayName;
    if (roles !== undefined) update.roles = roles;
    if (character !== undefined) update.character = character;
    if (active !== undefined) update.active = active;
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select("-passwordHash");
    if (!user) return res.status(404).json({ ok: false, message: "Utente non trovato" });
    res.json({ ok: true, data: user });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.delete("/users/:id", authenticate, requireRoles("admin"), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

export default router;
