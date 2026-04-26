"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

type SubmissionStatus = "SUBMITTED" | "LATE" | "NOT_SUBMITTED" | "GRADED";

interface StudentRow {
  studentId: string;
  name: string;
  email: string;
  yearLevel: string | null;
  submissionId: string | null;
  submittedAt: Date | null;
  status: SubmissionStatus;
  score: number | null;
  maxScore: number;
  isLate: boolean;
}

type FilterTab = "ALL" | "PENDING" | "GRADED" | "NOT_SUBMITTED";

const tabs: { key: FilterTab; label: string }[] = [
  { key: "ALL", label: "ทั้งหมด" },
  { key: "PENDING", label: "รอตรวจ" },
  { key: "GRADED", label: "ตรวจแล้ว" },
  { key: "NOT_SUBMITTED", label: "ยังไม่ส่ง" },
];

interface SubmissionsFilterProps {
  rows: StudentRow[];
  assignmentId: string;
}

export function SubmissionsFilter({ rows, assignmentId }: SubmissionsFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filterParam = (searchParams.get("filter") ?? "ALL") as FilterTab;
  const [search, setSearch] = useState("");

  function setFilter(key: FilterTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "ALL") params.delete("filter");
    else params.set("filter", key);
    router.replace(`${pathname}?${params.toString()}`);
  }

  const filtered = useMemo(() => {
    let result = rows;
    if (filterParam === "PENDING") result = result.filter((r) => r.status === "SUBMITTED" || r.status === "LATE");
    else if (filterParam === "GRADED") result = result.filter((r) => r.status === "GRADED");
    else if (filterParam === "NOT_SUBMITTED") result = result.filter((r) => r.status === "NOT_SUBMITTED");

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
    }
    return result;
  }, [rows, filterParam, search]);

  return (
    <div className="space-y-4">
      {/* Filter tabs + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <Button
              key={t.key}
              variant={filterParam === t.key ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter(t.key)}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาชื่อนักศึกษา..."
            className="pl-8 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">นักศึกษา</th>
              <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">ชั้นปี</th>
              <th className="px-4 py-3 text-left font-medium hidden md:table-cell">วันที่ส่ง</th>
              <th className="px-4 py-3 text-center font-medium">สถานะ</th>
              <th className="px-4 py-3 text-center font-medium">คะแนน</th>
              <th className="px-4 py-3 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((row) => (
              <tr
                key={row.studentId}
                className={cn(
                  "transition-colors hover:bg-muted/20",
                  row.isLate && row.status !== "NOT_SUBMITTED" && "bg-orange-50",
                  row.status === "NOT_SUBMITTED" && "bg-gray-50 opacity-70"
                )}
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{row.name}</p>
                  <p className="text-xs text-muted-foreground">{row.email}</p>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                  {row.yearLevel ?? "-"}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                  {row.submittedAt
                    ? format(new Date(row.submittedAt), "d MMM yy HH:mm", { locale: th })
                    : "-"}
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3 text-center">
                  {row.score != null ? (
                    <span className="font-semibold">
                      {row.score}/{row.maxScore}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {row.submissionId && row.status !== "NOT_SUBMITTED" ? (
                    <Button asChild size="sm">
                      <Link href={`/dashboard/instructor/submissions/${row.submissionId}/grade`}>
                        ตรวจงาน
                      </Link>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">ไม่มีงาน</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  ไม่พบข้อมูล
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
