import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function DashboardIndex() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  switch (session.user.role) {
    case "INSTRUCTOR":
      redirect("/dashboard/instructor");
    case "ADMIN":
      redirect("/dashboard/admin");
    default:
      redirect("/dashboard/student");
  }
}
