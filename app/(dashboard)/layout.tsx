import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/sidebar";
import { MobileSidebar } from "@/components/mobile-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const unreadCount = await prisma.notification.count({
    where: { userId: session.user.id, read: false },
  });

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0">
        <Sidebar
          role={session.user.role as string}
          userName={session.user.name ?? ""}
          userEmail={session.user.email ?? ""}
          unreadCount={unreadCount}
        />
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex items-center gap-3 border-b bg-background px-4 py-3 lg:hidden">
          <MobileSidebar
            role={session.user.role as string}
            userName={session.user.name ?? ""}
            userEmail={session.user.email ?? ""}
            unreadCount={unreadCount}
          />
          <span className="font-semibold text-sm">Performance Tracking</span>
        </header>

        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
