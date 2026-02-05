"use client";

import { useState } from "react";
import { Lock, Unlock, Shield, AlertTriangle } from "lucide-react";

type Customer = {
  id: string;
  name: string;
  outlineKeyId: string;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
};

type DevicePolicyManagerProps = {
  customer: Customer;
  onUpdate: () => void;
};

export default function DevicePolicyManager({ customer, onUpdate }: DevicePolicyManagerProps) {
  const [isLocking, setIsLocking] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState("");

  const handleLockDevice = async () => {
    if (!confirm(`Lock ${customer.name}'s device access? This will set their data limit to 0.`)) {
      return;
    }

    setIsLocking(true);
    setError("");

    try {
      const response = await fetch(`/api/customers/${customer.id}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to lock device");
      }

      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to lock device");
    } finally {
      setIsLocking(false);
    }
  };

  const handleUnlockDevice = async () => {
    if (!confirm(`Unlock ${customer.name}'s device access? This will remove their data limit.`)) {
      return;
    }

    setIsUnlocking(true);
    setError("");

    try {
      const response = await fetch(`/api/customers/${customer.id}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      console.log(response);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to unlock device");
      }

      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlock device");
    } finally {
      setIsUnlocking(false);
    }
  };

  if (customer.status !== "ACTIVE") {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="text-amber-600" size={18} />
        <h3 className="font-semibold text-amber-800">1 Key = 1 Device Policy</h3>
      </div>

      <p className="text-sm text-amber-700 mb-4">
        Manage device access by locking (data limit = 0) or unlocking this customer's key.
      </p>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3">
          <AlertTriangle className="text-rose-500" size={16} />
          <p className="text-sm text-rose-600">{error}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleLockDevice}
          disabled={isLocking || isUnlocking}
          className="flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Lock size={16} />
          {isLocking ? "Locking..." : "Lock Device"}
        </button>

        <button
          onClick={handleUnlockDevice}
          disabled={isLocking || isUnlocking}
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Unlock size={16} />
          {isUnlocking ? "Unlocking..." : "Unlock Device"}
        </button>
      </div>
    </div>
  );
}
