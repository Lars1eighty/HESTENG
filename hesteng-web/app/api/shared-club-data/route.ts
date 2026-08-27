import { NextRequest, NextResponse } from "next/server";
import {
  mergeSharedClubDataState,
  readSharedClubDataState,
  replaceSharedClubDataState,
} from "@/lib/serverSharedClubDataStore";

export const runtime = "nodejs";

export async function GET() {
  const state = await readSharedClubDataState();
  return NextResponse.json(state);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const state = body?.mode === "replace"
    ? await replaceSharedClubDataState(body)
    : await mergeSharedClubDataState(body);

  return NextResponse.json(state);
}
