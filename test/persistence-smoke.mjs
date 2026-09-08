import { spawn } from "node:child_process";
import { createPgbloom } from "../dist/esm/index.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const composeFile = "docker-compose.test.yml";
const compose = process.env.DOCKER_COMPOSE ?? "docker compose";
const composeArgs = compose.split(/\s+/).filter(Boolean);
const key = `persistence:${process.pid}:${Date.now()}`;

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: false });
    child.on("error", reject);
    child.on("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code ?? signal}`)));
  });
}

async function composeRun(args) {
  await run(composeArgs[0], [...composeArgs.slice(1), "-f", composeFile, ...args]);
}

const first = await createPgbloom(databaseUrl, { cleanupInterval: false });
await first.setCache(key, { persisted: true }, 60 * 60 * 1000);
await first.setCounter(key, 17);
await first.close();

await composeRun(["down"]);
await composeRun(["up", "-d", "--wait"]);

const second = await createPgbloom(databaseUrl, { cleanupInterval: false });
try {
  if (JSON.stringify(await second.getCache(key)) !== JSON.stringify({ persisted: true })) {
    throw new Error("cache value did not survive PostgreSQL restart");
  }
  const counter = await second.getCounter(key);
  if (counter.value !== 17) throw new Error(`counter did not survive PostgreSQL restart: ${counter.value}`);
  console.log("Persistence/restart smoke test passed.");
} finally {
  await second.deleteCache(key);
  await second.removeCounter(key);
  await second.close();
}
