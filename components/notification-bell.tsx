"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import {
  Bell,
  ClipboardCheck,
  Star,
  Megaphone,
  Info,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

const typeIcon: Record<string, React.ReactNode> = {
  GRADE_RELEASED: <Star className="h-4 w-4 text-yellow-500" />,
  ASSIGNMENT_DUE: <ClipboardCheck className="h-4 w-4 text-blue-500" />,
  COURSE_ANNOUNCEMENT: <Megaphone className="h-4 w-4 text-purple-500" />,
};

interface NotificationBellProps {
  initialUnreadCount: number;
}

export function NotificationBell({ initialUnreadCount }: NotificationBellProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  async function handleClick(n: Notification) {
    if (!n.read) await markRead(n.id);
    setOpen(false);
    if (n.link) {
      startTransition(() => router.push(n.link!));
    }
  }

  const display = notifications.slice(0, 5);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">การแจ้งเตือน</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-1 py-0.5 text-xs text-muted-foreground"
              onClick={markAllRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              อ่านทั้งหมด
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        {display.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Info className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">ไม่มีการแจ้งเตือน</p>
          </div>
        ) : (
          display.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={cn(
                "flex items-start gap-3 px-3 py-2.5 cursor-pointer",
                !n.read && "bg-blue-50/60 dark:bg-blue-950/20"
              )}
              onClick={() => handleClick(n)}
            >
              <span className="mt-0.5 flex-shrink-0">
                {typeIcon[n.type] ?? <Info className="h-4 w-4 text-muted-foreground" />}
              </span>
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className={cn("text-xs font-medium leading-snug", !n.read && "font-semibold")}>
                  {n.title}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(n.createdAt), {
                    addSuffix: true,
                    locale: th,
                  })}
                </p>
              </div>
              {!n.read && (
                <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
              )}
            </DropdownMenuItem>
          ))
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="justify-center text-xs text-muted-foreground py-2"
          onClick={() => {
            setOpen(false);
            router.push("/dashboard/notifications");
          }}
        >
          ดูทั้งหมด
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
