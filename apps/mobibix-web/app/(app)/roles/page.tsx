import { redirect } from "next/navigation";

export default function RolesRedirectPage() {
  redirect("/staff-management?tab=roles");
}
