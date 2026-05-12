import Link from "next/link";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DeadlineBadge } from "@/components/deadline-badge";
import { StatusBadge } from "@/components/status-badge";
import { AssignmentTypeBadge } from "@/components/assignment-type-badge";
import { scoreToGradeColor } from "@/lib/grade-utils";
import { BookOpen, Send, CheckCircle, TrendingUp } from "lucide-react";
import { addDays, format } from "date-fns";
import { th } from "date-fns/locale";

export default async function StudentDashboardPage() {
  const user = await requireRole("STUDENT");

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: user.id, status: "ACTIVE" },
    include: {
      course: {
        include: {
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

  const allAssignments = enrollments.flatMap((e) =>
    e.course.assignments.map((a) => ({
      ...a,
      courseCode: e.course.code,
      courseTitle: e.course.title,
      courseId: e.course.id,
      submission: a.submissions[0] ?? null,
    }))
  );

  const totalAssignments = allAssignments.length;
  const submitted = allAssignments.filter((a) => a.submission).length;
  const pending = totalAssignments - submitted;

  // weighted average across all graded submissions
  const gradedItems = allAssignments.filter((a) => a.submission?.grade);
  const overallAvg =
    gradedItems.length > 0
      ? gradedItems.reduce((sum, a) => {
          const pct = (a.submission!.grade!.score / a.maxScore) * 100;
          return sum + pct * a.weight;
        }, 0) /
        gradedItems.reduce((sum, a) => sum + a.weight, 0)
      : null;

  // Upcoming: not submitted, due within 7 days, sorted asc
  const now = new Date();
  const soon = addDays(now, 7);
  const upcoming = allAssignments
    .filter((a) => !a.submission && new Date(a.dueDate) <= soon && new Date(a.dueDate) >= now)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Recent results: graded, most recent 5
  const recentGraded = allAssignments
    .filter((a) => a.submission?.grade)
    .sort(
      (a, b) =>
        new Date(b.submission!.grade!.gradedAt).getTime() -
        new Date(a.submission!.grade!.gradedAt).getTime()
    )
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard นักศึกษา</h1>
        <p className="text-sm text-muted-foreground mt-1">ยินดีต้อนรับ, {user.name}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{enrollments.length}</p>
                <p className="text-xs text-muted-foreground">วิชาที่เรียน</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Send className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{pending}</p>
                <p className="text-xs text-muted-foreground">งานที่ต้องส่ง</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{submitted}</p>
                <p className="text-xs text-muted-foreground">ส่งแล้ว</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div>
                <p className={`text-2xl font-bold ${overallAvg != null ? scoreToGradeColor(overallAvg) : ""}`}>
                  {overallAvg != null ? `${overallAvg.toFixed(1)}%` : "-"}
                </p>
                <p className="text-xs text-muted-foreground">คะแนนเฉลี่ยรวม</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming deadlines */}
      {upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">งานใกล้ deadline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.map((a) => (
              <Link
                key={a.id}
                href={`/dashboard/student/assignments/${a.id}`}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.courseCode} — {format(new Date(a.dueDate), "d MMM HH:mm", { locale: th })}
                  </p>
                </div>
                <div className="ml-3 flex items-center gap-2 flex-shrink-0">
                  <AssignmentTypeBadge type={a.type} />
                  <DeadlineBadge dueDate={a.dueDate} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent graded */}
      {recentGraded.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ผลงานล่าสุด</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentGraded.map((a) => {
              const score = a.submission!.grade!.score;
              const pct = Math.min(100, (score / a.maxScore) * 100);
              return (
                <Link
                  key={a.id}
                  href={`/dashboard/student/assignments/${a.id}`}
                  className="block space-y-2 rounded-lg border p-3 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{a.title}</p>
                    <span className={`text-sm font-bold ${scoreToGradeColor(pct)}`}>
                      {score}/{a.maxScore}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{a.courseCode}</p>
                  <Progress value={pct} className="h-2" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      {upcoming.length === 0 && recentGraded.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            ยังไม่มีข้อมูลงาน — เพิ่มรายวิชาหรือรอให้อาจารย์สร้างงาน
          </CardContent>
        </Card>
      )}
    </div>
  );
}
