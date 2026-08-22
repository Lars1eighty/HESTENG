import { NextRequest, NextResponse } from "next/server";
import {
  deleteSharedTrainingResult,
  mergeSharedTrainingResults,
  readSharedTrainingResults,
  upsertSharedTrainingResult,
} from "@/lib/serverTrainingResultStore";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const state = await readSharedTrainingResults();
  const playerId = request.nextUrl.searchParams.get("playerId");

  if (!playerId) return NextResponse.json(state);

  return NextResponse.json({
    ...state,
    results: state.results.filter((result) => result.playerId === playerId),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body?.type === "result") {
    const state = await upsertSharedTrainingResult(body.result);
    return NextResponse.json(state);
  }

  const state = await mergeSharedTrainingResults(Array.isArray(body?.results) ? body.results : []);
  return NextResponse.json(state);
}

export async function DELETE(request: NextRequest) {
  const resultId = request.nextUrl.searchParams.get("resultId");
  if (!resultId) {
    return NextResponse.json({ error: "Missing resultId" }, { status: 400 });
  }

  const state = await deleteSharedTrainingResult(resultId);
  return NextResponse.json(state);
}
