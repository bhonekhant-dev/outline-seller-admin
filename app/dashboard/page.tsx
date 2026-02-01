import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import DashboardClient from "@/app/dashboard/DashboardClient";

export default async function DashboardPage() {
  const session = await requireSession();
  if (!session) {
    redirect("/login");
  }
  return <DashboardClient />;
}
