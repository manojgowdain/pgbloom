import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import process from "node:process";

const composeFile = "docker-compose.test.yml";
const databaseUrl = process.env.DATABASE_URL ?? "postgresql://pgbloom:pgbloom@127.0.0.1:55432/pgbloom_test";
const compose = process.env.DOCKER_COMPOSE ?? "docker compose";
const composeArgs = compose.split(/\s+/).filter(Boolean);

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env,
      shell: process.platform === "win32" && command.endsWith(".cmd"),
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code ?? signal}`));
    });
  });
}

async function composeRun(args) {
  await run(composeArgs[0], [...composeArgs.slice(1), "-f", composeFile, ...args]);
}

let exitCode = 0;
try {
  await access(composeFile);
  console.log("========================================");
  console.log("PGBloom PostgreSQL test suite");
  console.log("========================================");
  await composeRun(["up", "-d", "--wait"]);
  await run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"]);
  await run(process.platform === "win32" ? "npm.cmd" : "npm", ["test"], {
    ...process.env,
    DATABASE_URL: undefined,
    SKIP_INTEGRATION: "true",
  });
  await run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "test:integration"], {
    ...process.env,
    DATABASE_URL: databaseUrl,
  });
  await run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "test:persistence"], {
    ...process.env,
    DATABASE_URL: databaseUrl,
  });
} catch (error) {
  exitCode = 1;
  console.error(`\nTest suite failed: ${error.message}`);
} finally {
  try {
    await composeRun(["down", "-v", "--remove-orphans"]);
  } catch (error) {
    exitCode = 1;
    console.error(`\nDocker cleanup failed: ${error.message}`);
  }
}

process.exitCode = exitCode;
