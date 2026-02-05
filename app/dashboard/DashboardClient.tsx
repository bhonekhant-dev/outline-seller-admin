"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clipboard, Check, RotateCw, Ban, Search, UserPlus, Pencil, Trash2 } from 'lucide-react';
import { formatMyanmarDate, isExpiredInMyanmar } from "@/lib/myanmar-time";
import DevicePolicyManager from "@/app/components/DevicePolicyManager";
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

function statusTone(status: CustomerStatus) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-800";
    case "EXPIRED":
      return "bg-amber-100 text-amber-800";
    case "REVOKED":
      return "bg-rose-100 text-rose-800";
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const isExpired = (customer: Customer) =>
    customer.status === "EXPIRED" ||
    isExpiredInMyanmar(new Date(customer.expiresAt));

  async function loadCustomers() {
    setLoading(true);
    const res = await fetch("/api/customers");
    if (!res.ok) {
      if (res.status === 401) {
        router.push("/login");
        router.refresh();
        return;
      }
      setError("Unable to load customers");
      return;
    }
    const data = await res.json();
    setCustomers(data.customers);
    setLoading(false);
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.phone?.toLowerCase().includes(term) ||
        c.outlineAccessUrl.toLowerCase().includes(term)
    );
  }, [customers, search]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setActionId("create");

    try {
      await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          phone: formPhone || null,
          planDays: formPlan,
        }),
      });

      setFormName("");
      setFormPhone("");
      setFormPlan(30);
      await loadCustomers();
    } finally {
      setActionId(null);
    }
  }

  async function handleCopy(id: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError("Failed to copy key");
    }
  }
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function handleRenew(customer: Customer) {
    const input = window.prompt("Plan days to extend", String(customer.planDays));
    if (input === null) return;
    const planDays = Number(input);
    if (!Number.isFinite(planDays) || planDays <= 0) {
      setError("Plan days must be a positive number");
      return;
    }

    setActionId(customer.id);
    const res = await fetch(`/api/customers/${customer.id}/renew`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planDays }),
    });
    if (!res.ok) setError("Failed to renew customer");
    await loadCustomers();
    setActionId(null);
  }

  async function handleRevoke(id: string) {
    setActionId(id);
    await fetch(`/api/customers/${id}/revoke`, { method: "POST" });
    await loadCustomers();
    setActionId(null);
  }

  async function handleEdit(customer: Customer) {
    const name = window.prompt("Full name", customer.name);
    if (name === null) return;
    const phone = window.prompt("Phone number", customer.phone ?? "");
    if (phone === null) return;

    setActionId(customer.id);
    const res = await fetch(`/api/customers/${customer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        phone: phone.trim() || null,
      }),
    });
    if (!res.ok) setError("Failed to update customer");
    await loadCustomers();
    setActionId(null);
  }

  async function handleDelete(customer: Customer) {
    if (!confirm("Delete this customer? This cannot be undone.")) return;
    setActionId(customer.id);
    const res = await fetch(`/api/customers/${customer.id}`, {
      method: "DELETE",
    });
    if (!res.ok) setError("Failed to delete customer");
    await loadCustomers();
    setActionId(null);
  }

 return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#1A1A1A]">
      <header className="sticky top-0 z-10 border-b border-black/5 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-black/40">Outline Admin</p>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">Dashboard</h1>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-full border border-black/10 px-5 py-2 text-sm font-semibold transition hover:bg-black hover:text-white"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <section className="grid gap-8 lg:grid-cols-12">

          {/* ================= CUSTOMERS SECTION (8 COLS) ================= */}
          <div className="lg:col-span-8 order-2 lg:order-1">
            <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm md:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-bold">Customers</h2>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" size={16} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search customers..."
                    className="w-full rounded-xl border border-black/5 bg-black/5 py-2 pl-10 pr-4 text-sm focus:border-black/20 focus:outline-none"
                  />
                </div>
              </div>

              {error ? (
                <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {error}
                </p>
              ) : null}

              {/* MOBILE LIST VIEW (Visible on small screens) */}
              <div className="mt-6 space-y-4 md:hidden">
                {filtered.map((c) => (
                  <div key={c.id} className="rounded-2xl border border-black/5 bg-[#FAFAFA] p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-base">{c.name}</p>
                        <p className="text-xs text-black/50">{c.phone || "No phone"}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${statusTone(c.status)}`}>
                        {c.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 border-y border-black/5 py-3 text-sm">
                      <div>
                        <p className="text-[10px] uppercase text-black/40">Plan</p>
                        <p className="font-medium">{c.planDays} Days</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-black/40">Expires</p>
                        <p className="font-medium">{formatMyanmarDate(c.expiresAt)}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => handleCopy(c.id, c.outlineAccessUrl)}
                        className={`flex-1 flex justify-center items-center py-2.5 rounded-xl border transition ${copiedId === c.id ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-white border-black/10"}`}
                      >
                        {copiedId === c.id ? <Check size={18} /> : <Clipboard size={18} />}
                      </button>
                      <button
                        onClick={() => handleRenew(c)}
                        className="flex-1 flex justify-center items-center py-2.5 rounded-xl bg-black text-white"
                      >
                        <RotateCw size={18} />
                      </button>
                      <button
                        onClick={() => handleRevoke(c.id)}
                        className="flex-1 flex justify-center items-center py-2.5 rounded-xl border border-rose-200 text-rose-500 bg-white"
                      >
                        <Ban size={18} />
                      </button>
                      <button
                        onClick={() => handleEdit(c)}
                        className="flex-1 flex justify-center items-center py-2.5 rounded-xl border border-black/10 text-black bg-white"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => setSelectedCustomer(c)}
                        className="flex-1 flex justify-center items-center py-2.5 rounded-xl border border-blue-200 text-blue-500 bg-white"
                        title="Manage Device Policy"
                      >
                        🔒
                      </button>
                      {isExpired(c) ? (
                        <button
                          onClick={() => handleDelete(c)}
                          className="flex-1 flex justify-center items-center py-2.5 rounded-xl border border-rose-200 text-rose-500 bg-white"
                        >
                          <Trash2 size={18} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP TABLE VIEW (Hidden on mobile) */}
              <div className="mt-8 hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-black/5 text-left text-[10px] uppercase tracking-[0.2em] text-black/40">
                      <th className="pb-4 font-semibold">Customer</th>
                      <th className="pb-4 font-semibold">Plan</th>
                      <th className="pb-4 font-semibold">Expires</th>
                      <th className="pb-4 font-semibold">Status</th>
                      <th className="pb-4 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {filtered.map((c) => (
                      <tr key={c.id} className="group hover:bg-black/[0.02]">
                        <td className="py-4">
                          <p className="font-semibold text-sm">{c.name}</p>
                          <p className="text-xs text-black/40">{c.phone || "No phone"}</p>
                        </td>
                        <td className="py-4 text-sm">{c.planDays} days</td>
                        <td className="py-4 text-sm">{formatMyanmarDate(c.expiresAt)}</td>
                        <td className="py-4">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusTone(c.status)}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleCopy(c.id, c.outlineAccessUrl)}
                              className={`p-2 rounded-lg border transition ${copiedId === c.id ? "border-emerald-500 text-emerald-600" : "border-black/10 hover:border-black/30"}`}
                            >
                              {copiedId === c.id ? <Check size={14} /> : <Clipboard size={14} />}
                            </button>
                            <button onClick={() => handleRenew(c)} className="p-2 rounded-lg bg-black text-white hover:opacity-80">
                              <RotateCw size={14} />
                            </button>
                            <button onClick={() => handleRevoke(c.id)} className="p-2 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50">
                              <Ban size={14} />
                            </button>
                            <button onClick={() => handleEdit(c)} className="p-2 rounded-lg border border-black/10 text-black hover:bg-black/5">
                              <Pencil size={14} />
                            </button>
                            {/*<button */}
                            {/*  onClick={() => setSelectedCustomer(c)} */}
                            {/*  className="p-2 rounded-lg border border-blue-200 text-blue-500 hover:bg-blue-50"*/}
                            {/*  title="Manage Device Policy"*/}
                            {/*>*/}
                            {/*  🔒*/}
                            {/*</button>*/}
                            {isExpired(c) ? (
                              <button onClick={() => handleDelete(c)} className="p-2 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50">
                                <Trash2 size={14} />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ================= ADD USER FORM (4 COLS) ================= */}
          <div className="lg:col-span-4 order-1 lg:order-2">
            <form onSubmit={handleCreate} className="sticky top-24 rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white">
                  <UserPlus size={16} />
                </div>
                <h2 className="text-lg font-bold">Add user</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-black/40 mb-1 block">Full Name</label>
                  <input
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Enter customer name"
                    className="w-full rounded-xl border border-black/5 bg-black/5 px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-black/5 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-black/40 mb-1 block">Phone Number</label>
                  <input
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    maxLength={11}
                    placeholder="09 123 456..."
                    className="w-full rounded-xl border border-black/5 bg-black/5 px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-black/5 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-black/40 mb-2 block">Select Plan</label>
                  <div className="grid grid-cols-3 gap-2">
                    {planOptions.map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setFormPlan(days)}
                        className={`rounded-xl py-3 text-xs font-bold transition-all ${
                          formPlan === days
                            ? "bg-black text-white"
                            : "bg-black/5 text-black/60 hover:bg-black/10"
                        }`}
                      >
                        {days}D
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                disabled={actionId === "create"}
                className="mt-8 w-full rounded-xl bg-black py-4 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                {actionId === "create" ? "Processing..." : "Create Access Key"}
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* Device Policy Manager Modal */}
      {/*{selectedCustomer && (*/}
      {/*  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">*/}
      {/*    <div className="mx-4 w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">*/}
      {/*      <div className="mb-4 flex items-center justify-between">*/}
      {/*        <h2 className="text-lg font-bold">Device Policy</h2>*/}
      {/*        <button*/}
      {/*          onClick={() => setSelectedCustomer(null)}*/}
      {/*          className="rounded-full p-2 hover:bg-black/5"*/}
      {/*        >*/}
      {/*          ✕*/}
      {/*        </button>*/}
      {/*      </div>*/}
      {/*      */}
      {/*      <div className="mb-4">*/}
      {/*        <p className="font-semibold">{selectedCustomer.name}</p>*/}
      {/*        <p className="text-sm text-black/60">ID: {selectedCustomer.outlineKeyId}</p>*/}
      {/*      </div>*/}

      {/*      <DevicePolicyManager*/}
      {/*        customer={selectedCustomer}*/}
      {/*        onUpdate={() => {*/}
      {/*          loadCustomers();*/}
      {/*          setSelectedCustomer(null);*/}
      {/*        }}*/}
      {/*      />*/}
      {/*    </div>*/}
      {/*  </div>*/}
      {/*)}*/}
    </div>
  );
}
