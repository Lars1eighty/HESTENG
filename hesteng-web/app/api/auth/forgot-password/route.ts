import { NextRequest, NextResponse } from "next/server";

import { generateAuthToken, tokenHash } from "@/lib/authTokenUtils";
import { sendPasswordResetEmail } from "@/lib/authMail";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

const PASSWORD_RESET_TOKEN_TTL_MINUTES = 60;
const NEUTRAL_FORGOT_PASSWORD_MESSAGE =
  "Hvis der findes en konto med denne e-mailadresse, sender vi et link til at nulstille adgangskoden.";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Indtast en gyldig e-mailadresse." }, { status: 400 });
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
    },
  });

  if (!user?.passwordHash || !user.email) {
    return NextResponse.json({ message: NEUTRAL_FORGOT_PASSWORD_MESSAGE });
  }

  const rawToken = generateAuthToken();
  const hashedToken = tokenHash(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  const resetToken = await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    return tx.passwordResetToken.create({
      data: {
        userId: user.id,
        email,
        tokenHash: hashedToken,
        expiresAt,
        usedAt: null,
      },
      select: {
        id: true,
      },
    });
  });

  try {
    await sendPasswordResetEmail({ to: user.email, token: rawToken, name: user.name });
  } catch {
    await prisma.passwordResetToken.updateMany({
      where: {
        id: resetToken.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });
  }

  return NextResponse.json({ message: NEUTRAL_FORGOT_PASSWORD_MESSAGE });
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
