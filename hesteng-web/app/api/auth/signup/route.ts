import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { generateAuthToken, tokenHash } from "@/lib/authTokenUtils";
import { sendVerificationEmail } from "@/lib/authMail";
import { hashPassword } from "@/lib/passwordUtils";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VERIFICATION_TOKEN_TTL_MINUTES = 60;
const NEUTRAL_SIGNUP_MESSAGE = "Hvis e-mailadressen kan bruges, sender vi en bekræftelsesmail.";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const acceptTerms = body.acceptTerms === true;

  if (!name) {
    return NextResponse.json({ error: "Navn skal udfyldes." }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Indtast en gyldig e-mailadresse." }, { status: 400 });
  }

  if (password.length < 10) {
    return NextResponse.json({ error: "Adgangskoden skal være mindst 10 tegn." }, { status: 400 });
  }

  if (!acceptTerms) {
    return NextResponse.json({ error: "Du skal acceptere Vilkår og Privatlivspolitik." }, { status: 400 });
  }

  const prisma = getPrisma();
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      passwordHash: true,
      emailVerified: true,
    },
  });

  if (existingUser) {
    if (existingUser.passwordHash && !existingUser.emailVerified) {
      const rawToken = generateAuthToken();
      const hashedToken = tokenHash(rawToken);
      const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MINUTES * 60 * 1000);

      await prisma.$transaction(async (tx) => {
        await tx.emailVerificationToken.updateMany({
          where: {
            userId: existingUser.id,
            email,
            usedAt: null,
          },
          data: {
            usedAt: new Date(),
          },
        });

        await tx.emailVerificationToken.create({
          data: {
            userId: existingUser.id,
            email,
            tokenHash: hashedToken,
            expiresAt,
            usedAt: null,
          },
        });
      });

      await sendVerificationEmail({ to: email, token: rawToken, name: existingUser.name ?? name });
    }

    return NextResponse.json({
      message: NEUTRAL_SIGNUP_MESSAGE,
    });
  }

  const rawToken = generateAuthToken();
  const hashedToken = tokenHash(rawToken);
  const passwordHash = await hashPassword(password);
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MINUTES * 60 * 1000);

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          emailVerified: null,
        },
      });

      await tx.playerProfile.create({
        data: {
          id: `auth:${user.id}`,
          userId: user.id,
          displayName: name,
        },
      });

      await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          email,
          tokenHash: hashedToken,
          expiresAt,
          usedAt: null,
        },
      });
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({
        message: NEUTRAL_SIGNUP_MESSAGE,
      });
    }

    throw error;
  }

  await sendVerificationEmail({ to: email, token: rawToken, name });

  return NextResponse.json({
    message: NEUTRAL_SIGNUP_MESSAGE,
  });
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
