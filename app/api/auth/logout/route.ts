import { NextResponse } from "next/server";
import { COOKIE_NAME, getClearCookieOptions } from "@/lib/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", getClearCookieOptions());
  return res;
}
