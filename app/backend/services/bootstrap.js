import User from "../models/User.js";
import Actor from "../models/Actor.js";
import { hashPassword } from "./auth.js";

// Personaggi da personaggi.md
const DEFAULT_ACTORS = [
  { name: "Totonno", description: "Si trova sempre in mezzo", object: "portachiavi" },
  { name: "Concetta", description: "Sa tutto", object: "cellulare" },
  { name: "Don Carmine", description: "Custode della memoria", object: "fotografia" },
  { name: "Filomena", description: "Quella che è tornata", object: "cartolina" },
  { name: "Michele", description: "Il giovane che vuole andare via", object: "cuffie" },
  { name: "Postino", description: "La consegna", object: "borsa della posta" }
];

export async function bootstrap() {
  // Crea i personaggi di default se non esistono
  const actorCount = await Actor.countDocuments();
  if (actorCount === 0) {
    for (const a of DEFAULT_ACTORS) {
      await Actor.create(a);
    }
    console.log("✓ Personaggi di default creati");
  }

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
