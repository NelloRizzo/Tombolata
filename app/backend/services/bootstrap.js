import User from "../models/User.js";
import { hashPassword } from "./auth.js";

export async function bootstrap() {
  // Crea l'admin di default se non esistono utenti
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    const adminUsername = process.env.ADMIN_USERNAME || "admin";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin";
    await User.create({
      username: adminUsername,
      passwordHash: hashPassword(adminPassword),
      displayName: "Amministratore",
      roles: ["admin"],
      active: true
    });
    console.log(`✓ Utente admin di default creato: ${adminUsername}`);
  }
}
