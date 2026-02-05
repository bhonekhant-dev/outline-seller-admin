import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { outlineFetch } from "@/lib/outline";
import { requireSession, unauthorizedResponse } from "@/lib/auth";

function extendExpiry(current: Date, planDays: number) {
  const base = current.getTime() > Date.now() ? current : new Date();
  return new Date(base.getTime() + planDays * 24 * 60 * 60 * 1000);
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> } // 1. Update Type to Promise
) {
  if (!(await requireSession())) return unauthorizedResponse();

  // 2. Await the params to get the ID
  const { id } = await context.params;

  const body = await req.json().catch(() => null);

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const requestedPlanDays = Number(body?.planDays);
  const planDays = Number.isFinite(requestedPlanDays) && requestedPlanDays > 0
    ? requestedPlanDays
    : customer.planDays;

  // Create new key
  const createRes = await outlineFetch("/access-keys", { method: "POST" });
  const created = (await createRes.json()) as {
    id: string;
    accessUrl: string;
  };

  // 3. Rename key using FormData (Matches your route logic for key creation)
  const form = new FormData();
  form.set("name", customer.name);

  await outlineFetch(`/access-keys/${created.id}/name`, {
    method: "PUT",
    body: form,
  });

  try {
    // Delete the old key
    await outlineFetch(`/access-keys/${customer.outlineKeyId}`, {
      method: "DELETE",
    });
  } catch (error) {
    // Cleanup the newly created key if the deletion of the old one fails
    await outlineFetch(`/access-keys/${created.id}`, { method: "DELETE" });
    throw error;
  }

  const expiresAt = extendExpiry(customer.expiresAt, planDays);

  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: {
      expiresAt,
      status: "ACTIVE",
      planDays,
      outlineKeyId: String(created.id),
      outlineAccessUrl: created.accessUrl,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "customer.renew",
      customerId: customer.id,
      meta: {
        oldKeyId: customer.outlineKeyId,
        newKeyId: String(created.id),
        newExpiresAt: expiresAt.toISOString(),
        planDays,
      },
    },
  });

  return NextResponse.json({ customer: updated });
}
