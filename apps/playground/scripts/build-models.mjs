// Builds every model app in apps/ into the playground's public/models dir.
// Each app's own vite.config points its outDir there, so this only has to find
// the apps and run their builds, one at a time to keep memory use flat.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const appsDir = path.resolve(import.meta.dirname, "../..");
const modelApps = readdirSync(appsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== "playground")
  .map((entry) => entry.name)
  .filter((name) => existsSync(path.join(appsDir, name, "package.json")))
  .sort();

if (modelApps.length === 0) {
  console.log("No model apps to build yet.");
}

for (const name of modelApps) {
  console.log(`Building ${name}…`);
  execFileSync("pnpm", ["--dir", path.join(appsDir, name), "build"], {
    stdio: "inherit",
  });
}
