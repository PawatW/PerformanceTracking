"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const gradeSchema = z.object({
  rubricScores: z.record(z.string(), z.number().nonnegative()),
  instructorNote: z.string().optional(),
  privateNote: z.string().optional(),
  totalScore: z.number().nonnegative(),
});

export type GradeInput = z.infer<typeof gradeSchema>;

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

async function getInstructorForSubmission(submissionId: string) {
  const session = await auth();
  if (!session?.user) return { error: "ไม่ได้เข้าสู่ระบบ" } as const;
  if (session.user.role !== "INSTRUCTOR") return { error: "ไม่มีสิทธิ์" } as const;

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: { include: { course: true } },
      student: true,
    },
  });

  if (!submission) return { error: "ไม่พบงานที่ส่ง" } as const;
  if (submission.assignment.course.instructorId !== session.user.id)
    return { error: "ไม่มีสิทธิ์ตรวจงานนี้" } as const;

  return { submission, userId: session.user.id };
}

export async function saveGrade(submissionId: string, rawData: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await getInstructorForSubmission(submissionId);
  if ("error" in auth) return { success: false, error: auth.error };

  const parsed = gradeSchema.safeParse(rawData);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const { rubricScores, instructorNote, privateNote, totalScore } = parsed.data;
  const { submission, userId } = auth;

  const grade = await prisma.grade.upsert({
    where: { submissionId },
    create: {
      submissionId,
      gradedById: userId,
      score: totalScore,
      rubricScores,
      instructorNote,
      privateNote,
    },
    update: {
      score: totalScore,
      rubricScores,
      instructorNote,
      privateNote,
      gradedById: userId,
    },
  });

  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: "GRADED" },
  });

  // Notify student
  await prisma.notification.create({
    data: {
      userId: submission.studentId,
      type: "GRADE_RELEASED",
      title: "ประกาศผลการตรวจงาน",
      message: `อาจารย์ตรวจงาน "${submission.assignment.title}" ของคุณเรียบร้อยแล้ว`,
      link: `/dashboard/student/assignments/${submission.assignmentId}`,
    },
  });

  revalidatePath(`/dashboard/instructor/assignments/${submission.assignmentId}/submissions`);
  revalidatePath(`/dashboard/instructor/submissions/${submissionId}/grade`);

  return { success: true, data: { id: grade.id } };
}

export async function getNextSubmission(
  assignmentId: string,
  currentSubmissionId: string
): Promise<string | null> {
  const session = await auth();
  if (!session?.user) return null;

  const submissions = await prisma.submission.findMany({
    where: { assignmentId },
    orderBy: { student: { name: "asc" } },
    select: { id: true },
  });

  const idx = submissions.findIndex((s) => s.id === currentSubmissionId);
  if (idx === -1 || idx === submissions.length - 1) return null;
  return submissions[idx + 1].id;
}

export async function getPrevSubmission(
  assignmentId: string,
  currentSubmissionId: string
): Promise<string | null> {
  const session = await auth();
  if (!session?.user) return null;

  const submissions = await prisma.submission.findMany({
    where: { assignmentId },
    orderBy: { student: { name: "asc" } },
    select: { id: true },
  });

  const idx = submissions.findIndex((s) => s.id === currentSubmissionId);
  if (idx <= 0) return null;
  return submissions[idx - 1].id;
}
