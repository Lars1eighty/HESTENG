import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  deletePrismaTrainingResult,
  mergePrismaTrainingResultsForPlayer,
  readPrismaTrainingResultsForPlayer,
  upsertPrismaTrainingResult,
} from "@/lib/prismaTrainingResultStore";
import type { TrainingResult } from "@/lib/trainingTypes";

export const runtime = "nodejs";

async function resolveRequestPlayerId(request: NextRequest, body?: unknown) {
  const session = await getServerSession(authOptions);
  const sessionPlayerId = session?.user?.playerProfileId;
  const allowDevPlayerId = process.env.NODE_ENV !== "production";
  const fromQuery = request.nextUrl.searchParams.get("playerId");
  const fromHeader = request.headers.get("x-hesteng-player-id");
  const fromBody = body && typeof body === "object" && "playerId" in body
    ? (body as { playerId?: unknown }).playerId
    : null;
  const requestPlayerId = fromQuery ?? fromHeader ?? fromBody;

  if (sessionPlayerId) {
    if (requestPlayerId && requestPlayerId !== sessionPlayerId) {
      return { error: "Training result playerId does not match current session", status: 403 as const };
    }

    return { playerId: sessionPlayerId };
  }

  if (!allowDevPlayerId) {
    return { error: "Authentication required", status: 401 as const };
  }

  const playerId = typeof requestPlayerId === "string" && requestPlayerId.trim()
    ? requestPlayerId.trim()
    : null;

  return playerId ? { playerId } : { error: "Missing playerId", status: 400 as const };
}

export async function GET(request: NextRequest) {
  const resolved = await resolveRequestPlayerId(request);

  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  return NextResponse.json(await readPrismaTrainingResultsForPlayer(resolved.playerId));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const resolved = await resolveRequestPlayerId(request, body);

  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  if (body?.type === "result") {
    if (body.result?.playerId !== resolved.playerId) {
      return NextResponse.json({ error: "Training result playerId does not match current player" }, { status: 403 });
    }

    return NextResponse.json(await upsertPrismaTrainingResult(body.result));
  }

  const inputResults = Array.isArray(body?.results)
    ? (body.results as TrainingResult[]).filter((result) => result?.playerId === resolved.playerId)
    : [];

  return NextResponse.json(await mergePrismaTrainingResultsForPlayer(resolved.playerId, inputResults));
}

export async function DELETE(request: NextRequest) {
  const resolved = await resolveRequestPlayerId(request);
  const resultId = request.nextUrl.searchParams.get("resultId");
  if (!resultId) {
    return NextResponse.json({ error: "Missing resultId" }, { status: 400 });
  }
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  return NextResponse.json(await deletePrismaTrainingResult(resultId, resolved.playerId));
}
