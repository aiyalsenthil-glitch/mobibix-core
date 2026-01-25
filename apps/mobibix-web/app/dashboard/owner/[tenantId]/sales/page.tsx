import { redirect } from "next/navigation";

export default function OwnerSalesRedirect() {
  redirect("/dashboard/sales");
}
