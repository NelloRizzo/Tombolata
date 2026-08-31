import User from "../models/User.js";
import { hashPassword } from "./auth.js";

// Migrazione idempotente dei vecchi nomi ruolo in inglese.
// ("regista"→"director", "fonico"→"audio", "attore"→"actor"); "spettatore" viene rimosso.
const ROLE_MIGRATION = {
  regista: "director",
  fonico: "audio",
  attore: "actor",
  spettatore: null
};

async function migrateRoles() {
  const users = await User.find({ roles: { $in: Object.keys(ROLE_MIGRATION) } });
  let updated = 0;
  for (const u of users) {
    const next = u.roles
      .map((r) => ROLE_MIGRATION[r] ?? r)
      .filter((r) => r !== null);
    if (JSON.stringify(next) !== JSON.stringify(u.roles)) {
      u.roles = next;
      await u.save();
      updated++;
    }
  }
  if (updated) {
    console.log(`✓ Ruoli aggiornati per ${updated} utente/i (regista→director, fonico→audio, attore→actor)`);
  }
}

export async function bootstrap() {
  await migrateRoles();

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
