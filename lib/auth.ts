// Autenticación simple usuario/clave para uso personal (un solo usuario: Miguel).
// Usa Web Crypto API para firmar una cookie de sesión — compatible con Edge Runtime.

const COOKIE_NAME = "contapyme_session";
const SESSION_DAYS = 30;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Falta configurar AUTH_SECRET en las variables de entorno.");
  }
  return secret;
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Buffer.from(sig).toString("hex");
}

export async function createSessionToken(username: string): Promise<string> {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${username}.${expires}`;
  const signature = await hmac(payload);
  return `${payload}.${signature}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [username, expires, signature] = parts;
  const payload = `${username}.${expires}`;
  const expectedSignature = await hmac(payload);
  if (signature !== expectedSignature) return false;
  if (Date.now() > Number(expires)) return false;
  return true;
}

export function verifyCredentials(username: string, password: string): boolean {
  const validUser = process.env.APP_USERNAME || "Miguel";
  const validPass = process.env.APP_PASSWORD || "Miguel3682";
  return username === validUser && password === validPass;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
export const SESSION_MAX_AGE_SECONDS = SESSION_DAYS * 24 * 60 * 60;
