import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { createAssignment } from "@/app/actions/assignments";
import { AssignmentForm } from "@/components/assignment-form";

export default async function NewAssignmentPage({
  params,
}: {
  params: { courseId: string };
}) {
  const user = await requireRole("INSTRUCTOR");

  const course = await prisma.course.findUnique({
    where: { id: params.courseId },
    include: {
      assignments: { select: { weight: true } },
    },
  });

  if (!course || course.instructorId !== user.id) notFound();

  const usedWeight = course.assignments.reduce((sum, a) => sum + a.weight, 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/dashboard/instructor/courses" className="hover:underline">
            วิชาของฉัน
          </Link>{" "}
          /{" "}
          <Link href={`/dashboard/instructor/courses/${course.id}`} className="hover:underline">
            {course.code}
          </Link>{" "}
          / สร้างงานใหม่
        </p>
        <h1 className="text-2xl font-bold mt-1">สร้างงานใหม่</h1>
        <p className="text-sm text-muted-foreground">
          วิชา {course.title} — น้ำหนักที่ใช้ไปแล้ว {usedWeight}%
        </p>
      </div>

      <AssignmentForm
        courseId={course.id}
        usedWeight={usedWeight}
        submitLabel="สร้างงาน"
        onSubmit={async (data) => {
          "use server";
          return createAssignment(params.courseId, data);
        }}
      />
    </div>
  );
}
