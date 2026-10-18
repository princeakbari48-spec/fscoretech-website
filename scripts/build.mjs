import { mkdir, copyFile, rm, readdir } from "node:fs/promises";
import { resolve, relative } from "node:path";
const output = resolve("dist");
if (relative(process.cwd(), output) !== "dist")
  throw new Error("Unsafe output path");
await rm(output, { recursive: true, force: true });
await mkdir("dist", { recursive: true });
// Explicit public allowlist: never upload the repository root or installer files.
for (const file of (await readdir(".")).filter((f) => f.endsWith(".html")))
  await copyFile(file, `dist/${file}`);
for (const file of ["robots.txt", "sitemap.xml", "_headers"])
  await copyFile(file, `dist/${file}`);
for (const asset of [
  "assets/css/styles.css",
  "assets/js/config.js",
  "assets/js/main.js",
  "assets/icons/favicon.svg",
  "assets/images/fscoretech-emblem.png",
  "assets/images/fsp-calling-line.png",
  "assets/images/fsp-media-player.png",
  "assets/images/fsp-download-manager.png",
]) {
  await mkdir(resolve("dist", asset, ".."), { recursive: true });
  await copyFile(asset, `dist/${asset}`);
}
await copyFile("_routes.json", "dist/_routes.json");
console.log("Public site prepared in dist; Functions are bundled by Wrangler.");
