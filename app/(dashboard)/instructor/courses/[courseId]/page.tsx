import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssignmentTypeBadge } from "@/components/assignment-type-badge";
import { DeadlineBadge } from "@/components/deadline-badge";
import { GradeBadge } from "@/components/grade-badge";
import { scoreToGrade, calculateWeightedScore } from "@/lib/grade-utils";
import { Plus, Eye } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default async function CourseDetailPage({
  params,
}: {
  params: { courseId: string };
}) {
  const user = await requireRole("INSTRUCTOR");

  const course = await prisma.course.findUnique({
    where: { id: params.courseId },
    include: {
      assignments: {
        include: {
          submissions: {
            include: { grade: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      enrollments: {
        where: { status: "ACTIVE" },
        include: { student: true },
      },
    },
  });

  if (!course || course.instructorId !== user.id) notFound();

  const totalStudents = course.enrollments.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/dashboard/instructor/courses" className="hover:underline">
              วิชาของฉัน
            </Link>{" "}
            / {course.code}
          </p>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className="text-sm text-muted-foreground">ภาคเรียน {course.semester}</p>
        </div>
        <Button asChild>
          <Link href={`/dashboard/instructor/courses/${course.id}/assignments/new`}>
            <Plus className="h-4 w-4 mr-1" />
            สร้างงานใหม่
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="assignments">
        <TabsList>
          <TabsTrigger value="assignments">งานทั้งหมด ({course.assignments.length})</TabsTrigger>
          <TabsTrigger value="students">นักศึกษา ({totalStudents})</TabsTrigger>
        </TabsList>

        {/* Tab: Assignments */}
        <TabsContent value="assignments">
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="pb-3 text-left font-medium">ชื่องาน</th>
                      <th className="pb-3 text-left font-medium">ประเภท</th>
                      <th className="pb-3 text-center font-medium">น้ำหนัก</th>
                      <th className="pb-3 text-left font-medium">Deadline</th>
                      <th className="pb-3 text-center font-medium">ส่งแล้ว</th>
                      <th className="pb-3 text-right font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {course.assignments.map((a) => {
                      const submitted = a.submissions.length;
                      const graded = a.submissions.filter((s) => s.grade).length;
                      const pending = submitted - graded;
                      return (
                        <tr key={a.id}>
                          <td className="py-3 pr-4">
                            <p className="font-medium">{a.title}</p>
                            {pending > 0 && (
                              <p className="text-xs text-yellow-600">รอตรวจ {pending} ชิ้น</p>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <AssignmentTypeBadge type={a.type} />
                          </td>
                          <td className="py-3 text-center">{a.weight}%</td>
                          <td className="py-3 pr-4">
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(a.dueDate), "d MMM yy HH:mm", { locale: th })}
                              </p>
                              <DeadlineBadge dueDate={a.dueDate} />
                            </div>
                          </td>
                          <td className="py-3 text-center">
                            <span className={submitted > 0 ? "font-medium" : "text-muted-foreground"}>
                              {submitted}/{totalStudents}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button asChild variant="ghost" size="sm">
                                <Link href={`/dashboard/instructor/assignments/${a.id}/submissions`}>
                                  <Eye className="h-3.5 w-3.5 mr-1" />
                                  ผลงาน
                                </Link>
                              </Button>
                              <Button asChild variant="ghost" size="sm">
                                <Link href={`/dashboard/instructor/assignments/${a.id}/edit`}>
                                  แก้ไข
                                </Link>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {course.assignments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-muted-foreground">
                          ยังไม่มีงาน —{" "}
                          <Link
                            href={`/dashboard/instructor/courses/${course.id}/assignments/new`}
                            className="text-primary hover:underline"
                          >
                            สร้างงานแรก
                          </Link>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Students */}
        <TabsContent value="students">
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="pb-3 text-left font-medium">ชื่อ</th>
                      <th className="pb-3 text-left font-medium">ชั้นปี</th>
                      <th className="pb-3 text-center font-medium">ส่งงาน</th>
                      <th className="pb-3 text-center font-medium">คะแนนรวม</th>
                      <th className="pb-3 text-center font-medium">เกรดประมาณ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {course.enrollments.map(({ student }) => {
                      const studentSubmissions = course.assignments.flatMap((a) =>
                        a.submissions.filter((s) => s.studentId === student.id)
                      );
                      const gradedSubs = studentSubmissions.filter((s) => s.grade);
                      const submittedCount = studentSubmissions.length;
                      const totalAssignments = course.assignments.length;

                      const weightedInputs = gradedSubs.map((s) => {
                        const assignment = course.assignments.find((a) =>
                          a.submissions.some((sub) => sub.id === s.id)
                        );
                        return {
                          score: s.grade ? (s.grade.score / (assignment?.maxScore ?? 100)) * 100 : null,
                          weight: assignment?.weight ?? 0,
                        };
                      });

                      const avgScore =
                        weightedInputs.length > 0
                          ? calculateWeightedScore(
                              weightedInputs.filter((w) => w.score !== null) as {
                                score: number;
                                weight: number;
                              }[]
                            )
                          : null;

                      return (
                        <tr key={student.id}>
                          <td className="py-3 pr-4">
                            <Link
                              href={`/dashboard/instructor/courses/${course.id}/students/${student.id}`}
                              className="font-medium hover:underline text-primary"
                            >
                              {student.name}
                            </Link>
                            <p className="text-xs text-muted-foreground">{student.email}</p>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {student.yearLevel ?? "-"}
                          </td>
                          <td className="py-3 text-center">
                            {submittedCount}/{totalAssignments}
                          </td>
                          <td className="py-3 text-center">
                            {avgScore != null ? `${avgScore.toFixed(1)}%` : "-"}
                          </td>
                          <td className="py-3 text-center">
                            {avgScore != null ? (
                              <GradeBadge score={avgScore} />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {course.enrollments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-muted-foreground">
                          ยังไม่มีนักศึกษาลงทะเบียน
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
