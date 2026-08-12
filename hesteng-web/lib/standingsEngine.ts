import type { ClubMatch } from "@/lib/matchEngine";

export type PoolStanding = {
  player: string;
  played: number;
  wins: number;
  losses: number;
  points: number;
  legsFor: number;
  legsAgainst: number;
};

export function calculatePoolStandings(poolName: string, players: string[], matches: ClubMatch[]): PoolStanding[] {
  const standings = new Map<string, PoolStanding>();

  players.forEach((player) => {
    standings.set(player, { player, played: 0, wins: 0, losses: 0, points: 0, legsFor: 0, legsAgainst: 0 });
  });

  matches.filter((match) => match.pool === poolName && match.status === "finished").forEach((match) => {
    const p1 = standings.get(match.player1);
    const p2 = standings.get(match.player2);
    if (!p1 || !p2) return;

    p1.played += 1;
    p2.played += 1;
    p1.legsFor += match.score1;
    p1.legsAgainst += match.score2;
    p2.legsFor += match.score2;
    p2.legsAgainst += match.score1;

    if (match.score1 > match.score2) {
      p1.wins += 1;
      p1.points += 2;
      p2.losses += 1;
    } else if (match.score2 > match.score1) {
      p2.wins += 1;
      p2.points += 2;
      p1.losses += 1;
    }
  });

  return [...standings.values()].sort((a, b) =>
    b.points - a.points ||
    (b.legsFor - b.legsAgainst) - (a.legsFor - a.legsAgainst) ||
    b.legsFor - a.legsFor ||
    a.player.localeCompare(b.player)
  );
}
