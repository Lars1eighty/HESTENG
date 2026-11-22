import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import "./build.mjs";

const {default: worker} = await import("../dist/server/index.js");
const database = new DatabaseSync(":memory:");
database.exec(await readFile("drizzle/0000_club_nights.sql", "utf8"));
const DB = {prepare: sql => ({bind: (...values) => ({first: () => database.prepare(sql).get(...values)})})};

const port = Number(process.env.PORT) || 3000;
createServer(async (incoming, outgoing) => {
  try {
    const headers = new Headers(incoming.headers);
    headers.set("oai-authenticated-user-id", "local-preview");
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const url = "http://" + incoming.headers.host + incoming.url;
    const response = await worker.fetch(new Request(url, {method: incoming.method, headers, body}), {DB});
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    outgoing.writeHead(500).end("Fejl i lokal test.");
  }
}).listen(port, "0.0.0.0", () => console.log("Local: http://localhost:" + port));
