"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Loader2, AlertTriangle, RefreshCw, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { submitAssignment } from "@/app/actions/submissions";
import { scoreToGrade, scoreToGradeColor } from "@/lib/grade-utils";

const schema = z.object({
  fileName: z.string().min(1, "กรุณากรอกชื่อไฟล์"),
  studentNote: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface RubricScore {
  label: string;
  score: number;
  maxPoints: number;
}

interface SubmitPanelProps {
  assignmentId: string;
  isPastDeadline: boolean;
  allowLate: boolean;
  submission: {
    id: string;
    fileName: string | null;
    submittedAt: Date;
    studentNote: string | null;
    status: string;
    isLate: boolean;
    grade: {
      score: number;
      maxScore: number;
      instructorNote: string | null;
      rubricScores: unknown;
      gradedAt: Date;
    } | null;
  } | null;
}

export function SubmitAssignmentPanel({
  assignmentId,
  isPastDeadline,
  allowLate,
  submission,
}: SubmitPanelProps) {
  const [showForm, setShowForm] = useState(!submission);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fileName: submission?.fileName ?? "",
      studentNote: submission?.studentNote ?? "",
    },
  });

  async function onSubmit(data: FormValues) {
    startTransition(async () => {
      const result = await submitAssignment(assignmentId, data);
      if (result.success) {
        toast.success(submission ? "ส่งงานซ้ำเรียบร้อย" : "ส่งงานเรียบร้อย");
        setShowForm(false);
        reset();
      } else {
        toast.error(result.error ?? "เกิดข้อผิดพลาด");
      }
    });
  }

  const isLocked = isPastDeadline && !allowLate;

  // Graded view
  if (submission?.grade && !showForm) {
    const { grade } = submission;
    const pct = Math.min(100, (grade.score / grade.maxScore) * 100);
    const letter = scoreToGrade(pct);
    const color = scoreToGradeColor(pct);

    let rubricRows: RubricScore[] = [];
    if (Array.isArray(grade.rubricScores)) {
      rubricRows = grade.rubricScores as RubricScore[];
    }

    return (
      <div className="space-y-5">
        {/* Score display */}
        <div className="rounded-xl border bg-card p-5 text-center space-y-2">
          <p className="text-sm text-muted-foreground">คะแนนที่ได้</p>
          <p className={`text-5xl font-extrabold ${color}`}>
            {grade.score}
            <span className="text-2xl text-muted-foreground">/{grade.maxScore}</span>
          </p>
          <p className={`text-2xl font-bold ${color}`}>{letter}</p>
          <Progress value={pct} className="h-3" />
          <p className="text-xs text-muted-foreground">
            ตรวจเมื่อ {format(new Date(grade.gradedAt), "d MMM yyyy", { locale: th })}
          </p>
        </div>

        {/* Rubric breakdown */}
        {rubricRows.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Rubric breakdown</p>
            <div className="rounded-lg border divide-y text-sm">
              {rubricRows.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-medium">
                    {r.score}/{r.maxPoints}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructor note */}
        {grade.instructorNote && (
          <div className="rounded-lg border p-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              ข้อเสนอแนะจากอาจารย์
            </p>
            <p className="text-sm">{grade.instructorNote}</p>
          </div>
        )}

        {/* Student's original note */}
        {submission.studentNote && (
          <div className="rounded-lg border p-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              โน้ตของคุณ
            </p>
            <p className="text-sm text-muted-foreground">{submission.studentNote}</p>
          </div>
        )}
      </div>
    );
  }

  // Submitted (not graded) view
  if (submission && !showForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          <p className="font-medium">ส่งงานแล้ว</p>
          {submission.isLate && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
              ส่งช้า
            </span>
          )}
        </div>

        <div className="rounded-lg border divide-y text-sm">
          <div className="flex justify-between px-4 py-3">
            <span className="text-muted-foreground">ไฟล์</span>
            <span className="font-medium">{submission.fileName ?? "-"}</span>
          </div>
          <div className="flex justify-between px-4 py-3">
            <span className="text-muted-foreground">วันที่ส่ง</span>
            <span>{format(new Date(submission.submittedAt), "d MMM yyyy HH:mm", { locale: th })}</span>
          </div>
          {submission.studentNote && (
            <div className="px-4 py-3 space-y-1">
              <p className="text-muted-foreground">โน้ต</p>
              <p>{submission.studentNote}</p>
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground text-center">
          รอผลการตรวจ...
        </p>

        {!isLocked && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <RefreshCw className="h-4 w-4" />
                ส่งซ้ำ
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>ยืนยันการส่งซ้ำ?</AlertDialogTitle>
                <AlertDialogDescription>
                  งานที่ส่งไปก่อนหน้าจะถูกแทนที่ด้วยไฟล์ใหม่
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                <AlertDialogAction onClick={() => setShowForm(true)}>
                  ยืนยัน
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    );
  }

  // Submit form
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {isPastDeadline && allowLate && (
        <div className="flex items-start gap-2 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>เลยกำหนดส่งแล้ว — งานนี้อนุญาตให้ส่งช้าแต่อาจถูกหักคะแนน</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="fileName">ชื่อไฟล์ *</Label>
        <Input
          id="fileName"
          placeholder="เช่น assignment1_student123.pdf"
          {...register("fileName")}
        />
        {errors.fileName && (
          <p className="text-sm text-destructive">{errors.fileName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="studentNote">หมายเหตุถึงอาจารย์</Label>
        <Textarea
          id="studentNote"
          placeholder="เขียนข้อความถึงอาจารย์ (ไม่บังคับ)..."
          rows={3}
          {...register("studentNote")}
        />
      </div>

      <div className="flex gap-2">
        {submission && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowForm(false)}
            disabled={isPending || isSubmitting}
          >
            ยกเลิก
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={isPending || isSubmitting}>
          {(isPending || isSubmitting) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {submission ? "ส่งซ้ำ" : "ส่งงาน"}
        </Button>
      </div>
    </form>
  );
}
