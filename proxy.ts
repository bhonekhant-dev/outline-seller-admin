import { NextResponse, type NextRequest } from "next/server";
import {
  sessionCookieName,
  verifySessionTokenEdge,
} from "@/lib/session-edge";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api");

  if (pathname === "/api/auth/login" || pathname === "/api/auth/logout") {
    return NextResponse.next();
  }

  if (pathname === "/api/cron/expire") {
    const cronSecret = process.env.CRON_SECRET;
    const header = req.headers.get("x-cron-secret");
    if (cronSecret && header === cronSecret) {
      return NextResponse.next();
    }
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return isApi
      ? NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
      : NextResponse.redirect(new URL("/login", req.url));
  }

  const token = req.cookies.get(sessionCookieName)?.value;
  const session = await verifySessionTokenEdge(token, secret);
  if (!session) {
    if (isApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
