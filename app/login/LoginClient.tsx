"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => searchParams.get("next") || "/dashboard",
    [searchParams]
  );
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || "Login failed");
        return;
      }
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-12">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-[0.35em] text-ink/60">
              Outline Admin
            </p>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Sell keys. Track renewals. Stay in control.
            </h1>
            <p className="max-w-xl text-lg text-ink/70">
              Secure admin console for issuing Outline VPN access keys and
              managing expirations.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="glass-panel space-y-5 rounded-3xl border border-ink/10 bg-white/80 p-8 shadow-xl"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Admin password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base outline-none transition focus:border-ink/40 focus:ring-2 focus:ring-ink/10"
                placeholder="Enter your admin password"
                required
              />
            </div>
            {error ? (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-ink px-4 py-3 text-base font-semibold text-cream transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
