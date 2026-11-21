import { MongoMemoryServer } from "mongodb-memory-server";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mongod = await MongoMemoryServer.create();
const uri = mongod.getUri();
console.log("✓ MongoMemoryServer avviato:", uri);

const child = spawn(process.execPath, ["index.js"], {
  cwd: __dirname,
  env: { ...process.env, MONGODB_URI: uri, MONGODB_DB_NAME: "tombolata", PORT: "3001", CLIENT_ORIGIN: "http://localhost:5173", JWT_SECRET: "dev-secret", ADMIN_USERNAME: "admin", ADMIN_PASSWORD: "admin" },
  stdio: "inherit",
});

child.on("exit", (code) => {
  mongod.stop().finally(() => process.exit(code ?? 0));
});

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
