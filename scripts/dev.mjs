import { spawn } from "node:child_process";

const commands = [
  { name: "web", args: ["run", "dev:web"] },
  { name: "mobile", args: ["run", "dev:mobile"] },
  { name: "backend", args: ["run", "dev:backend"] }
];

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const children = commands.map(({ name, args }) => {
  const child = spawn(npmCommand, args, {
    stdio: "pipe",
    shell: false,
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
