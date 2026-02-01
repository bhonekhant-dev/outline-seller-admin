import { NextResponse } from "next/server";
import { verifyAdminPassword, createSessionTokenForLogin } from "@/lib/auth";
import { COOKIE_NAME, getSessionCookieOptions } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password = typeof body?.password === "string" ? body.password : "";

  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = createSessionTokenForLogin();

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, getSessionCookieOptions());
  return res;
}
