import { Pool } from "@/context/KlubaftenContext";
import { DEFAULT_ELO, getEloRatings } from "@/lib/eloRatingEngine";
import { getPlayerRegistry } from "@/lib/playerRegistry";
import { normalizeName } from "@/lib/playerIdentity";

const POOL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export type PoolMode = "draw" | "elo";

type SeededPoolPlayer = {
  id: string;
  name: string;
  elo: number;
};

function getPoolSizes(playerCount: number) {
  const poolCount = Math.max(2, Math.ceil(playerCount / 6));
  const basePoolSize = Math.floor(playerCount / poolCount);
  const poolsWithExtraPlayer = playerCount % poolCount;

  return Array.from(
    { length: poolCount },
    (_, index) => basePoolSize + (index < poolsWithExtraPlayer ? 1 : 0)
  );
}

function createPoolsFromPlayers(players: string[]): Pool[] {
  const poolSizes = getPoolSizes(players.length);
  const pools: Pool[] = poolSizes.map((_, index) => ({
    name: `Pulje ${POOL_LETTERS[index]}`,
    players: [],
  }));

  let startIndex = 0;
  poolSizes.forEach((poolSize, poolIndex) => {
    pools[poolIndex].players = players.slice(startIndex, startIndex + poolSize);
    startIndex += poolSize;
  });

  return pools;
}

function shufflePlayers(players: string[]) {
  const shuffled = [...players];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

/**
 * Creates pools for a club night.
 * draw: random draw, matching a traditional paper draw.
 * elo: level-divided pools by current club ELO, strongest pool first.
 */
export function createClubNightPools(
  players: string[],
  clubId?: string,
  mode: PoolMode = "elo"
): Pool[] {
  const uniquePlayers = [...new Set(players)];

  if (uniquePlayers.length < 10) {
    throw new Error("Der skal være mindst 10 spillere for at oprette puljer");
  }

  if (mode === "draw") {
    return createPoolsFromPlayers(shufflePlayers(uniquePlayers));
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

  return createPoolsFromPlayers(sortedPlayers.map((player) => player.name));
}

export const createThursdayPools = createClubNightPools;
