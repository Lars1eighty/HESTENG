import { Pool } from "@/context/KlubaftenContext";
import { DEFAULT_ELO, getEloRatings } from "@/lib/eloRatingEngine";
import { getPlayerRegistry } from "@/lib/playerRegistry";
import { normalizeName } from "@/lib/playerIdentity";

const POOL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

type SeededPoolPlayer = {
  id: string;
  name: string;
  elo: number;
};

/**
 * Creates balanced pools for a club night.
 * The MVP keeps pools at roughly 5-6 players where possible.
 * Pools are level-divided by current club ELO: A is strongest, then B, C, etc.
 */
export function createClubNightPools(players: string[], clubId?: string): Pool[] {
  const uniquePlayers = [...new Set(players)];

  if (uniquePlayers.length < 10) {
    throw new Error("Der skal være mindst 10 spillere for at oprette puljer");
  }

  const registry = getPlayerRegistry(clubId);
  const registryByName = new Map(registry.map((player) => [normalizeName(player.name), player]));
  const ratings = getEloRatings(clubId);
  const seededPlayers: SeededPoolPlayer[] = uniquePlayers.map((name) => {
    const profile = registryByName.get(normalizeName(name));
    const playerName = profile?.name ?? name;
    const rating = ratings.find((item) => (
      (profile?.id && item.playerId === profile.id) ||
      normalizeName(item.player) === normalizeName(playerName)
    ));

    return {
      id: profile?.id ?? normalizeName(name),
      name: playerName,
      elo: rating?.elo ?? DEFAULT_ELO,
    };
  });
  const sortedPlayers = seededPlayers.sort((a, b) => (
    b.elo - a.elo ||
    a.id.localeCompare(b.id) ||
    a.name.localeCompare(b.name)
  ));
  const poolCount = Math.max(2, Math.ceil(uniquePlayers.length / 6));
  const basePoolSize = Math.floor(sortedPlayers.length / poolCount);
  const poolsWithExtraPlayer = sortedPlayers.length % poolCount;
  const poolSizes = Array.from({ length: poolCount }, (_, index) => basePoolSize + (index < poolsWithExtraPlayer ? 1 : 0));
  const pools: Pool[] = Array.from({ length: poolCount }, (_, index) => ({
    name: `Pulje ${POOL_LETTERS[index]}`,
    players: [],
  }));

  let startIndex = 0;
  poolSizes.forEach((poolSize, poolIndex) => {
    const poolPlayers = sortedPlayers.slice(startIndex, startIndex + poolSize);
    pools[poolIndex].players = poolPlayers.map((player) => player.name);
    startIndex += poolSize;
  });

  return pools;
}

export const createThursdayPools = createClubNightPools;
