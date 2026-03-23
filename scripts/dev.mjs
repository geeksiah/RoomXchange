import { spawn } from "node:child_process";

const commands = [
  { name: "web", command: "npm run dev:web" },
  { name: "mobile", command: "npm run dev:mobile" },
  { name: "backend", command: "npm run dev:backend" }
];

const children = commands.map(({ name, command }) => {
  const child = spawn(command, {
    stdio: "pipe",
    shell: true,
    windowsHide: false,
    env: process.env
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
