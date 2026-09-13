import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { getTrainingExercise } from "@/data/trainingExercises";

export const runtime = "nodejs";

type RankingRow = { playerId: string; playerName: string; value: number; completedAt: Date };

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.playerProfileId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const exerciseId = request.nextUrl.searchParams.get("exerciseId")?.trim();
  if (!exerciseId || !getTrainingExercise(exerciseId)) return NextResponse.json({ error: "Unknown exercise" }, { status: 400 });

  const scope = request.nextUrl.searchParams.get("scope") === "club" ? "club" : "global";
  const membership = session.user.memberships?.[0];
  if (scope === "club" && !membership?.clubId) return NextResponse.json({ exerciseId, scope, rows: [] });

  const prisma = getPrisma();
  const results = await prisma.trainingResult.findMany({
    where: { exerciseId, ...(scope === "club" ? { clubId: membership!.clubId } : {}) },
    select: { playerId: true, completedAt: true, metrics: true, player: { select: { displayName: true } } },
    orderBy: { completedAt: "desc" },
  });

  const exercise = getTrainingExercise(exerciseId)!;
  const scoreMetric = exercise.metrics.find((metric) => metric.key === "score") ?? exercise.metrics.find((metric) => metric.personalBest);
  const direction = scoreMetric?.personalBest === "lowerIsBetter" ? "lower" : "higher";
  const best = new Map<string, RankingRow>();

  for (const result of results) {
    const metrics = result.metrics as Record<string, unknown>;
    const raw = metrics.score ?? (scoreMetric ? metrics[scoreMetric.key] : undefined);
    if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
    const current = best.get(result.playerId);
    if (!current || (direction === "higher" ? raw > current.value : raw < current.value)) {
      best.set(result.playerId, { playerId: result.playerId, playerName: result.player.displayName, value: raw, completedAt: result.completedAt });
    }
  }

  const rows = [...best.values()]
    .sort((a, b) => direction === "higher" ? b.value - a.value : a.value - b.value)
    .slice(0, 100)
    .map((row, index) => ({ place: index + 1, playerName: row.playerName, value: row.value, isCurrentPlayer: row.playerId === session.user.playerProfileId }));

  return NextResponse.json({ exerciseId, exerciseName: exercise.name, scope, valueLabel: scoreMetric?.label ?? "Score", direction, rows });
}
