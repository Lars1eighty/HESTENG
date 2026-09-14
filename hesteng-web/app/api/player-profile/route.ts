import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const profile = await getPrisma().playerProfile.findUnique({
    where: { userId },
    include: { user: { select: { image: true } } },
  });

  if (!profile) return NextResponse.json({ error: "Player profile not found" }, { status: 404 });
  return NextResponse.json({ profile: responseProfile(profile) });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const displayName = cleanText(body.displayName, 80);
  const username = cleanUsername(body.username);
  const city = cleanOptionalText(body.city, 80);
  const country = cleanOptionalText(body.country, 80);
  const bio = cleanOptionalText(body.bio, 500);
  const birthDate = parseOptionalBirthDate(body.birthDate);

  if (!displayName) return NextResponse.json({ error: "Navn skal udfyldes." }, { status: 400 });
  if (username === "invalid") return NextResponse.json({ error: "Brugernavn skal være 3-24 tegn og må kun indeholde bogstaver, tal, punktum, bindestreg og underscore." }, { status: 400 });
  if (birthDate === "invalid") return NextResponse.json({ error: "Fødselsdato er ugyldig." }, { status: 400 });

  const prisma = getPrisma();
  try {
    const profile = await prisma.playerProfile.update({
      where: { userId },
      data: { displayName, username, birthDate, city, country, bio },
      include: { user: { select: { image: true } } },
    });
    return NextResponse.json({ profile: responseProfile(profile) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Brugernavnet er allerede taget." }, { status: 409 });
    }
    throw error;
  }
}

function responseProfile(profile: { id: string; displayName: string; username: string | null; birthDate: Date | null; city: string | null; country: string | null; bio: string | null; user: { image: string | null } }) {
  return {
    id: profile.id,
    displayName: profile.displayName,
    username: profile.username,
    birthDate: profile.birthDate?.toISOString().slice(0, 10) ?? null,
    city: profile.city,
    country: profile.country,
    bio: profile.bio,
    image: profile.user.image,
  };
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function cleanUsername(value: unknown): string | null | "invalid" {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return "invalid";
  const username = value.trim().toLowerCase();
  return /^[a-z0-9._-]{3,24}$/.test(username) ? username : "invalid";
}

function cleanOptionalText(value: unknown, maxLength: number) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return null;
  const cleaned = value.trim().slice(0, maxLength);
  return cleaned || null;
}

function parseOptionalBirthDate(value: unknown): Date | null | "invalid" {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "invalid";
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return "invalid";
  const now = new Date();
  if (date > now || date.getUTCFullYear() < 1900) return "invalid";
  return date;
}
