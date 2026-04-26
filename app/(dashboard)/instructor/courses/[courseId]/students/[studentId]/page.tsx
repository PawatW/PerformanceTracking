import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AssignmentTypeBadge } from "@/components/assignment-type-badge";
import { StatusBadge } from "@/components/status-badge";
import { GradeBadge } from "@/components/grade-badge";
import {
  calculateWeightedScore,
  scoreToGrade,
  scoreToGradeColor,
} from "@/lib/grade-utils";
import { ArrowLeft, BookOpen } from "lucide-react";

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default async function StudentGradeSummaryPage({
  params,
}: {
  params: { courseId: string; studentId: string };
}) {
  const user = await requireRole("INSTRUCTOR");

  const [course, student, enrollment] = await Promise.all([
    prisma.course.findUnique({
      where: { id: params.courseId },
      include: {
        assignments: {
          include: {
            submissions: {
              where: { studentId: params.studentId },
              include: { grade: true },
            },
          },
          orderBy: { dueDate: "asc" },
        },
      },
    }),
    prisma.user.findUnique({ where: { id: params.studentId } }),
    prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: params.studentId,
          courseId: params.courseId,
        },
      },
    }),
  ]);

  if (!course || course.instructorId !== user.id || !student || !enrollment) notFound();

  // Build row data
  const rows = course.assignments.map((a) => {
    const sub = a.submissions[0] ?? null;
    const scorePct = sub?.grade ? (sub.grade.score / a.maxScore) * 100 : null;
    const weightedContrib = scorePct != null ? (scorePct * a.weight) / 100 : null;
    return {
      id: a.id,
      title: a.title,
      type: a.type,
      weight: a.weight,
      maxScore: a.maxScore,
      submission: sub,
      score: sub?.grade?.score ?? null,
      scorePct,
      weightedContrib,
      status: (sub?.status ?? "NOT_SUBMITTED") as
        | "SUBMITTED"
        | "LATE"
        | "NOT_SUBMITTED"
        | "GRADED",
    };
  });

  const gradedRows = rows.filter((r) => r.scorePct != null);
  const currentScore =
    gradedRows.length > 0
      ? calculateWeightedScore(
          gradedRows.map((r) => ({ score: r.scorePct!, weight: r.weight }))
        )
      : null;

  const totalWeight = course.assignments.reduce((s, a) => s + a.weight, 0);
  const gradedWeight = gradedRows.reduce((s, r) => s + r.weight, 0);
  const remainingWeight = totalWeight - gradedWeight;

  // Score needed in remaining assignments to reach grade A (80%)
  const neededForA =
    remainingWeight > 0 && currentScore != null
      ? ((80 * totalWeight - currentScore * gradedWeight) / remainingWeight).toFixed(1)
      : null;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href={`/dashboard/instructor/courses/${params.courseId}`}>
            <ArrowLeft className="h-4 w-4" />
            กลับ
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg bg-primary/10 text-primary">
              {initials(student.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{student.name}</h1>
            <p className="text-sm text-muted-foreground">{student.email}</p>
            {student.yearLevel && (
              <p className="text-sm text-muted-foreground">{student.yearLevel}</p>
            )}
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-1 self-start">
          <Link href={`/dashboard/instructor/courses/${params.courseId}`}>
            <BookOpen className="h-4 w-4" />
            ดูงานทั้งหมด
          </Link>
        </Button>
      </div>

      {/* Score summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground mb-1">คะแนนรวมปัจจุบัน</p>
            {currentScore != null ? (
              <>
                <p className={`text-3xl font-extrabold ${scoreToGradeColor(currentScore)}`}>
                  {currentScore.toFixed(2)}%
                </p>
                <GradeBadge score={currentScore} />
              </>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground">ยังไม่มีคะแนน</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground mb-1">ตรวจแล้ว</p>
            <p className="text-2xl font-bold">
              {gradedRows.length}/{rows.length}
            </p>
            <p className="text-xs text-muted-foreground">งาน</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground mb-1">น้ำหนักที่เหลือ</p>
            <p className="text-2xl font-bold">{remainingWeight}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Grade breakdown table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ผลการเรียนรายชิ้นงาน</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-3 text-left font-medium">ชื่องาน</th>
                  <th className="pb-3 text-left font-medium hidden sm:table-cell">ประเภท</th>
                  <th className="pb-3 text-center font-medium">น้ำหนัก%</th>
                  <th className="pb-3 text-center font-medium">คะแนนที่ได้</th>
                  <th className="pb-3 text-center font-medium">weighted</th>
                  <th className="pb-3 text-center font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 pr-3 font-medium">{r.title}</td>
                    <td className="py-3 pr-3 hidden sm:table-cell">
                      <AssignmentTypeBadge type={r.type} />
                    </td>
                    <td className="py-3 text-center">{r.weight}%</td>
                    <td className="py-3 text-center">
                      {r.score != null ? (
                        <span className={`font-semibold ${scoreToGradeColor((r.score / r.maxScore) * 100)}`}>
                          {r.score}/{r.maxScore}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {r.weightedContrib != null ? (
                        <span className="text-muted-foreground">
                          {r.weightedContrib.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
              {currentScore != null && (
                <tfoot>
                  <tr className="border-t-2 font-semibold">
                    <td className="pt-3 pr-3">Weighted Average</td>
                    <td className="hidden sm:table-cell" />
                    <td className="pt-3 text-center">{gradedWeight}%</td>
                    <td />
                    <td className={`pt-3 text-center text-base ${scoreToGradeColor(currentScore)}`}>
                      {currentScore.toFixed(2)}%
                    </td>
                    <td className="pt-3 text-center">
                      <GradeBadge score={currentScore} />
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Grade projection */}
      {neededForA !== null && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-5">
            <p className="text-sm font-semibold mb-2">การประมาณเกรด</p>
            <p className="text-sm text-muted-foreground">
              เพื่อให้ได้เกรด <strong>A (≥80%)</strong> นักศึกษาต้องทำคะแนนเฉลี่ย{" "}
              <strong className={scoreToGradeColor(Number(neededForA))}>{neededForA}%</strong>{" "}
              จากงานที่เหลือ ({remainingWeight}% น้ำหนัก)
            </p>
            {Number(neededForA) > 100 && (
              <p className="text-xs text-destructive mt-1">
                ⚠ คะแนนที่ต้องการเกิน 100% — ไม่สามารถถึงเกรด A ได้แล้ว
              </p>
            )}
            {currentScore != null && (
              <p className="text-xs text-muted-foreground mt-1">
                เกรดปัจจุบัน: {scoreToGrade(currentScore)} ({currentScore.toFixed(1)}%)
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
