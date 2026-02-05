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
    // Remove data limit to "unlock" the device
    await outlineFetch(`/access-keys/${customer.outlineKeyId}/data-limit`, {
      method: "DELETE",
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: "customer.unlock",
        customerId: customer.id,
        meta: {
          outlineKeyId: customer.outlineKeyId,
          dataLimit: null,
        },
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Device access unlocked (data limit removed)" 
    });
  } catch (error) {
    console.error("Failed to unlock device:", error);
    return NextResponse.json(
      { error: "Failed to unlock device access" },
      { status: 500 }
    );
  }
}