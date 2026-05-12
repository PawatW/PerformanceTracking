import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradeBadge } from "@/components/grade-badge";
import { ProgressCharts } from "@/components/progress-charts";
import { RadarByTypeChart } from "@/components/analytics-charts";
import { calculateWeightedScore, scoreToGradeColor, scoreToGrade } from "@/lib/grade-utils";
import { BookOpen, CheckCircle, XCircle, TrendingUp } from "lucide-react";

const typeLabel: Record<string, string> = {
  HOMEWORK: "การบ้าน",
  QUIZ: "Quiz",
  MIDTERM: "กลางภาค",
  FINAL: "ปลายภาค",
  PROJECT: "โปรเจกต์",
};

export default async function StudentProgressPage() {
  const user = await requireRole("STUDENT");

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: user.id, status: "ACTIVE" },
    include: {
      course: {
        include: {
          instructor: { select: { name: true } },
          assignments: {
            include: {
              submissions: {
                include: { grade: true },
              },
            },
            orderBy: { dueDate: "asc" },
          },
        },
      },
    },
  });

  const allAssignments = enrollments
    .flatMap((e) => e.course.assignments)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // ─── Personal stats ──────────────────────────────────────────────────────────
  const totalAssignmentsAll = allAssignments.length;
  const submittedAll = allAssignments.filter((a) =>
    a.submissions.some((s) => s.studentId === user.id)
  ).length;
  const missingAll = totalAssignmentsAll - submittedAll;
  const submitRate = totalAssignmentsAll > 0 ? (submittedAll / totalAssignmentsAll) * 100 : 0;

  // Overall GPA-style weighted score across all courses
  const allGradedItems = enrollments.flatMap(({ course }) =>
    course.assignments.flatMap((a) =>
      a.submissions
        .filter((s) => s.studentId === user.id && s.grade)
        .map((s) => ({ score: (s.grade!.score / a.maxScore) * 100, weight: a.weight }))
    )
  );
  const overallScore = allGradedItems.length > 0 ? calculateWeightedScore(allGradedItems) : null;

  // ─── Line chart data ─────────────────────────────────────────────────────────
  const linePoints: { label: string; myScore: number | null; classAvg: number | null }[] = [];

  for (const a of allAssignments) {
    const mySub = a.submissions.find((s) => s.studentId === user.id && s.grade);
    const allGraded = a.submissions.filter((s) => s.grade);
    if (allGraded.length === 0) continue;

    linePoints.push({
      label: a.title.length > 12 ? a.title.slice(0, 12) + "…" : a.title,
      myScore: mySub?.grade
        ? Math.round(((mySub.grade.score / a.maxScore) * 100) * 10) / 10
        : null,
      classAvg:
        Math.round(
          (allGraded.reduce((sum, s) => sum + (s.grade!.score / a.maxScore) * 100, 0) /
            allGraded.length) * 10
        ) / 10,
    });
  }

  // ─── Bar / Radar chart data ───────────────────────────────────────────────────
  const typeMap = new Map<string, { myTotal: number; myCount: number; classTotal: number; classCount: number }>();

  for (const a of allAssignments) {
    const current = typeMap.get(a.type) ?? { myTotal: 0, myCount: 0, classTotal: 0, classCount: 0 };
    const allGraded = a.submissions.filter((s) => s.grade);
    const mySub = a.submissions.find((s) => s.studentId === user.id && s.grade);

    if (allGraded.length > 0) {
      current.classTotal += allGraded.reduce((s, sub) => s + (sub.grade!.score / a.maxScore) * 100, 0);
      current.classCount += allGraded.length;
    }
    if (mySub?.grade) {
      current.myTotal += (mySub.grade.score / a.maxScore) * 100;
      current.myCount += 1;
    }
    typeMap.set(a.type, current);
  }

  const barData = Array.from(typeMap.entries()).map(([type, v]) => ({
    type: typeLabel[type] ?? type,
    myAvg: v.myCount > 0 ? Math.round((v.myTotal / v.myCount) * 10) / 10 : null,
    classAvg: v.classCount > 0 ? Math.round((v.classTotal / v.classCount) * 10) / 10 : null,
  }));

  const radarData = Array.from(typeMap.entries()).map(([type, v]) => ({
    type: typeLabel[type] ?? type,
    avg: v.myCount > 0 ? Math.round((v.myTotal / v.myCount) * 10) / 10 : 0,
    fullMark: 100,
  }));

  // ─── Summary table per course ─────────────────────────────────────────────────
  const courseSummaries = enrollments.map(({ course }) => {
    const totalA = course.assignments.length;
    const submittedCount = course.assignments.filter((a) =>
      a.submissions.some((s) => s.studentId === user.id)
    ).length;
    const remaining = totalA - submittedCount;

    const gradedItems = course.assignments.flatMap((a) =>
      a.submissions
        .filter((s) => s.studentId === user.id && s.grade)
        .map((s) => ({ score: (s.grade!.score / a.maxScore) * 100, weight: a.weight }))
    );
    const currentScore = gradedItems.length > 0 ? calculateWeightedScore(gradedItems) : null;

    const totalWeight = course.assignments.reduce((s, a) => s + a.weight, 0);
    const gradedWeight = course.assignments
      .filter((a) => a.submissions.some((s) => s.studentId === user.id && s.grade))
      .reduce((s, a) => s + a.weight, 0);
    const remainingWeight = totalWeight - gradedWeight;

    const neededForA =
      remainingWeight > 0 && currentScore != null
        ? ((80 * totalWeight - currentScore * gradedWeight) / remainingWeight)
        : null;

    return {
      id: course.id,
      code: course.code,
      title: course.title,
      instructor: course.instructor.name,
      currentScore,
      remaining,
      totalAssignments: totalA,
      submittedCount,
      neededForA,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ความก้าวหน้า</h1>
        <p className="text-sm text-muted-foreground mt-1">ติดตามผลการเรียนของคุณ</p>
      </div>

      {/* Personal stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <p className="text-xs text-muted-foreground">คะแนนรวมทุกวิชา</p>
            </div>
            {overallScore != null ? (
              <>
                <p className={`text-2xl font-bold ${scoreToGradeColor(overallScore)}`}>
                  {overallScore.toFixed(1)}%
                </p>
                <p className={`text-sm font-semibold ${scoreToGradeColor(overallScore)}`}>
                  {scoreToGrade(overallScore)}
                </p>
              </>
            ) : (
              <p className="text-xl font-bold text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-4 w-4 text-purple-500" />
              <p className="text-xs text-muted-foreground">วิชาที่ลงทะเบียน</p>
            </div>
            <p className="text-2xl font-bold">{enrollments.length}</p>
            <p className="text-xs text-muted-foreground">วิชา</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <p className="text-xs text-muted-foreground">อัตราการส่งงาน</p>
            </div>
            <p className="text-2xl font-bold">{submitRate.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">
              {submittedAll}/{totalAssignmentsAll} ชิ้น
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="h-4 w-4 text-red-500" />
              <p className="text-xs text-muted-foreground">ขาดส่ง</p>
            </div>
            <p className={`text-2xl font-bold ${missingAll > 0 ? "text-red-500" : "text-green-600"}`}>
              {missingAll}
            </p>
            <p className="text-xs text-muted-foreground">ชิ้นงาน</p>
          </CardContent>
        </Card>
      </div>

      {/* Line chart: score trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">แนวโน้มคะแนน</CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressCharts lineData={linePoints} barData={barData} />
        </CardContent>
      </Card>

      {/* Radar chart by assignment type */}
      {radarData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">คะแนนเฉลี่ยแยกตามประเภท</CardTitle>
          </CardHeader>
          <CardContent>
            <RadarByTypeChart data={radarData} />
          </CardContent>
        </Card>
      )}

      {/* Course summary table with "needed for A" */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">สรุปรายวิชา</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-3 text-left font-medium">วิชา</th>
                  <th className="pb-3 text-center font-medium">ส่งงาน</th>
                  <th className="pb-3 text-center font-medium">คะแนนรวม</th>
                  <th className="pb-3 text-center font-medium">เกรด</th>
                  <th className="pb-3 text-center font-medium hidden sm:table-cell">
                    คะแนนที่ต้องได้ (เกรด A)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {courseSummaries.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 pr-4">
                      <p className="font-medium">{c.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.code} · อ.{c.instructor}
                      </p>
                    </td>
                    <td className="py-3 text-center">
                      {c.submittedCount}/{c.totalAssignments}
                    </td>
                    <td className="py-3 text-center">
                      {c.currentScore != null ? (
                        <span className={`font-semibold ${scoreToGradeColor(c.currentScore)}`}>
                          {c.currentScore.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {c.currentScore != null ? (
                        <GradeBadge score={c.currentScore} />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-3 text-center hidden sm:table-cell">
                      {c.neededForA !== null ? (
                        <span
                          className={`font-medium ${
                            c.neededForA > 100
                              ? "text-destructive"
                              : scoreToGradeColor(c.neededForA)
                          }`}
                        >
                          {c.neededForA > 100
                            ? "ไม่สามารถถึงได้"
                            : `${c.neededForA.toFixed(1)}%`}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {courseSummaries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-muted-foreground">
                      ยังไม่มีวิชาที่ลงทะเบียน
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
