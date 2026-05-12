import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function RootPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const roleMap: Record<string, string> = {
    ADMIN: "/dashboard/admin",
    INSTRUCTOR: "/dashboard/instructor",
    STUDENT: "/dashboard/student",
  };

  const role = session.user.role as string;
  redirect(roleMap[role] ?? "/dashboard/student");
}
