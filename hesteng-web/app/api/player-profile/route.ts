import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const profile = await getPrisma().playerProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          image: true,
        },
      },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Player profile not found" }, { status: 404 });
  }

  return NextResponse.json({
    profile: {
      id: profile.id,
      displayName: profile.displayName,
      birthDate: profile.birthDate?.toISOString().slice(0, 10) ?? null,
      city: profile.city,
      country: profile.country,
      bio: profile.bio,
      image: profile.user.image,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;

  const displayName = cleanText(body.displayName, 80);
  const city = cleanOptionalText(body.city, 80);
  const country = cleanOptionalText(body.country, 80);
  const bio = cleanOptionalText(body.bio, 500);
  const birthDate = parseOptionalBirthDate(body.birthDate);

  if (!displayName) {
    return NextResponse.json({ error: "Navn skal udfyldes." }, { status: 400 });
  }

  if (birthDate === "invalid") {
    return NextResponse.json({ error: "Fødselsdato er ugyldig." }, { status: 400 });
  }

  const prisma = getPrisma();
  const profile = await prisma.playerProfile.update({
    where: { userId },
    data: {
      displayName,
      birthDate,
      city,
      country,
      bio,
    },
    include: {
      user: {
        select: {
          image: true,
        },
      },
    },
  });

  return NextResponse.json({
    profile: {
      id: profile.id,
      displayName: profile.displayName,
      birthDate: profile.birthDate?.toISOString().slice(0, 10) ?? null,
      city: profile.city,
      country: profile.country,
      bio: profile.bio,
      image: profile.user.image,
    },
  });
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
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
