import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const clubId = request.nextUrl.searchParams.get("clubId");

  if (!clubId) {
    return NextResponse.json({ error: "clubId mangler." }, { status: 400 });
  }

  const membership = await getPrisma().clubMembership.findUnique({
    where: {
      userId_clubId: {
        userId,
        clubId,
      },
    },
    include: {
      club: true,
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Ingen adgang til klubben." }, { status: 403 });
  }

  return NextResponse.json({
    club: {
      id: membership.club.id,
      name: membership.club.name,
      slug: membership.club.slug,
      boardCount: membership.club.boardCount,
      handicapBoards: membership.club.handicapBoards,
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const setup = parseBoardSetup(body);

  if (!name) {
    return NextResponse.json({ error: "Klubnavn skal udfyldes." }, { status: 400 });
  }

  if (!setup) {
    return NextResponse.json({ error: "Antal baner og handicapbaner er ugyldige." }, { status: 400 });
  }

  const prisma = getPrisma();
  const baseSlug = slugifyClubName(name);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;

    try {
      const club = await prisma.$transaction(async (tx) => {
        const createdClub = await tx.club.create({
          data: {
            name,
            slug,
            boardCount: setup.boardCount,
            handicapBoards: setup.handicapBoards,
          },
        });

        await tx.clubMembership.create({
          data: {
            userId,
            clubId: createdClub.id,
            role: "ADMIN",
          },
        });

        return createdClub;
      });

      return NextResponse.json({
        club: {
          id: club.id,
          name: club.name,
          slug: club.slug,
          boardCount: club.boardCount,
          handicapBoards: club.handicapBoards,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        continue;
      }

      throw error;
    }
  }

  return NextResponse.json({ error: "Kunne ikke generere en unik klub-adresse." }, { status: 409 });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const clubId = typeof body.clubId === "string" ? body.clubId : "";
  const setup = parseBoardSetup(body);

  if (!clubId || !setup) {
    return NextResponse.json({ error: "Klubopsætningen er ugyldig." }, { status: 400 });
  }

  const prisma = getPrisma();
  const membership = await prisma.clubMembership.findUnique({
    where: {
      userId_clubId: {
        userId,
        clubId,
      },
    },
  });

  if (!membership || membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Kun en klubadministrator kan ændre klubopsætningen." }, { status: 403 });
  }

  const club = await prisma.club.update({
    where: { id: clubId },
    data: {
      boardCount: setup.boardCount,
      handicapBoards: setup.handicapBoards,
    },
  });

  return NextResponse.json({
    club: {
      id: club.id,
      name: club.name,
      slug: club.slug,
      boardCount: club.boardCount,
      handicapBoards: club.handicapBoards,
    },
  });
}

function parseBoardSetup(body: Record<string, unknown>) {
  const boardCount = Number(body.boardCount);
  const handicapBoards = Array.isArray(body.handicapBoards)
    ? [...new Set(body.handicapBoards.map(Number))].sort((a, b) => a - b)
    : [];

  if (!Number.isInteger(boardCount) || boardCount < 1 || boardCount > 50) {
    return null;
  }

  if (handicapBoards.some((board) => !Number.isInteger(board) || board < 1 || board > boardCount)) {
    return null;
  }

  return { boardCount, handicapBoards };
}

function slugifyClubName(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "klub";
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
