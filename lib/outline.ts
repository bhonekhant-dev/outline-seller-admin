import "server-only";
import crypto from "crypto";
import { Agent } from "undici";

function getOutlineConfig() {
  const apiUrl = process.env.OUTLINE_API_URL;
  const certSha256 = process.env.OUTLINE_CERT_SHA256;
  if (!apiUrl) throw new Error("OUTLINE_API_URL is not set");
  if (!certSha256) throw new Error("OUTLINE_CERT_SHA256 is not set");
  return { apiUrl, certSha256 };
}

function normalizeFingerprint(input: string) {
  return input.replace(/:/g, "").toUpperCase();
}

let cachedAgent: Agent | null = null;

function getAgent(certSha256: string) {
  if (cachedAgent) return cachedAgent;
  const expected = normalizeFingerprint(certSha256);
  cachedAgent = new Agent({
    connect: {
      rejectUnauthorized: false,
      checkServerIdentity: (_host, cert) => {
        if (!cert.raw) return new Error("Outline certificate missing");
        const actual = crypto
          .createHash("sha256")
          .update(cert.raw)
          .digest("hex")
          .toUpperCase();
        if (actual !== expected) {
          return new Error("Outline certificate fingerprint mismatch");
        }
        return undefined;
      },
    },
  });
  return cachedAgent;
}

export async function outlineFetch(path: string, init?: RequestInit) {
  const { apiUrl, certSha256 } = getOutlineConfig();
  const dispatcher = getAgent(certSha256);

  // --- FIX 1: Manual URL Joining ---
  // This prevents the URL constructor from stripping your secret token
  const cleanBase = apiUrl.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const fullUrl = `${cleanBase}/${cleanPath}`;

  // --- FIX 2: Smart Header Handling ---
  const headers = new Headers(init?.headers);
  
  // Only auto-set JSON if we aren't sending FormData (which needs its own boundary)
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(fullUrl, {
    ...init,
    dispatcher,
    headers,
  } as RequestInit & { dispatcher: Agent });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Outline API error ${res.status}: ${text || res.statusText}`
    );
  }
  
  return res;
}