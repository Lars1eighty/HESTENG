import { cleanRoster, drawPools, schedulePool, validatePlan } from "./engine.mjs";

const get = id => document.getElementById(id);
const notice = text => { get("notice").textContent = text; };
const example = ["Anders B.", "Betina P.", "Camilla H.", "Danni M.", "Emil N.", "Freja S.",
  "Gitte K.", "Henrik D.", "Ida V.", "Jakob M.", "Katrine S.", "Lars H."];
const programId = location.pathname.split("/")[2];
let pools = [];
let shareId = "";
let drawnRoster = "";
let saving = false;

function element(tag, text, className) {
  const item = document.createElement(tag);
  if (text) item.textContent = text;
  if (className) item.className = className;
  return item;
}

function rosterList(players) {
  const list = element("ul", "", "pool-roster");
  list.setAttribute("role", "list");
  list.setAttribute("aria-label", "Spillere");
  list.append(...players.map(player => element("li", player)));
  return list;
}

function roundsList(pool, player) {
  const list = element("ol", "", "rounds");
  list.setAttribute("role", "list");
  schedulePool(pool.players, pool.boards).forEach((round, index) => {
    const matches = player ? round.filter(pair => pair.includes(player)) : round;
    if (!matches.length) return;
    const row = element("li");
    const games = element("ul", "", "games");
    games.setAttribute("role", "list");
    for (const [a, b] of matches) {
      games.append(element("li", player ? (a === player ? b : a) : a + " mod " + b));
    }
    row.append(element("h3", "Runde " + (index + 1)), games);
    list.append(row);
  });
  return list;
}

function currentPlan() {
  return validatePlan({club: get("club").value, pools});
}

function preparePrint(onlyPool) {
  const plan = currentPlan();
  const cards = onlyPool ? plan.pools.filter(pool => pool.id === onlyPool) : plan.pools;
  get("printout").replaceChildren(...cards.map(pool => {
    const page = element("article", "", "print-pool");
    page.append(element("p", plan.club), element("h2", "Pulje " + pool.id),
      rosterList(pool.players), roundsList(pool));
    return page;
  }));
}

function printProgram(onlyPool) {
  try {
    preparePrint(onlyPool);
    window.print();
  } catch (error) {
    notice(error.message);
  }
}

function poolCard(pool, editable, open) {
  const details = element("details", "", "pool");
  details.open = open;
  details.dataset.pool = pool.id;
  const summary = element("summary");
  const badge = element("span", pool.id, "pool-id");
  badge.setAttribute("aria-hidden", "true");
  const meta = element("span", pool.players.length + " spillere", "pool-meta");
  summary.append(badge, element("span", "Pulje " + pool.id, "pool-title"), meta);
  const body = element("div", "", "pool-body");
  body.append(rosterList(pool.players));
  let rounds = roundsList(pool);
  if (editable) {
    const controls = element("div", "", "pool-controls");
    const label = element("label", "Antal baner");
    const select = element("select");
    select.setAttribute("aria-label", "Antal baner i Pulje " + pool.id);
    select.append(new Option("2 baner", "2"), new Option("3 baner", "3"));
    select.value = String(pool.boards);
    select.addEventListener("change", () => {
      pool.boards = Number(select.value);
      const updated = roundsList(pool);
      rounds.replaceWith(updated);
      rounds = updated;
      notice("");
    });
    label.append(select);
    const print = element("button", "Udskriv pulje");
    print.type = "button";
    print.addEventListener("click", () => printProgram(pool.id));
    controls.append(label, print);
    body.append(controls);
  }
  body.append(rounds);
  details.append(summary, body);
  return details;
}

function renderSetup() {
  get("empty").hidden = pools.length > 0;
  get("planActions").hidden = pools.length === 0;
  get("pools").replaceChildren(...pools.map((pool, index) => poolCard(pool, true, index === 0)));
  const count = pools.reduce((total, pool) => total + pool.players.length, 0);
  get("planCount").textContent = pools.length ?
    count + " spillere · " + pools.length + (pools.length === 1 ? " pulje" : " puljer") : "";
  const shareUrl = shareId ? new URL("/program/" + shareId, location.origin).href : "";
  get("share").hidden = !shareUrl;
  if (shareUrl) {
    get("shareUrl").value = shareUrl;
    get("openProgram").href = shareUrl;
  }
}

function draw(demo = false) {
  try {
    if (!get("club").value.trim()) throw new Error("Indtast klubbens navn.");
    const roster = get("roster").value;
    pools = drawPools(cleanRoster(roster));
    drawnRoster = roster;
    if (demo) pools[0].boards = 3;
    renderSetup();
    notice("");
  } catch (error) {
    notice(error.message);
  }
}

async function publish() {
  if (saving) return;
  try {
    if (get("roster").value !== drawnRoster) {
      throw new Error("Spillerlisten er ændret. Lav puljer igen før du gemmer.");
    }
    const plan = currentPlan();
    saving = true;
    get("publish").disabled = true;
    notice("Gemmer programmet…");
    const response = await fetch("/api/club", {
      method: "PUT",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(plan),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    shareId = result.shareId;
    const expanded = [...get("pools").querySelectorAll("details[open]")].map(item => item.dataset.pool);
    renderSetup();
    for (const item of get("pools").querySelectorAll("details")) item.open = expanded.includes(item.dataset.pool);
    notice("Programmet er gemt på klubbens spillerlink.");
  } catch (error) {
    notice(error.message || "Kunne ikke gemme programmet.");
  } finally {
    saving = false;
    get("publish").disabled = false;
  }
}

async function setupPage() {
  notice("Henter klubbens program…");
  try {
    const response = await fetch("/api/club");
    if (response.status === 401) {
      get("signIn").hidden = false;
      notice("");
      return;
    }
    if (!response.ok) throw new Error();
    const saved = await response.json();
    if (saved) {
      shareId = saved.shareId;
      pools = saved.plan.pools;
      get("club").value = saved.plan.club;
      drawnRoster = pools.flatMap(pool => pool.players).join("\n");
      get("roster").value = drawnRoster;
    }
    notice("");
  } catch {
    notice("Det gemte program kunne ikke hentes. Du kan stadig prøve at lave puljer.");
  }
  get("editor").hidden = false;
  renderSetup();
}

async function playerPage() {
  notice("Henter kampprogrammet…");
  try {
    const response = await fetch("/api/program/" + encodeURIComponent(programId));
    if (!response.ok) throw new Error();
    const plan = await response.json();
    pools = plan.pools;
    get("heading").textContent = plan.club;
    get("heroMeta").textContent = "Klubaften";
    const names = pools.flatMap(pool => pool.players).sort((a, b) => a.localeCompare(b, "da"));
    get("playerName").replaceChildren(new Option("Vælg dit navn", ""),
      ...names.map(player => new Option(player, player)));
    get("playerPools").replaceChildren(...pools.map(pool => poolCard(pool, false, false)));
    get("player").hidden = false;
    notice("");
  } catch {
    notice("Kampprogrammet kunne ikke hentes. Tjek klubbens spillerlink.");
  }
}

function setView(personal) {
  get("mine").hidden = !personal;
  get("playerPools").hidden = personal;
  get("mineTab").setAttribute("aria-pressed", String(personal));
  get("allTab").setAttribute("aria-pressed", String(!personal));
}

get("drawForm").addEventListener("submit", event => { event.preventDefault(); draw(); });
get("demo").addEventListener("click", () => {
  get("club").value ||= "Eksempel Dartklub";
  get("roster").value = example.join("\n");
  draw(true);
});
get("printAll").addEventListener("click", () => printProgram());
get("publish").addEventListener("click", publish);
get("copy").addEventListener("click", async () => {
  const field = get("shareUrl");
  try {
    await navigator.clipboard.writeText(field.value);
    notice("Spillerlinket er kopieret.");
  } catch {
    field.focus();
    field.select();
    notice("Spillerlinket er markeret til kopiering.");
  }
});
get("mineTab").addEventListener("click", () => setView(true));
get("allTab").addEventListener("click", () => setView(false));
get("playerName").addEventListener("change", () => {
  const player = get("playerName").value;
  const pool = pools.find(item => item.players.includes(player));
  get("personalRounds").replaceChildren(...(pool ?
    [element("h2", "Pulje " + pool.id), roundsList(pool, player)] : []));
});
window.addEventListener("beforeprint", () => {
  if (get("printout").childElementCount || !pools.length) return;
  if (programId) get("club").value = get("heading").textContent;
  preparePrint();
});
window.addEventListener("afterprint", () => get("printout").replaceChildren());

if (programId) playerPage();
else setupPage();
