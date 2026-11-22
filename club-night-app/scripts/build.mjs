import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";

const template = [
  ["index.html", "text/html; charset=utf-8"],
  ["style.css", "text/css; charset=utf-8"],
  ["app.mjs", "text/javascript; charset=utf-8"],
  ["engine.mjs", "text/javascript; charset=utf-8"],
];
const assets = Object.fromEntries(await Promise.all(template.map(async ([file, type]) =>
  ["/" + file, {type, body: await readFile("web/" + file, "utf8")}]
)));
await mkdir("dist/server", { recursive: true });
await mkdir("dist/.openai", { recursive: true });
await Promise.all([
  writeFile("dist/server/assets.mjs", "export const assets = " + JSON.stringify(assets) + ";\n"),
  copyFile("worker/index.mjs", "dist/server/index.js"),
  copyFile("web/engine.mjs", "dist/server/engine.mjs"),
]);
try {
  await copyFile(".openai/hosting.json", "dist/.openai/hosting.json");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
