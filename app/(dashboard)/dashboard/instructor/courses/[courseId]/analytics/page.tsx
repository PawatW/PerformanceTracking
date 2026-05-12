import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileDown, Users, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { getScoreDistribution, getCompletionRate } from "@/lib/chart-utils";
import { getClassStats, scoreToGrade, scoreToGradeColor } from "@/lib/grade-utils";
import { ScoreDistributionChart, CompletionRateChart } from "@/components/analytics-charts";
import { StudentPerformanceTable } from "@/components/student-performance-table";

export default async function CourseAnalyticsPage({
  params,
}: {
  params: { courseId: string };
}) {
  const user = await requireRole("INSTRUCTOR");

  const course = await prisma.course.findUnique({
    where: { id: params.courseId },
    include: {
      enrollments: {
        where: { status: "ACTIVE" },
        include: {
          student: {
            include: {
              submissions: {
                where: {
                  assignment: { courseId: params.courseId },
                },
                include: { grade: true, assignment: true },
              },
            },
          },
        },
      },
      assignments: {
        include: {
          submissions: {
            include: { grade: true },
          },
        },
        orderBy: { dueDate: "asc" },
      },
    },
  });

  if (!course || course.instructorId !== user.id) notFound();

  const totalStudents = course.enrollments.length;

  // All graded scores as percentages
  const allScores: number[] = [];
  for (const a of course.assignments) {
    for (const sub of a.submissions) {
      if (sub.grade) {
        allScores.push((sub.grade.score / a.maxScore) * 100);
      }
    }
  }

  const stats = getClassStats(allScores);
  const distributionData = getScoreDistribution(allScores);

  // Submission data for completion chart
  const allSubmissions = course.assignments.flatMap((a) =>
    a.submissions.map((s) => ({
      assignmentId: a.id,
      isLate: s.isLate,
      studentId: s.studentId,
    }))
  );
  const completionData = getCompletionRate(
    course.assignments.map((a) => ({ id: a.id, title: a.title, dueDate: a.dueDate })),
    allSubmissions,
    totalStudents
  );

  // Submission rate
  const totalExpected = course.assignments.length * totalStudents;
  const totalSubmitted = course.assignments.reduce((s, a) => s + a.submissions.length, 0);
  const submissionRate = totalExpected > 0 ? (totalSubmitted / totalExpected) * 100 : 0;

  // Per-student summary for performance table
  const studentRows = course.enrollments.map(({ student }) => {
    const studentSubs = student.submissions;
    const gradedSubs = studentSubs.filter((s) => s.grade);
    const totalAssignments = course.assignments.length;
    const missedCount = totalAssignments - studentSubs.length;

    // Weighted score
    let weightedSum = 0;
    let weightSum = 0;
    for (const sub of gradedSubs) {
      const pct = (sub.grade!.score / sub.assignment.maxScore) * 100;
      weightedSum += pct * sub.assignment.weight;
      weightSum += sub.assignment.weight;
    }
    const weightedScore = weightSum > 0 ? weightedSum / weightSum : null;

    const isAtRisk =
      missedCount >= 2 || (weightedScore !== null && weightedScore < 50);

    return {
      id: student.id,
      name: student.name,
      email: student.email,
      yearLevel: student.yearLevel,
      submitted: studentSubs.length,
      graded: gradedSubs.length,
      totalAssignments,
      missedCount,
      weightedScore,
      grade: weightedScore !== null ? scoreToGrade(weightedScore) : null,
      isAtRisk,
    };
  });

  const atRiskCount = studentRows.filter((r) => r.isAtRisk).length;
  const atRiskStudents = studentRows.filter((r) => r.isAtRisk);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href={`/dashboard/instructor/courses/${params.courseId}`}>
            <ArrowLeft className="h-4 w-4" />
            กลับ
          </Link>
        </Button>
        <span className="text-muted-foreground text-sm">/</span>
        <span className="text-sm font-medium">Analytics: {course.code}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{course.code} — {course.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">ภาพรวมผลการเรียน</p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-1.5 self-start">
          <Link href={`/dashboard/instructor/courses/${params.courseId}/report`}>
            <FileDown className="h-4 w-4" />
            ดูรายงาน / Export CSV
          </Link>
        </Button>
      </div>

      {/* Section 1: Metric cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <p className="text-xs text-muted-foreground">คะแนนเฉลี่ย</p>
            </div>
            <p className={`text-2xl font-bold ${stats ? scoreToGradeColor(stats.mean) : ""}`}>
              {stats ? `${stats.mean.toFixed(1)}%` : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground mb-1">สูงสุด / ต่ำสุด</p>
            <p className="text-2xl font-bold">
              <span className="text-green-600">{stats ? stats.highest.toFixed(0) : "—"}</span>
              <span className="text-muted-foreground text-sm font-normal"> / </span>
              <span className="text-red-500">{stats ? stats.lowest.toFixed(0) : "—"}</span>
            </p>
            <p className="text-xs text-muted-foreground">%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <p className="text-xs text-muted-foreground">อัตราการส่งงาน</p>
            </div>
            <p className="text-2xl font-bold">{submissionRate.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <p className="text-xs text-muted-foreground">นักศึกษาเสี่ยง</p>
            </div>
            <p className="text-2xl font-bold text-red-500">
              {atRiskCount}
              <span className="text-sm font-normal text-muted-foreground">/{totalStudents}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Section 2: Score Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">การกระจายคะแนน</CardTitle>
        </CardHeader>
        <CardContent>
          {allScores.length > 0 ? (
            <ScoreDistributionChart data={distributionData} mean={stats?.mean ?? 0} />
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">ยังไม่มีคะแนน</p>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Assignment Completion Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">อัตราการส่งรายงาน (แต่ละชิ้นงาน)</CardTitle>
        </CardHeader>
        <CardContent>
          {course.assignments.length > 0 ? (
            <CompletionRateChart data={completionData} />
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">ยังไม่มีงาน</p>
          )}
        </CardContent>
      </Card>

      {/* Section 4a: At-Risk Alert Panel */}
      {atRiskStudents.length > 0 && (
        <Card className="border-red-200 bg-red-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              นักศึกษาที่ต้องติดตาม ({atRiskStudents.length} คน)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {atRiskStudents.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-red-100 bg-white px-4 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      {s.missedCount >= 2 && (
                        <Badge variant="destructive" className="text-xs">
                          ขาดส่ง {s.missedCount} ชิ้น
                        </Badge>
                      )}
                      {s.weightedScore !== null && s.weightedScore < 50 && (
                        <Badge variant="destructive" className="text-xs ml-1">
                          คะแนน {s.weightedScore.toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                    <Button asChild size="sm" variant="outline" className="text-xs h-7">
                      <Link href={`/dashboard/instructor/courses/${params.courseId}/students/${s.id}`}>
                        ดูคะแนน
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 4b: Student Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            ผลการเรียนรายคน
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StudentPerformanceTable rows={studentRows} courseId={params.courseId} />
        </CardContent>
      </Card>
    </div>
  );
}
