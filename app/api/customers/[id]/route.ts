import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { outlineFetch } from "@/lib/outline";
import { requireSession, unauthorizedResponse } from "@/lib/auth";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await requireSession())) return unauthorizedResponse();

  const { id } = await context.params;
  const body = await req.json().catch(() => null);

  const name = typeof body?.name === "string" ? body.name.trim() : undefined;
  const phone =
    typeof body?.phone === "string"
      ? body.phone.trim() || null
      : body?.phone === null
        ? null
        : undefined;

  if (name === undefined && phone === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (name !== undefined && customer.status === "ACTIVE") {
    const form = new FormData();
    form.set("name", name);
    await outlineFetch(`/access-keys/${customer.outlineKeyId}/name`, {
      method: "PUT",
      body: form,
    });
  }

  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phone } : {}),
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "customer.update",
      customerId: customer.id,
      meta: {
        name: name ?? undefined,
        phone: phone ?? undefined,
      },
    },
  });

  return NextResponse.json({ customer: updated });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await requireSession())) return unauthorizedResponse();

  const { id } = await context.params;
  const customer = await prisma.customer.findUnique({ where: { id } });

  if (!customer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();
  if (customer.status === "ACTIVE" && customer.expiresAt > now) {
    return NextResponse.json(
      { error: "Only expired plans can be deleted" },
      { status: 400 }
    );
  }

  try {
    await outlineFetch(`/access-keys/${customer.outlineKeyId}`, {
      method: "DELETE",
    });
  } catch {
    // Key might already be deleted for expired/revoked plans.
  }

  await prisma.auditLog.create({
    data: {
      action: "customer.delete",
      customerId: customer.id,
      meta: {
        status: customer.status,
      },
    },
  });

  await prisma.customer.delete({ where: { id: customer.id } });

  return NextResponse.json({ ok: true });
}
