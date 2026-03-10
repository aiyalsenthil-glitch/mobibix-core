import { redirect } from "next/navigation";

// Dead scaffold — real dashboard is at app/(app)/dashboard
export default function LegacyDashboardRedirect() {
  redirect("/dashboard");
}
