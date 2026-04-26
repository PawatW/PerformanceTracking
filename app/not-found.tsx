import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookMarked, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 text-center">
      <div className="mb-6 flex items-center gap-2">
        <BookMarked className="h-8 w-8 text-primary" />
        <span className="text-xl font-bold">Performance Tracking</span>
      </div>

      <div className="mb-4">
        <p className="text-8xl font-extrabold text-primary/20 select-none leading-none">404</p>
      </div>

      <h1 className="text-2xl font-bold mb-2">ไม่พบหน้าที่ต้องการ</h1>
      <p className="text-muted-foreground text-sm mb-8 max-w-sm">
        URL ที่คุณพิมพ์อาจพิมพ์ผิด หรือหน้านี้ถูกย้าย / ลบออกแล้ว
      </p>

      <div className="flex gap-3">
        <Button asChild className="gap-2">
          <Link href="/dashboard">
            <Home className="h-4 w-4" />
            หน้าหลัก
          </Link>
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dashboard/student/courses">
            <Search className="h-4 w-4" />
            ดูวิชา
          </Link>
        </Button>
      </div>
    </div>
  );
}
