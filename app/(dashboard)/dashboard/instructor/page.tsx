import Link from "next/link";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AssignmentTypeBadge } from "@/components/assignment-type-badge";
import { DeadlineBadge } from "@/components/deadline-badge";
import { BookOpen, Users, ClipboardList, AlertCircle, ArrowRight } from "lucide-react";
import { addDays } from "date-fns";

export default async function InstructorDashboardPage() {
  const user = await requireRole("INSTRUCTOR");

  const courses = await prisma.course.findMany({
    where: { instructorId: user.id },
    include: {
      enrollments: { where: { status: "ACTIVE" } },
      assignments: {
        include: {
          submissions: {
            where: { status: { in: ["SUBMITTED", "LATE"] } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalStudents = new Set(
    courses.flatMap((c) => c.enrollments.map((e) => e.studentId))
  ).size;

  const pendingGrading = courses.reduce(
    (sum, c) => sum + c.assignments.reduce((s, a) => s + a.submissions.length, 0),
    0
  );

  const now = new Date();
  const overdueAssignments = courses.reduce(
    (sum, c) =>
      sum + c.assignments.filter((a) => new Date(a.dueDate) < now).length,
    0
  );

  // Urgent: due within 3 days from now
  const urgentDeadline = addDays(now, 3);
  const urgentAssignments = courses.flatMap((c) =>
    c.assignments
      .filter((a) => {
        const due = new Date(a.dueDate);
        return due >= now && due <= urgentDeadline;
      })
      .map((a) => ({ ...a, courseCode: c.code, courseTitle: c.title }))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard อาจารย์</h1>
        <p className="text-muted-foreground text-sm mt-1">ภาพรวมการสอนของคุณ</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{courses.length}</p>
                <p className="text-xs text-muted-foreground">วิชาที่สอน</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{pendingGrading}</p>
                <p className="text-xs text-muted-foreground">งานรอตรวจ</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{totalStudents}</p>
                <p className="text-xs text-muted-foreground">นักศึกษาทั้งหมด</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{overdueAssignments}</p>
                <p className="text-xs text-muted-foreground">งานเลย deadline</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">วิชาที่สอน</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/instructor/courses">ดูทั้งหมด</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-2 text-left font-medium">รหัส</th>
                  <th className="pb-2 text-left font-medium">ชื่อวิชา</th>
                  <th className="pb-2 text-center font-medium">นักศึกษา</th>
                  <th className="pb-2 text-center font-medium">รอตรวจ</th>
                  <th className="pb-2 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {courses.map((course) => {
                  const pending = course.assignments.reduce(
                    (s, a) => s + a.submissions.length,
                    0
                  );
                  return (
                    <tr key={course.id} className="py-2">
                      <td className="py-3 pr-4 font-mono text-xs font-semibold text-blue-600">
                        {course.code}
                      </td>
                      <td className="py-3 pr-4">{course.title}</td>
                      <td className="py-3 text-center">{course.enrollments.length}</td>
                      <td className="py-3 text-center">
                        {pending > 0 ? (
                          <span className="font-semibold text-yellow-600">{pending}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/dashboard/instructor/courses/${course.id}`}>
                            จัดการ <ArrowRight className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {courses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      ยังไม่มีวิชาที่สอน
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Urgent assignments */}
      {urgentAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              งานที่ต้องตรวจด่วน (ครบกำหนดใน 3 วัน)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {urgentAssignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.courseCode} — {a.courseTitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <AssignmentTypeBadge type={a.type} />
                    <DeadlineBadge dueDate={a.dueDate} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
