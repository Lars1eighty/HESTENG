import { NextRequest, NextResponse } from "next/server";

import { tokenHash } from "@/lib/authTokenUtils";
import { hashPassword } from "@/lib/passwordUtils";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

const RESET_SUCCESS_MESSAGE = "Din adgangskode er ændret. Du kan nu logge ind.";
const RESET_ERROR_MESSAGE = "Linket er ugyldigt eller udløbet. Bed om et nyt nulstillingslink.";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const rawToken = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!rawToken) {
    return NextResponse.json({ error: RESET_ERROR_MESSAGE }, { status: 400 });
  }

  if (password.length < 10) {
    return NextResponse.json({ error: "Adgangskoden skal være mindst 10 tegn." }, { status: 400 });
  }

  const prisma = getPrisma();
  const hashedToken = tokenHash(rawToken);
  const now = new Date();
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashedToken },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          passwordHash: true,
        },
      },
    },
  });

  if (
    !resetToken ||
    resetToken.usedAt ||
    resetToken.expiresAt <= now ||
    !resetToken.user.passwordHash ||
    resetToken.user.email?.toLowerCase() !== resetToken.email.toLowerCase()
  ) {
    return NextResponse.json({ error: RESET_ERROR_MESSAGE }, { status: 400 });
  }

  const newPasswordHash = await hashPassword(password);
  const resetSucceeded = await prisma.$transaction(async (tx) => {
    const claim = await tx.passwordResetToken.updateMany({
      where: {
        id: resetToken.id,
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
      where: { id: resetToken.userId },
      data: { passwordHash: newPasswordHash },
    });

    await tx.passwordResetToken.updateMany({
      where: {
        userId: resetToken.userId,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    });

    return true;
  });

  if (!resetSucceeded) {
    return NextResponse.json({ error: RESET_ERROR_MESSAGE }, { status: 400 });
  }

  return NextResponse.json({ message: RESET_SUCCESS_MESSAGE });
}
