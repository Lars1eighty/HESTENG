

type SeedZone = {
  pools: string[];
  players: string[];
};

export function createSeedZones(
  players: string[],
  poolSizes: number[]
): SeedZone[] {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const free = [...poolSizes];

  // Top 3 låses i A
  const zones: SeedZone[] = [
    {
      pools: ["A"],
      players: players.slice(0, 3),
    },
  ];

  free[0] -= 3;

  let start = 3;

  for (let i = 0; i < free.length; i++) {
    let size = free[i];

    if (i < free.length - 1) {
      size += Math.min(4, free[i + 1]);
    }

    const end = Math.min(start + size, players.length);

    zones.push({
      pools:
        i < free.length - 1
          ? [letters[i], letters[i + 1]]
          : [letters[i]],
      players: players.slice(start, end),
    });

    start = end;
  }

  return zones;
}
