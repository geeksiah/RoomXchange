import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const commands = [
  { name: "web", command: "npm run dev:web" },
  { name: "mobile", command: "npm run dev:mobile" },
  { name: "backend", command: "npm run dev:backend" }
];

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFilePath = path.join(rootDir, ".env");

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
        return [key, value];
      })
  );
}

const loadedEnv = loadDotEnv(envFilePath);
const sharedEnv = {
  ...loadedEnv,
  ...process.env
};

sharedEnv.ROOMXCHANGE_WEB_URL ||= "http://localhost:3000";
sharedEnv.NEXT_PUBLIC_ROOMXCHANGE_WEB_URL ||= sharedEnv.ROOMXCHANGE_WEB_URL;
sharedEnv.NEXT_PUBLIC_ROOMXCHANGE_API_URL ||= "http://localhost:4000";
sharedEnv.EXPO_PUBLIC_ROOMXCHANGE_API_URL ||= sharedEnv.NEXT_PUBLIC_ROOMXCHANGE_API_URL;
sharedEnv.EXPO_PUBLIC_ROOMXCHANGE_WEB_URL ||= sharedEnv.ROOMXCHANGE_WEB_URL;

const children = commands.map(({ name, command }) => {
  const child = spawn(command, {
    stdio: "pipe",
    shell: true,
    windowsHide: false,
    env: sharedEnv
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[${name}] ${chunk}`);
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[${name}] ${chunk}`);
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      process.exitCode = code;
    }
  });

  return child;
});

function shutdown(signal) {
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
