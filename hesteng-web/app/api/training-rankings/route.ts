import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { getTrainingExercise } from "@/data/trainingExercises";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RankingRow = {
  playerId: string;
  playerName: string;
  value: number;
};

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const currentPlayerId = session?.user?.playerProfileId;

  if (!currentPlayerId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const exerciseId = request.nextUrl.searchParams.get("exerciseId")?.trim();
  const exercise = exerciseId ? getTrainingExercise(exerciseId) : null;

  if (!exerciseId || !exercise) {
    return NextResponse.json({ error: "Unknown exercise" }, { status: 400 });
  }

  const scope = request.nextUrl.searchParams.get("scope") === "club" ? "club" : "global";
  const clubId = session.user?.memberships?.[0]?.clubId;

  if (scope === "club" && !clubId) {
    return NextResponse.json({
      exerciseId,
      exerciseName: exercise.name,
      scope,
      valueLabel: getRankingMetric(exercise)?.label ?? "Score",
      direction: getDirection(exercise),
      rows: [],
    });
  }

  const results = await getPrisma().trainingResult.findMany({
    where: {
      exerciseId,
      ...(scope === "club" && clubId ? { clubId } : {}),
    },
    select: {
      playerId: true,
      metrics: true,
      player: {
        select: {
          displayName: true,
        },
      },
    },
  });

  const rankingMetric = getRankingMetric(exercise);
  const direction = getDirection(exercise);
  const bestByPlayer = new Map<string, RankingRow>();

  for (const result of results) {
    const value = readMetricValue(result.metrics, rankingMetric?.key ?? "score");
    if (value === null) continue;

    const current = bestByPlayer.get(result.playerId);
    const isBetter = !current || (direction === "higher" ? value > current.value : value < current.value);

    if (isBetter) {
      bestByPlayer.set(result.playerId, {
        playerId: result.playerId,
        playerName: result.player.displayName,
        value,
      });
    }
  }

  const rows = [...bestByPlayer.values()]
    .sort((a, b) => (direction === "higher" ? b.value - a.value : a.value - b.value))
    .slice(0, 100)
    .map((row, index) => ({
      place: index + 1,
      playerName: row.playerName,
      value: row.value,
      isCurrentPlayer: row.playerId === currentPlayerId,
    }));

  return NextResponse.json({
    exerciseId,
    exerciseName: exercise.name,
    scope,
    valueLabel: rankingMetric?.label ?? "Score",
    direction,
    rows,
  });
}

function getRankingMetric(exercise: NonNullable<ReturnType<typeof getTrainingExercise>>) {
  return exercise.metrics.find((metric) => metric.key === "score")
    ?? exercise.metrics.find((metric) => metric.personalBest);
}

function getDirection(exercise: NonNullable<ReturnType<typeof getTrainingExercise>>) {
  return getRankingMetric(exercise)?.personalBest === "lowerIsBetter" ? "lower" : "higher";
}

function readMetricValue(metrics: unknown, key: string) {
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) return null;

  const value = (metrics as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
