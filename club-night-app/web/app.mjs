import {
  cleanRoster, drawPools, examplePlayers, mergeNames, namesFromPlan, playerKey, readNames,
  schedulePool, validatePlan,
} from "./engine.mjs";

const get = id => document.getElementById(id);
const notice = text => { get("notice").textContent = text; };
const programId = location.pathname.split("/")[2];
const testStorageKey = "hesteng-klubaften-test";
const rosterStorageKey = "hesteng-klubaften-spillere";
let pools = [];
let shareId = "";
let drawnRoster = "";
let saving = false;
let adding = false;
let clubPlayers = [];
const attendance = new Set();
let localTest = false;
let testPlan = null;
let testIsStored = false;
let shownPlan = null;

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

function selectedPlayers() {
  return clubPlayers.filter(name => attendance.has(playerKey(name)));
}

function selectionKey() {
  return selectedPlayers().map(playerKey).sort().join("\n");
}

function updateAttendanceCount() {
  const count = selectedPlayers().length;
  get("attendanceCount").textContent = clubPlayers.length ?
    count + " valgt af " + clubPlayers.length : "Tilføj navne, så du kan vælge fremmødte.";
  get("clearAttendance").hidden = !clubPlayers.length;
  get("clearAttendance").disabled = count === 0;
}

function renderAttendance() {
  const entries = clubPlayers.map(name => {
    const key = playerKey(name);
    const label = element("label");
    const checkbox = element("input");
    checkbox.type = "checkbox";
    checkbox.checked = attendance.has(key);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) attendance.add(key);
      else attendance.delete(key);
      updateAttendanceCount();
    });
    label.append(checkbox, element("span", name));
    return label;
  });
  get("attendanceList").replaceChildren(...entries);
  updateAttendanceCount();
}

function storedNames() {
  try {
    const names = JSON.parse(localStorage.getItem(rosterStorageKey) || "[]");
    return Array.isArray(names) ? names.filter(name => typeof name === "string") : [];
  } catch {
    return [];
  }
}

function storeLocalNames(names) {
  clubPlayers = mergeNames(storedNames(), clubPlayers, names);
  try {
    localStorage.setItem(rosterStorageKey, JSON.stringify(clubPlayers));
    return true;
  } catch {
    return false;
  }
}

async function addNames() {
  if (adding) return false;
  const field = get("roster");
  const input = field.value;
  try {
    const names = mergeNames(readNames(input));
    if (!names.length) throw new Error("Indtast eller indsæt mindst ét navn.");
    adding = true;
    get("addNames").disabled = true;
    let stored = true;
    if (localTest) {
      stored = storeLocalNames(names);
    } else {
      const response = await fetch("/api/roster", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(names),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      clubPlayers = result.players;
    }
    for (const name of names) attendance.add(playerKey(name));
    if (field.value === input) field.value = "";
    renderAttendance();
    notice(stored ? "Navnene er gemt på spillerlisten." : "Navnene kan bruges, mens siden er åben.");
    return true;
  } catch (error) {
    notice(error.message || "Kunne ikke gemme navnene.");
    return false;
  } finally {
    adding = false;
    get("addNames").disabled = false;
  }
}

function preparePrint(onlyPool, plan = currentPlan()) {
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
  renderTestSaved();
}

function renderTestSaved() {
  get("testSaved").hidden = !testPlan;
  if (testPlan) {
    get("testSavedNote").textContent = testIsStored ?
      "Testprogrammet er gemt på denne enhed." : "Testprogrammet kan prøves, mens siden er åben.";
  }
}

function restoreEditor(plan) {
  pools = plan.pools.map(pool => ({ ...pool }));
  get("club").value = plan.club;
  const roster = namesFromPlan(plan);
  clubPlayers = mergeNames(clubPlayers, roster);
  for (const name of roster) attendance.add(playerKey(name));
  drawnRoster = selectionKey();
}

function saveTestProgram(plan) {
  storeLocalNames(namesFromPlan(plan));
  testPlan = plan;
  try {
    localStorage.setItem(testStorageKey, JSON.stringify(plan));
    testIsStored = true;
  } catch {
    testIsStored = false;
  }
  renderTestSaved();
  notice("");
  get("openTestProgram").focus();
}

function draw(demo = false) {
  try {
    if (!get("club").value.trim()) throw new Error("Indtast klubbens navn.");
    const players = demo ? examplePlayers : cleanRoster(selectedPlayers().join("\n"));
    pools = drawPools(players);
    drawnRoster = selectionKey();
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
    if (selectionKey() !== drawnRoster || get("roster").value.trim()) {
      throw new Error("Fremmødet er ændret. Lav puljer igen før du gemmer.");
    }
    const plan = currentPlan();
    if (localTest) {
      saveTestProgram(plan);
      return;
    }
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
      localTest = true;
      get("signIn").hidden = false;
      clubPlayers = storedNames();
      try {
        const stored = localStorage.getItem(testStorageKey);
        if (stored) {
          testPlan = validatePlan(JSON.parse(stored));
          testIsStored = true;
          restoreEditor(testPlan);
        }
      } catch {
        // An unavailable or invalid local draft should not block testing.
      }
    } else {
      if (!response.ok) throw new Error();
      const saved = await response.json();
      if (saved) {
        shareId = saved.shareId;
        restoreEditor(saved.plan);
      }
      const roster = await fetch("/api/roster");
      if (!roster.ok) throw new Error("Spillerlisten kunne ikke hentes.");
      clubPlayers = mergeNames((await roster.json()).players, clubPlayers);
    }
    notice(localTest ? "Privat test. Du kan lave puljer og prøve udskrift og spillervisning her." : "");
  } catch {
    notice("Det gemte program kunne ikke hentes. Du kan stadig prøve at lave puljer.");
  }
  get("editor").hidden = false;
  get("nameEntry").open = clubPlayers.length === 0;
  renderAttendance();
  renderSetup();
}

function showPlayerProgram(plan, preview = false) {
  shownPlan = plan;
  get("heading").textContent = plan.club;
  get("heroMeta").textContent = preview ? "Test af spillervisning" : "Klubaften";
  const names = plan.pools.flatMap(pool => pool.players).sort((a, b) => a.localeCompare(b, "da"));
  get("playerName").replaceChildren(new Option("Vælg dit navn", ""),
    ...names.map(player => new Option(player, player)));
  get("personalRounds").replaceChildren();
  get("playerPools").replaceChildren(...plan.pools.map(pool => poolCard(pool, false, false)));
  setView(true);
  get("backToEditor").hidden = !preview;
  get("editor").hidden = true;
  get("signIn").hidden = true;
  get("player").hidden = false;
  notice("");
}

async function playerPage() {
  notice("Henter kampprogrammet…");
  try {
    const response = await fetch("/api/program/" + encodeURIComponent(programId));
    if (!response.ok) throw new Error();
    showPlayerProgram(await response.json());
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

get("drawForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (get("roster").value.trim() && !(await addNames())) return;
  draw();
});
get("addNames").addEventListener("click", addNames);
get("clearAttendance").addEventListener("click", () => {
  attendance.clear();
  renderAttendance();
});
get("demo").addEventListener("click", () => {
  get("club").value ||= "Eksempel Dartklub";
  draw(true);
});
get("printAll").addEventListener("click", () => printProgram());
get("publish").addEventListener("click", publish);
get("openTestProgram").addEventListener("click", () => {
  if (!testPlan) return;
  showPlayerProgram(testPlan, true);
  get("backToEditor").focus();
});
get("backToEditor").addEventListener("click", () => {
  get("player").hidden = true;
  get("editor").hidden = false;
  get("signIn").hidden = false;
  get("heading").textContent = "Klubaften";
  get("heroMeta").textContent = "Puljer og kampprogram";
  get("openTestProgram").focus();
});
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
  const pool = shownPlan?.pools.find(item => item.players.includes(player));
  get("personalRounds").replaceChildren(...(pool ?
    [element("h2", "Pulje " + pool.id), roundsList(pool, player)] : []));
});
window.addEventListener("beforeprint", () => {
  if (get("printout").childElementCount) return;
  if (!get("player").hidden && shownPlan) preparePrint(undefined, shownPlan);
  else if (pools.length && get("club").value.trim()) preparePrint();
});
window.addEventListener("afterprint", () => get("printout").replaceChildren());

if (programId) playerPage();
else setupPage();
