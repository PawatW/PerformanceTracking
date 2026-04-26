import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradeBadge } from "@/components/grade-badge";
import { ProgressCharts } from "@/components/progress-charts";
import { calculateWeightedScore, scoreToGradeColor } from "@/lib/grade-utils";

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

  // ─── Line chart data ────────────────────────────────────────────────────────
  // All assignments with grades (mine or class), sorted by dueDate
  const linePoints: {
    label: string;
    myScore: number | null;
    classAvg: number | null;
  }[] = [];

  const allAssignments = enrollments
    .flatMap((e) => e.course.assignments)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  for (const a of allAssignments) {
    const mySub = a.submissions.find((s) => s.studentId === user.id && s.grade);
    const allGraded = a.submissions.filter((s) => s.grade);

    if (allGraded.length === 0) continue;

    const myScore = mySub?.grade
      ? Math.round(((mySub.grade.score / a.maxScore) * 100) * 10) / 10
      : null;

    const classAvg =
      Math.round(
        (allGraded.reduce((sum, s) => sum + (s.grade!.score / a.maxScore) * 100, 0) /
          allGraded.length) *
          10
      ) / 10;

    linePoints.push({
      label: a.title.length > 12 ? a.title.slice(0, 12) + "…" : a.title,
      myScore,
      classAvg,
    });
  }

  // ─── Bar chart data ─────────────────────────────────────────────────────────
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

  // ─── Summary table per course ────────────────────────────────────────────────
  const courseSummaries = enrollments.map(({ course }) => {
    const totalAssignments = course.assignments.length;
    const submittedCount = course.assignments.filter((a) =>
      a.submissions.some((s) => s.studentId === user.id)
    ).length;
    const remaining = totalAssignments - submittedCount;

    const gradedItems = course.assignments.flatMap((a) =>
      a.submissions
        .filter((s) => s.studentId === user.id && s.grade)
        .map((s) => ({
          score: (s.grade!.score / a.maxScore) * 100,
          weight: a.weight,
        }))
    );
    const currentScore = gradedItems.length > 0 ? calculateWeightedScore(gradedItems) : null;

    return {
      id: course.id,
      code: course.code,
      title: course.title,
      instructor: course.instructor.name,
      currentScore,
      remaining,
      totalAssignments,
      submittedCount,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ความก้าวหน้า</h1>
        <p className="text-sm text-muted-foreground mt-1">ติดตามผลการเรียนของคุณ</p>
      </div>

      {/* Charts */}
      <Card>
        <CardContent className="pt-6">
          <ProgressCharts lineData={linePoints} barData={barData} />
        </CardContent>
      </Card>

      {/* Course summary table */}
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
                  <th className="pb-3 text-center font-medium">เกรดที่ได้</th>
                  <th className="pb-3 text-center font-medium">งานที่เหลือ</th>
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
                    <td className="py-3 text-center">
                      <span className={c.remaining > 0 ? "text-yellow-600 font-medium" : "text-green-600"}>
                        {c.remaining}
                      </span>
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
