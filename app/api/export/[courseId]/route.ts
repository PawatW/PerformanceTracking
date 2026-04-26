import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { courseId: string } }
) {
  const user = await requireRole("INSTRUCTOR");

  const course = await prisma.course.findUnique({
    where: { id: params.courseId },
    include: {
      assignments: { orderBy: { dueDate: "asc" } },
      enrollments: {
        where: { status: "ACTIVE" },
        include: {
          student: {
            include: {
              submissions: {
                where: { assignment: { courseId: params.courseId } },
                include: { grade: true, assignment: true },
              },
            },
          },
        },
      },
    },
  });

  if (!course || course.instructorId !== user.id) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const assignments = course.assignments;

  // Build CSV header
  const assignmentHeaders = assignments.map((a) => `"${a.title} (/${a.maxScore})"`).join(",");
  const header = `ชื่อ,อีเมล,ชั้นปี,${assignmentHeaders},คะแนนรวม (weighted),เกรด\n`;

  // Build rows
  const rows = course.enrollments.map(({ student }) => {
    const subMap = new Map(
      student.submissions.map((s) => [s.assignmentId, s])
    );

    const scoreColumns = assignments.map((a) => {
      const sub = subMap.get(a.id);
      if (!sub?.grade) return "";
      return `${sub.grade.score}`;
    });

    // Weighted score
    let weightedSum = 0;
    let weightSum = 0;
    for (const a of assignments) {
      const sub = subMap.get(a.id);
      if (sub?.grade) {
        const pct = (sub.grade.score / a.maxScore) * 100;
        weightedSum += pct * a.weight;
        weightSum += a.weight;
      }
    }
    const weightedScore = weightSum > 0 ? weightedSum / weightSum : null;

    function toGrade(score: number) {
      if (score >= 80) return "A";
      if (score >= 75) return "B+";
      if (score >= 70) return "B";
      if (score >= 65) return "C+";
      if (score >= 60) return "C";
      if (score >= 55) return "D+";
      if (score >= 50) return "D";
      return "F";
    }

    const grade = weightedScore !== null ? toGrade(weightedScore) : "";
    const weightedDisplay = weightedScore !== null ? weightedScore.toFixed(2) : "";

    const name = `"${student.name.replace(/"/g, '""')}"`;
    const email = `"${student.email}"`;
    const yearLevel = `"${student.yearLevel ?? ""}"`;

    return `${name},${email},${yearLevel},${scoreColumns.join(",")},${weightedDisplay},${grade}`;
  });

  const csv = header + rows.join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${course.code}-grades.csv"`,
    },
  });
}
