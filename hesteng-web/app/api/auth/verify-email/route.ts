import { NextRequest, NextResponse } from "next/server";

import { tokenHash } from "@/lib/authTokenUtils";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const rawToken = typeof body.token === "string" ? body.token : "";

  if (!rawToken) {
    return NextResponse.json({ error: "Bekræftelseslinket er ugyldigt eller udløbet." }, { status: 400 });
  }

  const prisma = getPrisma();
  const hashedToken = tokenHash(rawToken);
  const now = new Date();
  const verificationToken = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashedToken },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          emailVerified: true,
        },
      },
    },
  });

  if (
    verificationToken?.usedAt &&
    verificationToken.user.email?.toLowerCase() === verificationToken.email.toLowerCase() &&
    verificationToken.user.emailVerified
  ) {
    return NextResponse.json({ message: "Din e-mail er bekræftet." });
  }

  if (
    !verificationToken ||
    verificationToken.usedAt ||
    verificationToken.expiresAt <= now ||
    verificationToken.user.email?.toLowerCase() !== verificationToken.email.toLowerCase()
  ) {
    return NextResponse.json({ error: "Bekræftelseslinket er ugyldigt eller udløbet." }, { status: 400 });
  }

  const claimResult = await prisma.$transaction(async (tx) => {
    const claim = await tx.emailVerificationToken.updateMany({
      where: {
        id: verificationToken.id,
        tokenHash: hashedToken,
        usedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      data: {
        usedAt: now,
      },
    });

    if (claim.count !== 1) {
      return false;
    }

    await tx.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: now },
    });

    return true;
  });

  if (!claimResult) {
    return NextResponse.json({ error: "Bekræftelseslinket er ugyldigt eller udløbet." }, { status: 400 });
  }

  return NextResponse.json({ message: "Din e-mail er bekræftet." });
}
