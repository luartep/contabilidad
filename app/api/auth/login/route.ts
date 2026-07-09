import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  verifyCredentials,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!verifyCredentials(username, password)) {
    return NextResponse.json({ error: "Usuario o clave incorrectos" }, { status: 401 });
  }

  const token = await createSessionToken(username);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  return res;
}
