import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || "tombolata";

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;

  if (!MONGODB_URI) {
    console.error("ERRORE: variabile d'ambiente MONGODB_URI mancante.");
    console.error("Aggiungila in Render.com (servizio backend) o in un file .env locale.");
    throw new Error("MONGODB_URI non configurata");
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME
    });
    isConnected = true;
    console.log(`✓ Connesso a MongoDB Atlas (database: ${DB_NAME})`);
  } catch (error) {
    console.error("Errore di connessione a MongoDB:", error.message);
    throw error;
  }
}

export function getDbStatus() {
  return isConnected;
}
