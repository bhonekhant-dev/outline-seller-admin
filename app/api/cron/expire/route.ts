import { NextResponse } from "next/server";
import  prisma  from "@/lib/prisma";
import { outlineFetch } from "@/lib/outline";

export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const header = req.headers.get("x-cron-secret");
  if (!cronSecret || header !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const expiring = await prisma.customer.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lt: now },
    },
  });

  let revoked = 0;
  let failed = 0;

  for (const customer of expiring) {
    try {
      await outlineFetch(`/access-keys/${customer.outlineKeyId}`, {
        method: "DELETE",
      });
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          status: "EXPIRED",
        },
      });
      await prisma.auditLog.create({
        data: {
          action: "customer.expire",
          customerId: customer.id,
          meta: {
            outlineKeyId: customer.outlineKeyId,
          },
        },
      });
      revoked += 1;
    } catch {
      failed += 1;
    }
  }

  return NextResponse.json({
    checked: expiring.length,
    revoked,
    failed,
  });
}
