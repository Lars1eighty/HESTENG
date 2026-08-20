import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const matchId = request.nextUrl.searchParams.get("matchId");
  const recapUrl = url ?? (matchId ? `https://recap.dartconnect.com/matches/${matchId}` : null);

  if (!recapUrl || !/^https:\/\/recap\.dartconnect\.com\/matches\/[a-z0-9]+$/i.test(recapUrl)) {
    return NextResponse.json({ error: "Invalid DartConnect recap URL" }, { status: 400 });
  }

  try {
    const response = await fetch(recapUrl, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({ error: `DartConnect returned ${response.status}` }, { status: response.status });
    }

    return new NextResponse(await response.text(), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not fetch DartConnect recap" }, { status: 502 });
  }
}
