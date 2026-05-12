"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";

interface MobileSidebarProps {
  role: string;
  userName: string;
  userEmail: string;
  unreadCount: number;
}

export function MobileSidebar({ role, userName, userEmail, unreadCount }: MobileSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden">
            <Sidebar
              role={role}
              userName={userName}
              userEmail={userEmail}
              unreadCount={unreadCount}
              onClose={() => setOpen(false)}
            />
          </div>
        </>
      )}
    </>
  );
}
