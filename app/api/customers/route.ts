import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { outlineFetch } from "@/lib/outline";
import { requireSession, unauthorizedResponse } from "@/lib/auth";

function toExpiry(planDays: number, from = new Date()) {
  const ms = planDays * 24 * 60 * 60 * 1000;
  return new Date(from.getTime() + ms);
}

export async function GET() {
  // ✅ requireSession is typically sync in App Router libs
  const session = requireSession();
  if (!session) return unauthorizedResponse();

  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ customers });
}

export async function POST(req: Request) {
  const session = requireSession();
  if (!session) return unauthorizedResponse();

  const body = await req.json().catch(() => null);

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : null;
  const planDays = Number(body?.planDays);

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!Number.isFinite(planDays) || planDays <= 0) {
    return NextResponse.json({ error: "Invalid planDays" }, { status: 400 });
  }

  // ✅ Create key
  const createRes = await outlineFetch("/access-keys", { method: "POST" });

  const created = (await createRes.json()) as {
    id: string | number;
    accessUrl: string;
  };

  // ✅ Rename key MUST be multipart/form-data (as README shows: -F 'name=...')
  const form = new FormData();
  form.set("name", name);

  await outlineFetch(`/access-keys/${created.id}/name`, {
    method: "PUT",
    body: form,
    // IMPORTANT: do NOT set Content-Type manually for FormData
  });

  const expiresAt = toExpiry(planDays);

  const customer = await prisma.customer.create({
    data: {
      name,
      phone,
      planDays,
      expiresAt,
      status: "ACTIVE",
      outlineKeyId: String(created.id),
      outlineAccessUrl: created.accessUrl,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "customer.create",
      customerId: customer.id,
      meta: {
        outlineKeyId: String(created.id),
        planDays,
      },
    },
  });

  return NextResponse.json({ customer });
}
