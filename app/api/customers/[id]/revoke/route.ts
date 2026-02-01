import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { outlineFetch } from "@/lib/outline";
import { requireSession, unauthorizedResponse } from "@/lib/auth";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> } // Type updated to Promise
) {
  if (!(await requireSession())) return unauthorizedResponse();

  // 1. Await the params before using them
  const { id } = await context.params;

  // 2. Now 'id' is a string, and Prisma will work correctly
  const customer = await prisma.customer.findUnique({ where: { id } });
  
  if (!customer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ... rest of your code
  await outlineFetch(`/access-keys/${customer.outlineKeyId}`, {
    method: "DELETE",
  });

  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: { status: "REVOKED" },
  });

  // ... audit log and return
  return NextResponse.json({ customer: updated });
}
