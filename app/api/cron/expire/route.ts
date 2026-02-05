import { NextResponse } from "next/server";
import  prisma  from "@/lib/prisma";
import { outlineFetch } from "@/lib/outline";
import { nowInMyanmar } from "@/lib/myanmar-time";

export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const header = req.headers.get("x-cron-secret");
  if (!cronSecret || header !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use Myanmar timezone for consistent expiry checking
  const now = nowInMyanmar();
  // Convert back to UTC for database comparison since expiresAt is stored in UTC
  const nowUTC = new Date(now.getTime() - 6.5 * 60 * 60 * 1000);
  
  const expiring = await prisma.customer.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lt: nowUTC },
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
