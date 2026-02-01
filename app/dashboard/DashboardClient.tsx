"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CustomerStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  planDays: number;
  createdAt: string;
  expiresAt: string;
  status: CustomerStatus;
  outlineKeyId: string;
  outlineAccessUrl: string;
};

const planOptions = [7, 30, 90];

function formatDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function statusTone(status: CustomerStatus) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-800";
    case "EXPIRED":
      return "bg-amber-100 text-amber-800";
    case "REVOKED":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function DashboardClient() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPlan, setFormPlan] = useState(30);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  async function loadCustomers() {
    setLoading(true);
    const res = await fetch("/api/customers");
    if (!res.ok) {
      if (res.status === 401) {
        router.push("/login");
        router.refresh();
        setLoading(false);
        return;
      }
      setError("Unable to load customers");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { customers: Customer[] };
    setCustomers(data.customers);
    setLoading(false);
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(term) ||
        customer.phone?.toLowerCase().includes(term) ||
        customer.outlineAccessUrl.toLowerCase().includes(term)
      );
    });
  }, [customers, search]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setActionId("create");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          phone: formPhone || null,
          planDays: formPlan,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || "Failed to create customer");
        return;
      }
      setFormName("");
      setFormPhone("");
      setFormPlan(30);
      await loadCustomers();
    } finally {
      setActionId(null);
    }
  }

  async function handleRenew(customerId: string) {
    setError("");
    setActionId(customerId);
    try {
      const res = await fetch(`/api/customers/${customerId}/renew`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || "Failed to renew");
        return;
      }
      await loadCustomers();
    } finally {
      setActionId(null);
    }
  }

  async function handleRevoke(customerId: string) {
    setError("");
    setActionId(customerId);
    try {
      const res = await fetch(`/api/customers/${customerId}/revoke`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || "Failed to revoke");
        return;
      }
      await loadCustomers();
    } finally {
      setActionId(null);
    }
  }

  async function handleCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      setError("Failed to copy key");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="border-b border-ink/10 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-ink/50">
              Outline Admin
            </p>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold text-ink transition hover:border-ink/30"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Customers</h2>
            <p className="text-sm text-ink/60">
              Track access keys, renewals, and expirations.
            </p>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-2 text-sm outline-none transition focus:border-ink/40 focus:ring-2 focus:ring-ink/10"
                placeholder="Search name, phone, or key"
              />
              <div className="text-sm text-ink/50">
                {filtered.length} total
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-ink/50">
                  <tr>
                    <th className="pb-3 pr-3">Customer</th>
                    <th className="pb-3 pr-3">Plan</th>
                    <th className="pb-3 pr-3">Expires</th>
                    <th className="pb-3 pr-3">Status</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="py-4 text-sm text-ink/50" colSpan={5}>
                        Loading customers...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td className="py-4 text-sm text-ink/50" colSpan={5}>
                        No customers found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((customer) => (
                      <tr key={customer.id} className="border-t border-ink/5">
                        <td className="py-4 pr-3 align-top">
                          <div className="font-semibold">{customer.name}</div>
                          <div className="text-xs text-ink/50">
                            {customer.phone || "No phone"}
                          </div>
                          <div className="text-xs text-ink/40">
                            {`${customer.outlineAccessUrl.substring(0, 50)}...`}
                          </div>
                        </td>
                        <td className="py-4 pr-3 align-top">
                          {customer.planDays} days
                        </td>
                        <td className="py-4 pr-3 align-top">
                          {formatDate(customer.expiresAt)}
                        </td>
                        <td className="py-4 pr-3 align-top">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(
                              customer.status
                            )}`}
                          >
                            {customer.status}
                          </span>
                        </td>
                        <td className="py-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() =>
                                handleCopy(customer.outlineAccessUrl)
                              }
                              className="rounded-full border border-ink/15 px-3 py-1 text-xs font-semibold text-ink transition hover:border-ink/30"
                            >
                              Copy key
                            </button>
                            <button
                              onClick={() => handleRenew(customer.id)}
                              disabled={actionId === customer.id}
                              className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-cream transition hover:opacity-90 disabled:opacity-60"
                            >
                              Renew
                            </button>
                            <button
                              onClick={() => handleRevoke(customer.id)}
                              disabled={actionId === customer.id}
                              className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300 disabled:opacity-60"
                            >
                              Revoke
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <form
            onSubmit={handleCreate}
            className="rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold">Create customer</h2>
            <p className="text-sm text-ink/60">
              Issue a new key and start a plan.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wide text-ink/50">
                  Name
                </label>
                <input
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-ink/10 bg-white px-4 py-2 text-sm outline-none transition focus:border-ink/40 focus:ring-2 focus:ring-ink/10"
                  placeholder="Customer name"
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-ink/50">
                  Phone (optional)
                </label>
                <input
                  value={formPhone}
                  onChange={(event) => setFormPhone(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-ink/10 bg-white px-4 py-2 text-sm outline-none transition focus:border-ink/40 focus:ring-2 focus:ring-ink/10"
                  placeholder="+1 555 000 0000"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-ink/50">
                  Plan length
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {planOptions.map((days) => (
                    <button
                      type="button"
                      key={days}
                      onClick={() => setFormPlan(days)}
                      className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                        formPlan === days
                          ? "border-ink bg-ink text-cream"
                          : "border-ink/15 text-ink hover:border-ink/30"
                      }`}
                    >
                      {days} days
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={actionId === "create"}
              className="mt-6 w-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-cream transition hover:opacity-90 disabled:opacity-60"
            >
              {actionId === "create" ? "Creating..." : "Create customer"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
