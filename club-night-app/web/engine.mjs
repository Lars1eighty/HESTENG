// The two-board order used for a six-player pool in Jyden Legacy.
const sixOnTwo = [
  [[1, 6], [2, 5]], [[3, 4], [1, 5]], [[4, 6], [2, 3]], [[3, 5], [1, 4]],
  [[2, 6], [1, 3]], [[4, 5], [3, 6]], [[1, 2], [5, 6]], [[2, 4]],
];

export function cleanRoster(text) {
  const names = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (names.length < 4 || names.length > 84) throw new Error("Indsæt 4 til 84 spillere.");
  if (names.some(name => name.length > 80)) throw new Error("Brug højst 80 tegn pr. spillernavn.");
  const keys = names.map(name => name.normalize("NFC").toLocaleLowerCase("da"));
  if (new Set(keys).size !== names.length) throw new Error("To spillere har samme navn. Tilføj fx et efternavn.");
  return names;
}

export function drawPools(players, random = Math.random) {
  const roster = [...players];
  for (let i = roster.length - 1; i > 0; i--) {
    const other = Math.floor(random() * (i + 1));
    [roster[i], roster[other]] = [roster[other], roster[i]];
  }
  const count = Math.max(Math.ceil(roster.length / 7), Math.round(roster.length / 6));
  const min = Math.floor(roster.length / count);
  const extra = roster.length % count;
  return Array.from({length: count}, (_, index) => ({
    id: String.fromCharCode(65 + index),
    boards: 2,
    players: roster.splice(0, min + Number(index < extra)),
  }));
}

export function schedulePool(players, boards) {
  if (players.length === 6 && boards === 2) {
    return sixOnTwo.map(round => round.map(([a, b]) => [players[a - 1], players[b - 1]]));
  }
  const slots = [...players];
  if (slots.length % 2) slots.push(null);
  const rounds = [];
  for (let index = 0; index < slots.length - 1; index++) {
    const round = [];
    for (let i = 0; i < slots.length / 2; i++) {
      const a = slots[i];
      const b = slots[slots.length - 1 - i];
      if (a !== null && b !== null) round.push([a, b]);
    }
    rounds.push(round);
    slots.splice(1, 0, slots.pop());
  }
  if (rounds.every(round => round.length <= boards)) return rounds;

  const packed = [];
  for (const game of rounds.flat()) {
    const openRound = packed.find(round =>
      round.length < boards && !round.some(match => match.some(player => game.includes(player)))
    );
    if (openRound) openRound.push(game);
    else packed.push([game]);
  }
  return packed;
}

export function validatePlan(plan) {
  if (!plan || typeof plan.club !== "string" || !plan.club.trim() || plan.club.length > 70 ||
      !Array.isArray(plan.pools) || !plan.pools.length || plan.pools.length > 14) {
    throw new Error("Tilføj et klubnavn, og lav puljer først.");
  }
  const pools = plan.pools.map((pool, index) => {
    const { players, boards } = pool ?? {};
    if (![2, 3].includes(boards) || !Array.isArray(players) || players.length < 4 || players.length > 7 ||
        players.some(player => typeof player !== "string" || /[\r\n]/.test(player))) {
      throw new Error("Hver pulje skal have 4–7 spillere og 2 eller 3 baner.");
    }
    const cleaned = cleanRoster(players.join("\n"));
    if (cleaned.length !== players.length) throw new Error("En pulje har et tomt navn.");
    return {id: String.fromCharCode(65 + index), players: cleaned, boards};
  });
  cleanRoster(pools.flatMap(pool => pool.players).join("\n"));
  return {club: plan.club.trim(), pools};
}
