import "server-only";

import nodemailer from "nodemailer";

type AuthMailInput = {
  to: string;
  token: string;
  name?: string | null;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required mail environment variable: ${name}`);
  }

  return value;
}

function getAppBaseUrl() {
  return getRequiredEnv("NEXTAUTH_URL");
}

function getSmtpPort() {
  const rawPort = getRequiredEnv("SMTP_PORT");
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("SMTP_PORT must be a positive integer");
  }

  return port;
}

function createSmtpTransport() {
  const port = getSmtpPort();

  return nodemailer.createTransport({
    host: getRequiredEnv("SMTP_HOST"),
    port,
    secure: port === 465,
    auth: {
      user: getRequiredEnv("SMTP_USER"),
      pass: getRequiredEnv("SMTP_PASSWORD"),
    },
  });
}

function buildUrl(pathname: string, token: string) {
  const url = new URL(pathname, getAppBaseUrl());
  url.searchParams.set("token", token);
  return url.toString();
}

function greeting(name?: string | null) {
  return name ? `Hej ${name}` : "Hej";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendVerificationEmail({ to, token, name }: AuthMailInput) {
  const verificationUrl = buildUrl("/bekraeft-email", token);
  const safeGreeting = escapeHtml(greeting(name));
  const safeUrl = escapeHtml(verificationUrl);

  await createSmtpTransport().sendMail({
    from: getRequiredEnv("SMTP_FROM"),
    to,
    subject: "Bekræft din HESTENG e-mail",
    text: `${greeting(name)}

Bekræft din e-mailadresse til HESTENG:
${verificationUrl}

Hvis du ikke har bedt om dette, kan du ignorere mailen.

HESTENG`,
    html: `<p>${safeGreeting}</p>
<p>Bekræft din e-mailadresse til HESTENG:</p>
<p><a href="${safeUrl}">Bekræft e-mail</a></p>
<p>Hvis du ikke har bedt om dette, kan du ignorere mailen.</p>
<p>HESTENG</p>`,
  });
}

export async function sendPasswordResetEmail({ to, token, name }: AuthMailInput) {
  const resetUrl = buildUrl("/nulstil-adgangskode", token);
  const safeGreeting = escapeHtml(greeting(name));
  const safeUrl = escapeHtml(resetUrl);

  await createSmtpTransport().sendMail({
    from: getRequiredEnv("SMTP_FROM"),
    to,
    subject: "Nulstil din HESTENG adgangskode",
    text: `${greeting(name)}

Nulstil din adgangskode til HESTENG:
${resetUrl}

Hvis du ikke har bedt om dette, kan du ignorere mailen.

HESTENG`,
    html: `<p>${safeGreeting}</p>
<p>Nulstil din adgangskode til HESTENG:</p>
<p><a href="${safeUrl}">Nulstil adgangskode</a></p>
<p>Hvis du ikke har bedt om dette, kan du ignorere mailen.</p>
<p>HESTENG</p>`,
  });
}
