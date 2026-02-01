import "server-only";
import crypto from "crypto";
import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  createSessionToken,
  getSessionFromCookies,
  setSessionCookie,
} from "@/lib/session";

function getAdminPassword() {
  const value = process.env.ADMIN_PASSWORD;
  if (!value) throw new Error("ADMIN_PASSWORD is not set");
  return value;
}

function getSessionSecret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not set");
  return value;
}

export function verifyAdminPassword(input: string) {
  const expected = getAdminPassword();
  const inputBuf = Buffer.from(input);
  const expectedBuf = Buffer.from(expected);
  if (inputBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(inputBuf, expectedBuf);
}

export function createSessionTokenForLogin() {
  const secret = getSessionSecret();
  return createSessionToken(secret);
}

export async function createSessionForLogin() {
  const secret = getSessionSecret();
  const token = createSessionToken(secret);
  await setSessionCookie(token);
}

export async function logoutSession() {
  await clearSessionCookie();
}

export async function requireSession() {
  const secret = getSessionSecret();
  return getSessionFromCookies(secret);
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
