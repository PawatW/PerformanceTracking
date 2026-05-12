import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssignmentTypeBadge } from "@/components/assignment-type-badge";
import { DeadlineBadge } from "@/components/deadline-badge";
import { SubmitAssignmentPanel } from "@/components/submit-assignment-panel";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default async function SubmitAssignmentPage({
  params,
}: {
  params: { assignmentId: string };
}) {
  const user = await requireRole("STUDENT");

  const assignment = await prisma.assignment.findUnique({
    where: { id: params.assignmentId },
    include: {
      course: {
        include: {
          enrollments: { where: { studentId: user.id } },
        },
      },
      rubrics: { orderBy: { order: "asc" } },
      submissions: {
        where: { studentId: user.id },
        include: { grade: true },
      },
    },
  });

  if (!assignment) notFound();

  const isEnrolled = assignment.course.enrollments.some(
    (e) => e.status === "ACTIVE"
  );
  if (!isEnrolled) notFound();

  const submission = assignment.submissions[0] ?? null;
  const now = new Date();
  const isPastDeadline = now > new Date(assignment.dueDate);

  // Shape grade data for the client panel
  const gradeData = submission?.grade
    ? {
        score: submission.grade.score,
        maxScore: assignment.maxScore,
        instructorNote: submission.grade.instructorNote,
        rubricScores: submission.grade.rubricScores,
        gradedAt: submission.grade.gradedAt,
      }
    : null;

  const submissionForPanel = submission
    ? {
        id: submission.id,
        fileName: submission.fileName,
        submittedAt: submission.submittedAt,
        studentNote: submission.studentNote,
        status: submission.status,
        isLate: submission.isLate,
        grade: gradeData,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/dashboard/student/courses" className="hover:underline">
            วิชาที่เรียน
          </Link>{" "}
          /{" "}
          <Link
            href={`/dashboard/student/courses/${assignment.courseId}`}
            className="hover:underline"
          >
            {assignment.course.code}
          </Link>{" "}
          / {assignment.title}
        </p>
        <h1 className="text-2xl font-bold mt-1">{assignment.title}</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Assignment details */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <AssignmentTypeBadge type={assignment.type} />
                <span className="text-sm text-muted-foreground">น้ำหนัก {assignment.weight}%</span>
                <span className="text-sm text-muted-foreground">คะแนนเต็ม {assignment.maxScore}</span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <div>
                  <p className="text-xs text-muted-foreground">กำหนดส่ง</p>
                  <p className="text-sm font-medium">
                    {format(new Date(assignment.dueDate), "EEEE d MMMM yyyy HH:mm", {
                      locale: th,
                    })}
                  </p>
                </div>
                <DeadlineBadge dueDate={assignment.dueDate} />
              </div>
              {assignment.allowLate && (
                <p className="text-xs text-green-600 mt-1">✓ อนุญาตให้ส่งช้า</p>
              )}
            </CardHeader>
            {assignment.description && (
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {assignment.description}
                  </p>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Rubric table */}
          {assignment.rubrics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">เกณฑ์การให้คะแนน (Rubric)</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="pb-2 text-left font-medium">เกณฑ์</th>
                      <th className="pb-2 text-right font-medium">คะแนน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {assignment.rubrics.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2">{r.label}</td>
                        <td className="py-2 text-right font-medium">{r.maxPoints}</td>
                      </tr>
                    ))}
                    <tr className="border-t font-semibold">
                      <td className="pt-2">รวม</td>
                      <td className="pt-2 text-right">
                        {assignment.rubrics.reduce((s, r) => s + r.maxPoints, 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Submit panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {submission?.grade
                  ? "ผลการตรวจ"
                  : submission
                  ? "งานที่ส่ง"
                  : "ส่งงาน"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SubmitAssignmentPanel
                assignmentId={assignment.id}
                isPastDeadline={isPastDeadline}
                allowLate={assignment.allowLate}
                submission={submissionForPanel}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
