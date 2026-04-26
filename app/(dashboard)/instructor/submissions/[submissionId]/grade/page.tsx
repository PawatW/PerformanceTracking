import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { AssignmentTypeBadge } from "@/components/assignment-type-badge";
import { GradingPanel } from "@/components/grading-panel";
import { Download, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default async function GradeSubmissionPage({
  params,
}: {
  params: { submissionId: string };
}) {
  const user = await requireRole("INSTRUCTOR");

  const submission = await prisma.submission.findUnique({
    where: { id: params.submissionId },
    include: {
      student: true,
      grade: true,
      assignment: {
        include: {
          rubrics: { orderBy: { order: "asc" } },
          course: true,
        },
      },
    },
  });

  if (!submission || submission.assignment.course.instructorId !== user.id) notFound();

  const { student, assignment, grade } = submission;

  // Shape existing grade rubric scores for client
  const existingGrade = grade
    ? {
        score: grade.score,
        instructorNote: grade.instructorNote,
        privateNote: grade.privateNote,
        rubricScores: grade.rubricScores as Record<string, number> | null,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href={`/dashboard/instructor/assignments/${assignment.id}/submissions`}>
            <ArrowLeft className="h-4 w-4" />
            กลับ
          </Link>
        </Button>
        <span className="text-muted-foreground text-sm">/</span>
        <span className="text-sm font-medium">ตรวจงาน: {assignment.title}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left column: student info */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="text-base bg-primary/10 text-primary">
                    {initials(student.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg leading-tight">{student.name}</p>
                  <p className="text-sm text-muted-foreground">{student.email}</p>
                  {student.yearLevel && (
                    <p className="text-xs text-muted-foreground">{student.yearLevel}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">วันที่ส่ง</p>
                  <p className="text-sm font-medium">
                    {format(new Date(submission.submittedAt), "d MMMM yyyy HH:mm", { locale: th })}
                  </p>
                </div>
                <StatusBadge status={submission.status} />
              </div>

              {/* File */}
              {submission.fileName && (
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
                  <span className="text-sm font-medium">{submission.fileName}</span>
                  <Button variant="ghost" size="icon" asChild>
                    <a href={submission.fileUrl ?? "#"} download={submission.fileName}>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              )}

              {/* Student note */}
              {submission.studentNote && (
                <div className="rounded-lg bg-muted/40 px-4 py-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    หมายเหตุจากนักศึกษา
                  </p>
                  <p className="text-sm">{submission.studentNote}</p>
                </div>
              )}

              <Separator />

              {/* Assignment info */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  ข้อมูลงาน
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <AssignmentTypeBadge type={assignment.type} />
                  <span className="text-sm text-muted-foreground">น้ำหนัก {assignment.weight}%</span>
                </div>
                <p className="text-sm">
                  <span className="text-muted-foreground">คะแนนเต็ม: </span>
                  <span className="font-semibold">{assignment.maxScore}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">วิชา: </span>
                  {assignment.course.code} — {assignment.course.title}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: grading panel (sticky) */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ให้คะแนน</CardTitle>
              </CardHeader>
              <CardContent>
                <GradingPanel
                  submissionId={submission.id}
                  assignmentId={assignment.id}
                  maxScore={assignment.maxScore}
                  rubrics={assignment.rubrics}
                  existingGrade={existingGrade}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
