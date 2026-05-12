import Link from "next/link";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ClipboardList, ArrowRight } from "lucide-react";

export default async function InstructorCoursesPage() {
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
    orderBy: [{ year: "desc" }, { semester: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">วิชาของฉัน</h1>
        <p className="text-muted-foreground text-sm mt-1">
          รายวิชาทั้งหมดที่คุณเป็นผู้สอน
        </p>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">ยังไม่มีวิชาที่สอน</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const pendingCount = course.assignments.reduce(
              (sum, a) => sum + a.submissions.length,
              0
            );
            return (
              <Link
                key={course.id}
                href={`/dashboard/instructor/courses/${course.id}`}
                className="group block"
              >
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {course.code}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <CardTitle className="text-base mt-2">{course.title}</CardTitle>
                    <CardDescription className="text-xs">
                      ภาคเรียน {course.semester}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {course.enrollments.length} นักศึกษา
                      </span>
                      <span className="flex items-center gap-1.5">
                        <ClipboardList className="h-3.5 w-3.5" />
                        {course.assignments.length} งาน
                      </span>
                    </div>
                    {pendingCount > 0 && (
                      <Badge variant="warning">รอตรวจ {pendingCount} ชิ้น</Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
