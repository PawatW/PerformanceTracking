"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { saveGrade, getNextSubmission, getPrevSubmission } from "@/app/actions/grades";
import { scoreToGrade, scoreToGradeColor } from "@/lib/grade-utils";

interface RubricCriterion {
  id: string;
  label: string;
  maxPoints: number;
  order: number;
}

interface ExistingGrade {
  score: number;
  instructorNote: string | null;
  privateNote: string | null;
  rubricScores: Record<string, number> | null;
}

interface GradingPanelProps {
  submissionId: string;
  assignmentId: string;
  maxScore: number;
  rubrics: RubricCriterion[];
  existingGrade: ExistingGrade | null;
}

export function GradingPanel({
  submissionId,
  assignmentId,
  maxScore,
  rubrics,
  existingGrade,
}: GradingPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // rubric scores keyed by criterion id
  const [rubricScores, setRubricScores] = useState<Record<string, number>>(() => {
    if (existingGrade?.rubricScores) return existingGrade.rubricScores;
    return Object.fromEntries(rubrics.map((r) => [r.id, 0]));
  });

  // manual total score used when there are no rubrics
  const [manualScore, setManualScore] = useState<number>(existingGrade?.score ?? 0);
  const [instructorNote, setInstructorNote] = useState(existingGrade?.instructorNote ?? "");
  const [privateNote, setPrivateNote] = useState(existingGrade?.privateNote ?? "");

  const hasRubrics = rubrics.length > 0;

  const rubricTotal = useMemo(
    () => rubrics.reduce((sum, r) => sum + (rubricScores[r.id] ?? 0), 0),
    [rubrics, rubricScores]
  );

  const totalScore = hasRubrics ? Math.min(rubricTotal, maxScore) : Math.min(manualScore, maxScore);
  const scorePct = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  async function handleSave() {
    startTransition(async () => {
      const result = await saveGrade(submissionId, {
        rubricScores: hasRubrics ? rubricScores : {},
        instructorNote: instructorNote || undefined,
        privateNote: privateNote || undefined,
        totalScore,
      });
      if (result.success) {
        toast.success("บันทึกคะแนนเรียบร้อย");
        router.refresh();
      } else {
        toast.error(result.error ?? "เกิดข้อผิดพลาด");
      }
    });
  }

  async function navigate(dir: "prev" | "next") {
    const fn = dir === "next" ? getNextSubmission : getPrevSubmission;
    const targetId = await fn(assignmentId, submissionId);
    if (targetId) router.push(`/dashboard/instructor/submissions/${targetId}/grade`);
    else toast.info(dir === "next" ? "นักศึกษาคนสุดท้ายแล้ว" : "นักศึกษาคนแรกแล้ว");
  }

  return (
    <div className="space-y-5">
      {/* Rubric or manual score */}
      {hasRubrics ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold">เกณฑ์การให้คะแนน</p>
          {rubrics.map((r) => (
            <div key={r.id} className="flex items-center gap-3">
              <span className="flex-1 text-sm">{r.label}</span>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  max={r.maxPoints}
                  className="w-20 h-8 text-center"
                  value={rubricScores[r.id] ?? 0}
                  onChange={(e) =>
                    setRubricScores((prev) => ({
                      ...prev,
                      [r.id]: Math.min(r.maxPoints, Math.max(0, Number(e.target.value))),
                    }))
                  }
                />
                <span className="text-xs text-muted-foreground w-10">/{r.maxPoints}</span>
              </div>
            </div>
          ))}
          <div className="flex justify-between border-t pt-2 text-sm font-semibold">
            <span>รวม Rubric</span>
            <span>{rubricTotal}/{rubrics.reduce((s, r) => s + r.maxPoints, 0)}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="manualScore">คะแนน (0–{maxScore})</Label>
          <Input
            id="manualScore"
            type="number"
            min={0}
            max={maxScore}
            value={manualScore}
            onChange={(e) => setManualScore(Math.min(maxScore, Math.max(0, Number(e.target.value))))}
          />
        </div>
      )}

      {/* Total score display */}
      <div className="rounded-xl border bg-muted/30 p-4 text-center space-y-2">
        <p className="text-xs text-muted-foreground">คะแนนรวม</p>
        <p className={`text-4xl font-extrabold ${scoreToGradeColor(scorePct)}`}>
          {totalScore}
          <span className="text-xl text-muted-foreground font-normal">/{maxScore}</span>
        </p>
        <p className={`text-lg font-bold ${scoreToGradeColor(scorePct)}`}>
          {scoreToGrade(scorePct)}
        </p>
        <Progress value={scorePct} className="h-2" />
      </div>

      <Separator />

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="instructorNote">ข้อเสนอแนะ (นักศึกษาเห็นได้)</Label>
        <Textarea
          id="instructorNote"
          rows={3}
          placeholder="ข้อเสนอแนะถึงนักศึกษา..."
          value={instructorNote}
          onChange={(e) => setInstructorNote(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="privateNote" className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          โน้ต private (เฉพาะอาจารย์)
        </Label>
        <Textarea
          id="privateNote"
          rows={2}
          placeholder="โน้ตส่วนตัวสำหรับอาจารย์..."
          value={privateNote}
          onChange={(e) => setPrivateNote(e.target.value)}
        />
      </div>

      {/* Save */}
      <Button className="w-full" onClick={handleSave} disabled={isPending}>
        {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        บันทึกคะแนน
      </Button>

      {/* Navigation */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 gap-1"
          onClick={() => navigate("prev")}
          disabled={isPending}
        >
          <ChevronLeft className="h-4 w-4" />
          ก่อนหน้า
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-1"
          onClick={() => navigate("next")}
          disabled={isPending}
        >
          ถัดไป
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
