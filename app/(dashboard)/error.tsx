"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <AlertTriangle className="h-10 w-10 text-destructive" />
      </div>
      <h2 className="text-xl font-bold mb-2">เกิดข้อผิดพลาด</h2>
      <p className="text-muted-foreground text-sm mb-6 max-w-sm">
        ไม่สามารถโหลดหน้านี้ได้ กรุณาลองใหม่อีกครั้ง หรือกลับไปหน้าหลัก
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground mb-4 font-mono">
          Error ID: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <Button variant="outline" onClick={reset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          ลองใหม่
        </Button>
        <Button asChild className="gap-2">
          <Link href="/dashboard">
            <Home className="h-4 w-4" />
            หน้าหลัก
          </Link>
        </Button>
      </div>
    </div>
  );
}
