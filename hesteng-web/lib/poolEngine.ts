import { POOL_SIZES } from "./poolSizes";
import { shuffle } from "./shuffle";



export function createPools(players: string[]): Pool[] {
  const total = players.length;
  const sizes = POOL_SIZES[total];

  if (!sizes) {
    throw new Error(`Ingen model for ${total} spillere`);
  }

  // =====================================
  // TOPAFDELING
  // =====================================

  const top12 = players.slice(0, 12);

  const poolA = top12.slice(0, 3);

  let restTop = shuffle([...top12.slice(3)]);

  while (poolA.length < sizes[0]) {
    const player = restTop.shift();

    if (!player) break;

    poolA.push(player);
  }

  const poolB = [...restTop];

  shuffle(poolA);
  shuffle(poolB);

  // =====================================
  // KLUBAFDELING
  // =====================================

  const g1 = shuffle([...players.slice(12, 15)]);
  const g2 = shuffle([...players.slice(15, 20)]);
  const g3 = shuffle([...players.slice(20)]);

  const clubPools: string[][] = [];

  for (let i = 2; i < sizes.length; i++) {
    clubPools.push([]);
  }

  let idx = 0;

  g1.forEach((player) => {
    clubPools[idx].push(player);

    idx++;

    if (idx >= clubPools.length) {
      idx = 0;
    }
  });

  idx = 0;

  g2.forEach((player) => {
    clubPools[idx].push(player);

    idx++;

    if (idx >= clubPools.length) {
      idx = 0;
    }
  });

  g3.forEach((player) => {
    let placed = false;

    while (!placed) {
      if (clubPools[idx].length < sizes[idx + 2]) {
        clubPools[idx].push(player);
        placed = true;
      }

      idx++;

      if (idx >= clubPools.length) {
        idx = 0;
      }
    }
  });

  clubPools.forEach((pool) => shuffle(pool));

  // =====================================
  // OPRET PULJER
  // =====================================

  const pools: Pool[] = [
    {
      name: "Pulje A",
      players: poolA,
    },
    {
      name: "Pulje B",
      players: poolB,
    },
  ];

  const letters = ["C", "D", "E", "F"];

  clubPools.forEach((pool, i) => {
    pools.push({
      name: `Pulje ${letters[i]}`,
      players: pool,
    });
  });

  return pools;
}