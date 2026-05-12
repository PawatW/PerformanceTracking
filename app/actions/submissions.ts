"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const submitSchema = z.object({
  fileName: z.string().min(1, "กรุณากรอกชื่อไฟล์"),
  studentNote: z.string().optional(),
});

export type SubmitInput = z.infer<typeof submitSchema>;

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function submitAssignment(
  assignmentId: string,
  rawData: unknown
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "ไม่ได้เข้าสู่ระบบ" };
  if (session.user.role !== "STUDENT") return { success: false, error: "ไม่มีสิทธิ์" };

  const parsed = submitSchema.safeParse(rawData);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { course: { include: { enrollments: true } } },
  });

  if (!assignment) return { success: false, error: "ไม่พบงาน" };

  const isEnrolled = assignment.course.enrollments.some(
    (e) => e.studentId === session.user.id && e.status === "ACTIVE"
  );
  if (!isEnrolled) return { success: false, error: "คุณไม่ได้ลงทะเบียนในวิชานี้" };

  const now = new Date();
  const isPastDeadline = now > new Date(assignment.dueDate);

  if (isPastDeadline && !assignment.allowLate) {
    return { success: false, error: "เลยกำหนดส่งแล้ว และงานนี้ไม่อนุญาตให้ส่งช้า" };
  }

  const existing = await prisma.submission.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId: session.user.id } },
  });

  let submission;
  if (existing) {
    submission = await prisma.submission.update({
      where: { id: existing.id },
      data: {
        fileName: parsed.data.fileName,
        fileUrl: `https://storage.example.com/submissions/${assignmentId}/${session.user.id}/${parsed.data.fileName}`,
        studentNote: parsed.data.studentNote,
        submittedAt: now,
        status: isPastDeadline ? "LATE" : "SUBMITTED",
        isLate: isPastDeadline,
      },
    });
  } else {
    submission = await prisma.submission.create({
      data: {
        assignmentId,
        studentId: session.user.id,
        fileName: parsed.data.fileName,
        fileUrl: `https://storage.example.com/submissions/${assignmentId}/${session.user.id}/${parsed.data.fileName}`,
        studentNote: parsed.data.studentNote,
        status: isPastDeadline ? "LATE" : "SUBMITTED",
        isLate: isPastDeadline,
      },
    });
  }

  revalidatePath(`/dashboard/student/assignments/${assignmentId}`);
  revalidatePath(`/dashboard/student/courses/${assignment.courseId}`);
  revalidatePath(`/dashboard/student`);

  return { success: true, data: { id: submission.id } };
}
