import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const command = process.platform === "darwin" ? "caffeinate" : "lhci";
const args = process.platform === "darwin" ? ["-dimsu", "lhci", "autorun"] : ["autorun"];
const child = spawn(command, args, {
  env: { ...process.env, CHROME_PATH: chromium.executablePath() },
  stdio: "inherit"
});

child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Lighthouse CI exited after signal ${signal}.`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
