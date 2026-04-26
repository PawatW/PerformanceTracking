import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { updateAssignment } from "@/app/actions/assignments";
import { AssignmentForm } from "@/components/assignment-form";
import { format } from "date-fns";

export default async function EditAssignmentPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireRole("INSTRUCTOR");

  const assignment = await prisma.assignment.findUnique({
    where: { id: params.id },
    include: {
      rubrics: { orderBy: { order: "asc" } },
      course: {
        include: {
          assignments: { select: { id: true, weight: true } },
        },
      },
    },
  });

  if (!assignment || assignment.course.instructorId !== user.id) notFound();

  const usedWeight = assignment.course.assignments
    .filter((a) => a.id !== assignment.id)
    .reduce((sum, a) => sum + a.weight, 0);

  const defaultValues = {
    title: assignment.title,
    description: assignment.description ?? "",
    type: assignment.type,
    weight: assignment.weight,
    maxScore: assignment.maxScore,
    dueDate: format(new Date(assignment.dueDate), "yyyy-MM-dd'T'HH:mm"),
    allowLate: assignment.allowLate,
    rubrics: assignment.rubrics.map((r) => ({
      label: r.label,
      maxPoints: r.maxPoints,
      order: r.order,
    })),
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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
          / แก้ไขงาน
        </p>
        <h1 className="text-2xl font-bold mt-1">แก้ไขงาน</h1>
        <p className="text-sm text-muted-foreground">{assignment.title}</p>
      </div>

      <AssignmentForm
        courseId={assignment.courseId}
        usedWeight={usedWeight}
        defaultValues={defaultValues}
        submitLabel="บันทึกการเปลี่ยนแปลง"
        onSubmit={async (data) => {
          "use server";
          return updateAssignment(params.id, data);
        }}
      />
    </div>
  );
}
