import Link from "next/link";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { GradeBadge } from "@/components/grade-badge";
import { calculateWeightedScore, scoreToGradeColor } from "@/lib/grade-utils";
import { Users, ArrowRight, GraduationCap } from "lucide-react";

export default async function StudentCoursesPage() {
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
                where: { studentId: user.id },
                include: { grade: true },
              },
            },
          },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  if (enrollments.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">วิชาที่เรียน</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <GraduationCap className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">ยังไม่ได้ลงทะเบียนในวิชาใด</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">วิชาที่เรียน</h1>
        <p className="text-sm text-muted-foreground mt-1">
          ลงทะเบียน {enrollments.length} วิชา
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {enrollments.map(({ course }) => {
          const totalAssignments = course.assignments.length;
          const submittedCount = course.assignments.filter((a) => a.submissions.length > 0).length;
          const submitPct = totalAssignments > 0 ? (submittedCount / totalAssignments) * 100 : 0;

          const gradedItems = course.assignments.flatMap((a) =>
            a.submissions.filter((s) => s.grade).map((s) => ({
              score: (s.grade!.score / a.maxScore) * 100,
              weight: a.weight,
            }))
          );
          const avgScore = gradedItems.length > 0 ? calculateWeightedScore(gradedItems) : null;

          return (
            <Link
              key={course.id}
              href={`/dashboard/student/courses/${course.id}`}
              className="group block"
            >
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {course.code}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <CardTitle className="text-base mt-2">{course.title}</CardTitle>
                  <CardDescription className="text-xs flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    อ.{course.instructor.name} · ภาค {course.semester}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>งานที่ส่งแล้ว</span>
                      <span>{submittedCount}/{totalAssignments}</span>
                    </div>
                    <Progress value={submitPct} className="h-2" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">คะแนนรวมปัจจุบัน</p>
                      <p className={`text-lg font-bold ${avgScore != null ? scoreToGradeColor(avgScore) : "text-muted-foreground"}`}>
                        {avgScore != null ? `${avgScore.toFixed(1)}%` : "ยังไม่มีคะแนน"}
                      </p>
                    </div>
                    {avgScore != null && <GradeBadge score={avgScore} showScore={false} />}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
