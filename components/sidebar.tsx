"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  GraduationCap,
  TrendingUp,
  Bell,
  LogOut,
  X,
  BookMarked,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const instructorNav: NavItem[] = [
  { href: "/dashboard/instructor", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/dashboard/instructor/courses", label: "วิชาของฉัน", icon: <BookOpen className="h-4 w-4" /> },
  { href: "/dashboard/instructor/reports", label: "รายงาน", icon: <BarChart3 className="h-4 w-4" /> },
];

const studentNav: NavItem[] = [
  { href: "/dashboard/student", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/dashboard/student/courses", label: "วิชาที่เรียน", icon: <GraduationCap className="h-4 w-4" /> },
  { href: "/dashboard/student/progress", label: "ความก้าวหน้า", icon: <TrendingUp className="h-4 w-4" /> },
];

interface SidebarProps {
  role: string;
  userName: string;
  userEmail: string;
  unreadCount: number;
  onClose?: () => void;
}

export function Sidebar({ role, userName, userEmail, unreadCount, onClose }: SidebarProps) {
  const pathname = usePathname();
  const navItems = role === "INSTRUCTOR" ? instructorNav : studentNav;

  return (
    <div className="flex h-full flex-col bg-card border-r">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <BookMarked className="h-6 w-6 text-primary" />
          <span className="font-bold text-sm leading-tight">Performance<br />Tracking</span>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Separator />

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard/instructor" || item.href === "/dashboard/student"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* Bottom: notifications + user */}
      <div className="p-3 space-y-2">
        <Link
          href="/dashboard/notifications"
          onClick={onClose}
          className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <span className="flex items-center gap-3">
            <Bell className="h-4 w-4" />
            การแจ้งเตือน
          </span>
          {unreadCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        <div className="rounded-md px-3 py-2">
          <p className="text-sm font-medium truncate">{userName}</p>
          <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
        </div>

        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          ออกจากระบบ
        </Button>
      </div>
    </div>
  );
}
