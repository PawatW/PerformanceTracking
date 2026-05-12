"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown } from "lucide-react";
import { scoreToGradeColor } from "@/lib/grade-utils";

interface StudentRow {
  id: string;
  name: string;
  email: string;
  yearLevel: string | null;
  submitted: number;
  graded: number;
  totalAssignments: number;
  missedCount: number;
  weightedScore: number | null;
  grade: string | null;
  isAtRisk: boolean;
}

type SortKey = "name" | "submitted" | "weightedScore" | "grade";

export function StudentPerformanceTable({
  rows,
  courseId,
}: {
  rows: StudentRow[];
  courseId: string;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);

  function toggle(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
  }

  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "name") cmp = a.name.localeCompare(b.name);
    else if (sortKey === "submitted") cmp = a.submitted - b.submitted;
    else if (sortKey === "weightedScore")
      cmp = (a.weightedScore ?? -1) - (b.weightedScore ?? -1);
    else if (sortKey === "grade")
      cmp = (a.grade ?? "").localeCompare(b.grade ?? "");
    return sortAsc ? cmp : -cmp;
  });

  function SortButton({ col }: { col: SortKey; label: string }) {
    return (
      <button
        className="flex items-center gap-1 hover:text-foreground transition-colors"
        onClick={() => toggle(col)}
      >
        {col}
        <ArrowUpDown className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="pb-3 text-left font-medium">
              <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggle("name")}>
                ชื่อ <ArrowUpDown className="h-3.5 w-3.5" />
              </button>
            </th>
            <th className="pb-3 text-center font-medium hidden sm:table-cell">ชั้นปี</th>
            <th className="pb-3 text-center font-medium">
              <button className="flex items-center gap-1 hover:text-foreground mx-auto" onClick={() => toggle("submitted")}>
                ส่งงาน <ArrowUpDown className="h-3.5 w-3.5" />
              </button>
            </th>
            <th className="pb-3 text-center font-medium">
              <button className="flex items-center gap-1 hover:text-foreground mx-auto" onClick={() => toggle("weightedScore")}>
                คะแนนรวม <ArrowUpDown className="h-3.5 w-3.5" />
              </button>
            </th>
            <th className="pb-3 text-center font-medium">
              <button className="flex items-center gap-1 hover:text-foreground mx-auto" onClick={() => toggle("grade")}>
                เกรด <ArrowUpDown className="h-3.5 w-3.5" />
              </button>
            </th>
            <th className="pb-3 text-center font-medium">สถานะ</th>
            <th className="pb-3" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {sorted.map((r) => (
            <tr key={r.id} className={r.isAtRisk ? "bg-red-50/30" : ""}>
              <td className="py-3 pr-3">
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.email}</p>
              </td>
              <td className="py-3 text-center text-muted-foreground hidden sm:table-cell">
                {r.yearLevel ?? "—"}
              </td>
              <td className="py-3 text-center">
                {r.submitted}/{r.totalAssignments}
              </td>
              <td className="py-3 text-center">
                {r.weightedScore !== null ? (
                  <span className={`font-semibold ${scoreToGradeColor(r.weightedScore)}`}>
                    {r.weightedScore.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="py-3 text-center">
                {r.grade ? (
                  <span className={`font-bold ${scoreToGradeColor(r.weightedScore!)}`}>{r.grade}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="py-3 text-center">
                {r.isAtRisk ? (
                  <Badge variant="destructive" className="text-xs">เสี่ยง</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">ปกติ</Badge>
                )}
              </td>
              <td className="py-3 text-right">
                <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                  <Link href={`/dashboard/instructor/courses/${courseId}/students/${r.id}`}>
                    ดู
                  </Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
