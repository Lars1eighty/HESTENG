import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Klubnavn skal udfyldes." }, { status: 400 });
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
