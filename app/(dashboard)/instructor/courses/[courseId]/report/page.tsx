import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { GradeBadge } from "@/components/grade-badge";
import { PrintButton } from "@/components/print-button";
import { scoreToGrade, scoreToGradeColor, getClassStats } from "@/lib/grade-utils";

export default async function CourseReportPage({
  params,
}: {
  params: { courseId: string };
}) {
  const user = await requireRole("INSTRUCTOR");

  const course = await prisma.course.findUnique({
    where: { id: params.courseId },
    include: {
      assignments: { orderBy: { dueDate: "asc" } },
      enrollments: {
        where: { status: "ACTIVE" },
        orderBy: { student: { name: "asc" } },
        include: {
          student: {
            include: {
              submissions: {
                where: { assignment: { courseId: params.courseId } },
                include: { grade: true, assignment: true },
              },
            },
          },
        },
      },
    },
  });

  if (!course || course.instructorId !== user.id) notFound();

  const assignments = course.assignments;

  // Per-student summary
  const studentRows = course.enrollments.map(({ student }) => {
    const subMap = new Map(student.submissions.map((s) => [s.assignmentId, s]));

    const scores = assignments.map((a) => {
      const sub = subMap.get(a.id);
      return sub?.grade ? (sub.grade.score / a.maxScore) * 100 : null;
    });

    let weightedSum = 0;
    let weightSum = 0;
    for (const a of assignments) {
      const sub = subMap.get(a.id);
      if (sub?.grade) {
        const pct = (sub.grade.score / a.maxScore) * 100;
        weightedSum += pct * a.weight;
        weightSum += a.weight;
      }
    }
    const weightedScore = weightSum > 0 ? weightedSum / weightSum : null;

    return {
      id: student.id,
      name: student.name,
      email: student.email,
      yearLevel: student.yearLevel,
      scores,
      weightedScore,
      grade: weightedScore !== null ? scoreToGrade(weightedScore) : null,
      missedCount: assignments.length - student.submissions.length,
    };
  });

  // Class stats from all weighted scores
  const allWeighted = studentRows
    .map((r) => r.weightedScore)
    .filter((s): s is number => s !== null);
  const stats = getClassStats(allWeighted);

  // Grade distribution
  const gradeCounts: Record<string, number> = {};
  for (const r of studentRows) {
    if (r.grade) gradeCounts[r.grade] = (gradeCounts[r.grade] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href={`/dashboard/instructor/courses/${params.courseId}/analytics`}>
            <ArrowLeft className="h-4 w-4" />
            กลับ Analytics
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a href={`/api/export/${params.courseId}`} download>
              Export CSV
            </a>
          </Button>
          <PrintButton />
        </div>
      </div>

      {/* Report header */}
      <div className="text-center space-y-1 pb-2 border-b">
        <h1 className="text-xl font-bold">{course.code} — {course.title}</h1>
        <p className="text-sm text-muted-foreground">รายงานผลการเรียน</p>
      </div>

      {/* Class stats summary */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "นักศึกษาทั้งหมด", value: `${studentRows.length} คน` },
            { label: "คะแนนเฉลี่ย", value: `${stats.mean.toFixed(2)}%` },
            { label: "สูงสุด / ต่ำสุด", value: `${stats.max.toFixed(1)} / ${stats.min.toFixed(1)}` },
            { label: "SD", value: stats.sd.toFixed(2) },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Grade distribution */}
      {Object.keys(gradeCounts).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">การกระจายเกรด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {["A", "B+", "B", "C+", "C", "D+", "D", "F"].map((g) => (
                <div key={g} className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold w-6 text-center">{g}</span>
                  <Badge variant="secondary">{gradeCounts[g] ?? 0} คน</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main grade table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">ตารางคะแนนรายคน</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-3 text-left font-medium">#</th>
                  <th className="pb-3 text-left font-medium">ชื่อ</th>
                  {assignments.map((a) => (
                    <th key={a.id} className="pb-3 text-center font-medium px-2 hidden md:table-cell">
                      <span className="block text-xs leading-tight max-w-[80px] mx-auto truncate">
                        {a.title.length > 10 ? a.title.slice(0, 10) + "…" : a.title}
                      </span>
                      <span className="text-[10px] font-normal">({a.weight}%)</span>
                    </th>
                  ))}
                  <th className="pb-3 text-center font-medium">คะแนนรวม</th>
                  <th className="pb-3 text-center font-medium">เกรด</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {studentRows.map((r, idx) => (
                  <tr key={r.id}>
                    <td className="py-2.5 text-muted-foreground">{idx + 1}</td>
                    <td className="py-2.5 pr-3">
                      <p className="font-medium">{r.name}</p>
                      {r.yearLevel && (
                        <p className="text-xs text-muted-foreground">{r.yearLevel}</p>
                      )}
                    </td>
                    {r.scores.map((score, i) => (
                      <td key={i} className="py-2.5 text-center px-2 hidden md:table-cell">
                        {score !== null ? (
                          <span className={`text-xs font-medium ${scoreToGradeColor(score)}`}>
                            {score.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    ))}
                    <td className="py-2.5 text-center">
                      {r.weightedScore !== null ? (
                        <span className={`font-semibold ${scoreToGradeColor(r.weightedScore)}`}>
                          {r.weightedScore.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-center">
                      {r.grade ? (
                        <GradeBadge score={r.weightedScore!} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
