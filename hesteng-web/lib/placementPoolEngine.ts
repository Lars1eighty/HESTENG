import type { Pool } from "@/context/KlubaftenContext";
import type { ClubMatch } from "@/lib/matchEngine";
import { calculatePoolStandings } from "@/lib/standingsEngine";

export type PlacementPoolStage = {
  pools: Pool[];
  complete: boolean;
  missingMatches: number;
};

function expectedPoolMatchCount(playerCount: number) {
  return (playerCount * (playerCount - 1)) / 2;
}

export function createPlacementPools(sourcePools: Pool[], matches: ClubMatch[]): PlacementPoolStage {
  let missingMatches = 0;

  const standingsByPool = sourcePools.map((pool) => {
    const finishedIds = new Set(
      matches
        .filter((match) => match.pool === pool.name && match.status === "finished")
        .map((match) => match.id),
    );

    missingMatches += Math.max(0, expectedPoolMatchCount(pool.players.length) - finishedIds.size);
    return calculatePoolStandings(pool.name, pool.players, matches);
  });

  if (missingMatches > 0) {
    return { pools: [], complete: false, missingMatches };
  }

  const maxPlacement = Math.max(0, ...sourcePools.map((pool) => pool.players.length));
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const pools: Pool[] = [];

  for (let placement = 0; placement < maxPlacement; placement += 1) {
    const players = standingsByPool
      .map((standings) => standings[placement]?.player)
      .filter((player): player is string => typeof player === "string" && player.length > 0);

    if (players.length > 0) {
      pools.push({
        name: `Pulje ${letters[placement] ?? placement + 1}`,
        players,
      });
    }
  }

  return { pools, complete: true, missingMatches: 0 };
}
