import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AssignmentTypeBadge } from "@/components/assignment-type-badge";
import { DeadlineBadge } from "@/components/deadline-badge";
import { StatusBadge } from "@/components/status-badge";
import { GradeBadge } from "@/components/grade-badge";
import { calculateWeightedScore, scoreToGradeColor } from "@/lib/grade-utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default async function StudentCourseDetailPage({
  params,
}: {
  params: { courseId: string };
}) {
  const user = await requireRole("STUDENT");

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: { studentId: user.id, courseId: params.courseId },
    },
    include: {
      course: {
        include: {
          instructor: { select: { name: true } },
          assignments: {
            include: {
              submissions: {
                where: { studentId: user.id },
                include: { grade: true },
              },
            },
            orderBy: { dueDate: "asc" },
          },
        },
      },
    },
  });

  if (!enrollment || enrollment.status !== "ACTIVE") notFound();

  const { course } = enrollment;
  const totalAssignments = course.assignments.length;
  const submittedCount = course.assignments.filter((a) => a.submissions.length > 0).length;
  const remaining = totalAssignments - submittedCount;

  const gradedItems = course.assignments.flatMap((a) =>
    a.submissions.filter((s) => s.grade).map((s) => ({
      score: (s.grade!.score / a.maxScore) * 100,
      weight: a.weight,
    }))
  );
  const currentScore = gradedItems.length > 0 ? calculateWeightedScore(gradedItems) : null;

  const now = new Date();

  function getAssignmentStatus(a: (typeof course.assignments)[0]) {
    const sub = a.submissions[0];
    if (!sub) {
      if (new Date(a.dueDate) < now) return "NOT_SUBMITTED";
      return null;
    }
    return sub.status;
  }

  function getActionButton(a: (typeof course.assignments)[0]) {
    const sub = a.submissions[0];
    const isPast = new Date(a.dueDate) < now;

    if (sub?.grade) {
      return (
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/student/assignments/${a.id}`}>ดูผล</Link>
        </Button>
      );
    }
    if (sub) {
      return (
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/student/assignments/${a.id}`}>ดูงาน</Link>
        </Button>
      );
    }
    if (isPast && !a.allowLate) {
      return (
        <Button variant="ghost" size="sm" disabled>
          เลย deadline
        </Button>
      );
    }
    return (
      <Button asChild size="sm">
        <Link href={`/dashboard/student/assignments/${a.id}`}>ส่งงาน</Link>
      </Button>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/dashboard/student/courses" className="hover:underline">
            วิชาที่เรียน
          </Link>{" "}
          / {course.code}
        </p>
        <h1 className="text-2xl font-bold">{course.title}</h1>
        <p className="text-sm text-muted-foreground">
          อ.{course.instructor.name} · ภาคเรียน {course.semester}
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">คะแนนรวมปัจจุบัน</p>
            <p className={`text-xl font-bold ${currentScore != null ? scoreToGradeColor(currentScore) : "text-muted-foreground"}`}>
              {currentScore != null ? `${currentScore.toFixed(1)}%` : "-"}
            </p>
            {currentScore != null && <GradeBadge score={currentScore} />}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">ส่งงานแล้ว</p>
            <p className="text-xl font-bold">{submittedCount}/{totalAssignments}</p>
            <Progress value={(submittedCount / (totalAssignments || 1)) * 100} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">งานที่เหลือ</p>
            <p className={`text-xl font-bold ${remaining > 0 ? "text-yellow-600" : "text-green-600"}`}>
              {remaining}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Assignment table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">งานทั้งหมด</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-3 text-left font-medium">ชื่องาน</th>
                  <th className="pb-3 text-left font-medium hidden sm:table-cell">ประเภท</th>
                  <th className="pb-3 text-center font-medium hidden md:table-cell">น้ำหนัก</th>
                  <th className="pb-3 text-left font-medium">Deadline</th>
                  <th className="pb-3 text-center font-medium">สถานะ</th>
                  <th className="pb-3 text-center font-medium">คะแนน</th>
                  <th className="pb-3 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {course.assignments.map((a) => {
                  const sub = a.submissions[0];
                  const status = getAssignmentStatus(a);
                  const scoreDisplay = sub?.grade
                    ? `${sub.grade.score}/${a.maxScore}`
                    : null;

                  return (
                    <tr key={a.id}>
                      <td className="py-3 pr-3">
                        <p className="font-medium">{a.title}</p>
                      </td>
                      <td className="py-3 pr-3 hidden sm:table-cell">
                        <AssignmentTypeBadge type={a.type} />
                      </td>
                      <td className="py-3 text-center hidden md:table-cell text-muted-foreground">
                        {a.weight}%
                      </td>
                      <td className="py-3 pr-3">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(a.dueDate), "d MMM yy", { locale: th })}
                        </p>
                        <DeadlineBadge dueDate={a.dueDate} />
                      </td>
                      <td className="py-3 text-center">
                        {status ? (
                          <StatusBadge status={status} />
                        ) : (
                          <span className="text-xs text-muted-foreground">ยังไม่ส่ง</span>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        {scoreDisplay ? (
                          <span className={`font-semibold ${scoreToGradeColor((sub!.grade!.score / a.maxScore) * 100)}`}>
                            {scoreDisplay}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 text-right">{getActionButton(a)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
