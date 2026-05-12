import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssignmentTypeBadge } from "@/components/assignment-type-badge";
import { DeadlineBadge } from "@/components/deadline-badge";
import { SubmissionsFilter } from "@/components/submissions-filter";
import { Suspense } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default async function SubmissionsListPage({
  params,
}: {
  params: { assignmentId: string };
}) {
  const user = await requireRole("INSTRUCTOR");

  const assignment = await prisma.assignment.findUnique({
    where: { id: params.assignmentId },
    include: {
      course: {
        include: {
          enrollments: {
            where: { status: "ACTIVE" },
            include: { student: true },
          },
        },
      },
      submissions: {
        include: { grade: true, student: true },
      },
    },
  });

  if (!assignment || assignment.course.instructorId !== user.id) notFound();

  const submissionMap = new Map(assignment.submissions.map((s) => [s.studentId, s]));

  // Build one row per enrolled student
  const rows = assignment.course.enrollments.map(({ student }) => {
    const sub = submissionMap.get(student.id);
    return {
      studentId: student.id,
      name: student.name,
      email: student.email,
      yearLevel: student.yearLevel,
      submissionId: sub?.id ?? null,
      submittedAt: sub?.submittedAt ?? null,
      status: (sub?.status ?? "NOT_SUBMITTED") as
        | "SUBMITTED"
        | "LATE"
        | "NOT_SUBMITTED"
        | "GRADED",
      score: sub?.grade?.score ?? null,
      maxScore: assignment.maxScore,
      isLate: sub?.isLate ?? false,
    };
  });

  const total = rows.length;
  const submitted = rows.filter((r) => r.status !== "NOT_SUBMITTED").length;
  const pending = rows.filter((r) => r.status === "SUBMITTED" || r.status === "LATE").length;
  const graded = rows.filter((r) => r.status === "GRADED").length;
  const notSubmitted = rows.filter((r) => r.status === "NOT_SUBMITTED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/dashboard/instructor/courses" className="hover:underline">
            วิชาของฉัน
          </Link>{" "}
          /{" "}
          <Link
            href={`/dashboard/instructor/courses/${assignment.courseId}`}
            className="hover:underline"
          >
            {assignment.course.code}
          </Link>{" "}
          / งานที่ส่ง
        </p>
        <h1 className="text-2xl font-bold mt-1">{assignment.title}</h1>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <AssignmentTypeBadge type={assignment.type} />
          <span className="text-sm text-muted-foreground">
            กำหนดส่ง {format(new Date(assignment.dueDate), "d MMM yyyy HH:mm", { locale: th })}
          </span>
          <DeadlineBadge dueDate={assignment.dueDate} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "ส่งแล้ว", value: submitted, color: "text-blue-600" },
          { label: "ยังไม่ส่ง", value: notSubmitted, color: "text-gray-500" },
          { label: "รอตรวจ", value: pending, color: "text-yellow-600" },
          { label: "ตรวจแล้ว", value: graded, color: "text-green-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <p className={`text-2xl font-bold ${s.color}`}>
                {s.value}
                <span className="text-sm font-normal text-muted-foreground">/{total}</span>
              </p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filterable table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">รายชื่อนักศึกษา</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense>
            <SubmissionsFilter rows={rows} assignmentId={params.assignmentId} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
