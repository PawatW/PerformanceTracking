"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const rubricSchema = z.object({
  label: z.string().min(1),
  maxPoints: z.number().positive(),
  order: z.number().int().nonnegative(),
});

const assignmentSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  type: z.enum(["HOMEWORK", "QUIZ", "MIDTERM", "FINAL", "PROJECT"]),
  weight: z.number().min(1).max(100),
  maxScore: z.number().positive(),
  dueDate: z.string().datetime(),
  allowLate: z.boolean(),
  rubrics: z.array(rubricSchema).optional(),
});

export type AssignmentInput = z.infer<typeof assignmentSchema>;

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

async function getInstructorOrFail(
  courseId: string
): Promise<ActionResult<{ userId: string }>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "ไม่ได้เข้าสู่ระบบ" };
  if (session.user.role !== "INSTRUCTOR") return { success: false, error: "ไม่มีสิทธิ์" };

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return { success: false, error: "ไม่พบวิชา" };
  if (course.instructorId !== session.user.id) return { success: false, error: "ไม่มีสิทธิ์จัดการวิชานี้" };

  return { success: true, data: { userId: session.user.id } };
}

export async function createAssignment(
  courseId: string,
  rawData: unknown
): Promise<ActionResult<{ id: string }>> {
  const authResult = await getInstructorOrFail(courseId);
  if (!authResult.success) return authResult;

  const parsed = assignmentSchema.safeParse(rawData);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const { rubrics, ...data } = parsed.data;

  const assignment = await prisma.assignment.create({
    data: {
      ...data,
      courseId,
      dueDate: new Date(data.dueDate),
      rubrics: rubrics?.length
        ? { create: rubrics }
        : undefined,
    },
  });

  revalidatePath(`/dashboard/instructor/courses/${courseId}`);
  return { success: true, data: { id: assignment.id } };
}

export async function updateAssignment(
  id: string,
  rawData: unknown
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "ไม่ได้เข้าสู่ระบบ" };
  if (session.user.role !== "INSTRUCTOR") return { success: false, error: "ไม่มีสิทธิ์" };

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: { course: true },
  });
  if (!assignment) return { success: false, error: "ไม่พบงาน" };
  if (assignment.course.instructorId !== session.user.id)
    return { success: false, error: "ไม่มีสิทธิ์แก้ไขงานนี้" };

  const parsed = assignmentSchema.safeParse(rawData);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const { rubrics, ...data } = parsed.data;

  await prisma.$transaction([
    prisma.rubricCriteria.deleteMany({ where: { assignmentId: id } }),
    prisma.assignment.update({
      where: { id },
      data: {
        ...data,
        dueDate: new Date(data.dueDate),
        rubrics: rubrics?.length
          ? { create: rubrics }
          : undefined,
      },
    }),
  ]);

  revalidatePath(`/dashboard/instructor/courses/${assignment.courseId}`);
  revalidatePath(`/dashboard/instructor/assignments/${id}/edit`);
  return { success: true };
}

export async function deleteAssignment(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "ไม่ได้เข้าสู่ระบบ" };
  if (session.user.role !== "INSTRUCTOR") return { success: false, error: "ไม่มีสิทธิ์" };

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: { course: true },
  });
  if (!assignment) return { success: false, error: "ไม่พบงาน" };
  if (assignment.course.instructorId !== session.user.id)
    return { success: false, error: "ไม่มีสิทธิ์ลบงานนี้" };

  await prisma.$transaction([
    prisma.grade.deleteMany({ where: { submission: { assignmentId: id } } }),
    prisma.submission.deleteMany({ where: { assignmentId: id } }),
    prisma.rubricCriteria.deleteMany({ where: { assignmentId: id } }),
    prisma.assignment.delete({ where: { id } }),
  ]);

  revalidatePath(`/dashboard/instructor/courses/${assignment.courseId}`);
  return { success: true };
}
