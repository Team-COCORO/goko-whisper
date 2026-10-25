import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Env } from "./env";

const googleKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

const MAX_TOKEN_CHARS = 8192;

export async function verifyGoogleAdmin(token: string, env: Env): Promise<boolean> {
  const clientId = env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const allowed = env.ADMIN_ALLOWED_EMAIL?.trim().toLowerCase() ?? "";
  if (!clientId || !allowed || !token || token.length > MAX_TOKEN_CHARS) return false;

  try {
    const { payload } = await jwtVerify(token, googleKeys, {
      algorithms: ["RS256"],
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: clientId,
      clockTolerance: 5,
    });
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    return payload.email_verified === true && email === allowed;
  } catch {
    return false;
  }
}

export function googleAdminConfigured(env: Env): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID?.trim() && env.ADMIN_ALLOWED_EMAIL?.trim());
}
