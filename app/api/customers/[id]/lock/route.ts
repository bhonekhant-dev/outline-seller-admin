import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { outlineFetch } from "@/lib/outline";
import { requireSession, unauthorizedResponse } from "@/lib/auth";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await requireSession())) return unauthorizedResponse();

  const { id } = await context.params;

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  if (customer.status !== "ACTIVE") {
    return NextResponse.json({ error: "Customer is not active" }, { status: 400 });
  }

  try {
    // Set data limit to 0 to effectively "lock" the device
    const form = new FormData();
    form.set("limit.bytes", "0");

    await outlineFetch(`/access-keys/${customer.outlineKeyId}/data-limit`, {
      method: "PUT",
      body: form,
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: "customer.lock",
        customerId: customer.id,
        meta: {
          outlineKeyId: customer.outlineKeyId,
          dataLimit: 0,
        },
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Device access locked (data limit set to 0)" 
    });
  } catch (error) {
    console.error("Failed to lock device:", error);
    return NextResponse.json(
      { error: "Failed to lock device access" },
      { status: 500 }
    );
  }
}