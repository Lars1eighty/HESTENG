import { Pool } from "@/context/KlubaftenContext";

const POOL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Creates balanced pools for a club night.
 * The MVP keeps pools at roughly 5-6 players where possible.
 */
export function createClubNightPools(players: string[]): Pool[] {
  const uniquePlayers = [...new Set(players)];

  if (uniquePlayers.length < 10) {
    throw new Error("Der skal være mindst 10 spillere for at oprette puljer");
  }

  const poolCount = Math.max(2, Math.ceil(uniquePlayers.length / 6));
  const pools: Pool[] = Array.from({ length: poolCount }, (_, index) => ({
    name: `Pulje ${POOL_LETTERS[index]}`,
    players: [],
  }));

  uniquePlayers.forEach((player, index) => {
    pools[index % poolCount].players.push(player);
  });

  return pools;
}

export const createThursdayPools = createClubNightPools;
