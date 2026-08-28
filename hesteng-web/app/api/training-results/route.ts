import { NextRequest, NextResponse } from "next/server";
import {
  deleteSharedTrainingResult,
  mergeSharedTrainingResultsForPlayer,
  readSharedTrainingResults,
  upsertSharedTrainingResult,
} from "@/lib/serverTrainingResultStore";
import type { TrainingResult } from "@/lib/trainingTypes";

export const runtime = "nodejs";

function resolveRequestPlayerId(request: NextRequest, body?: unknown) {
  const fromQuery = request.nextUrl.searchParams.get("playerId");
  const fromHeader = request.headers.get("x-hesteng-player-id");
  const fromBody = body && typeof body === "object" && "playerId" in body
    ? (body as { playerId?: unknown }).playerId
    : null;
  const playerId = fromQuery ?? fromHeader ?? fromBody;

  return typeof playerId === "string" && playerId.trim() ? playerId.trim() : null;
}

export async function GET(request: NextRequest) {
  const state = await readSharedTrainingResults();
  const playerId = resolveRequestPlayerId(request);

  if (!playerId) {
    return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
  }

  return NextResponse.json({
    ...state,
    results: state.results.filter((result) => result.playerId === playerId),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const playerId = resolveRequestPlayerId(request, body);

  if (!playerId) {
    return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
  }

  if (body?.type === "result") {
    if (body.result?.playerId !== playerId) {
      return NextResponse.json({ error: "Training result playerId does not match current player" }, { status: 403 });
    }

    const state = await upsertSharedTrainingResult(body.result);
    return NextResponse.json({
      ...state,
      results: state.results.filter((result) => result.playerId === playerId),
    });
  }

  const inputResults = Array.isArray(body?.results)
    ? (body.results as TrainingResult[]).filter((result) => result?.playerId === playerId)
    : [];
  const state = await mergeSharedTrainingResultsForPlayer(playerId, inputResults);

  return NextResponse.json({
    ...state,
    results: state.results.filter((result) => result.playerId === playerId),
  });
}

export async function DELETE(request: NextRequest) {
  const playerId = resolveRequestPlayerId(request);
  const resultId = request.nextUrl.searchParams.get("resultId");
  if (!resultId) {
    return NextResponse.json({ error: "Missing resultId" }, { status: 400 });
  }
  if (!playerId) {
    return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
  }

  const state = await deleteSharedTrainingResult(resultId, playerId);
  return NextResponse.json({
    ...state,
    results: state.results.filter((result) => result.playerId === playerId),
  });
}
