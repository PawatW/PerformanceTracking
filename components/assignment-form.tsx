"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AssignmentInput } from "@/app/actions/assignments";

const assignmentTypes = [
  { value: "HOMEWORK", label: "การบ้าน" },
  { value: "QUIZ", label: "Quiz" },
  { value: "MIDTERM", label: "สอบกลางภาค" },
  { value: "FINAL", label: "สอบปลายภาค" },
  { value: "PROJECT", label: "โปรเจกต์" },
] as const;

const schema = z.object({
  title: z.string().min(1, "กรุณากรอกชื่องาน").max(100, "ชื่องานยาวเกินไป"),
  description: z.string().optional(),
  type: z.enum(["HOMEWORK", "QUIZ", "MIDTERM", "FINAL", "PROJECT"]),
  weight: z.coerce.number().min(1, "น้ำหนักต้องมากกว่า 0").max(100),
  maxScore: z.coerce.number().positive("คะแนนเต็มต้องมากกว่า 0"),
  dueDate: z.string().min(1, "กรุณาเลือกวันกำหนดส่ง"),
  allowLate: z.boolean(),
  rubrics: z
    .array(
      z.object({
        label: z.string().min(1, "กรุณากรอกชื่อเกณฑ์"),
        maxPoints: z.coerce.number().positive("คะแนนต้องมากกว่า 0"),
        order: z.number().int().nonnegative(),
      })
    )
    .optional(),
});

type FormValues = z.infer<typeof schema>;

interface AssignmentFormProps {
  courseId: string;
  usedWeight: number;
  defaultValues?: Partial<FormValues>;
  onSubmit: (data: AssignmentInput) => Promise<{ success: boolean; error?: string }>;
  submitLabel?: string;
}

export function AssignmentForm({
  courseId,
  usedWeight,
  defaultValues,
  onSubmit,
  submitLabel = "สร้างงาน",
}: AssignmentFormProps) {
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      type: "HOMEWORK",
      weight: 10,
      maxScore: 100,
      dueDate: "",
      allowLate: false,
      rubrics: [],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "rubrics",
  });

  const watchedWeight = watch("weight") ?? 0;
  const watchedMaxScore = watch("maxScore") ?? 100;
  const watchedRubrics = watch("rubrics") ?? [];
  const rubricTotal = watchedRubrics.reduce((sum, r) => sum + (Number(r.maxPoints) || 0), 0);

  const availableWeight = 100 - usedWeight + (defaultValues?.weight ?? 0);

  async function submit(data: FormValues) {
    const result = await onSubmit({
      ...data,
      rubrics: data.rubrics?.map((r, i) => ({ ...r, order: i })),
    } as AssignmentInput);

    if (result.success) {
      toast.success("บันทึกเรียบร้อย");
      router.push(`/dashboard/instructor/courses/${courseId}`);
      router.refresh();
    } else {
      toast.error(result.error ?? "เกิดข้อผิดพลาด");
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      {/* Basic info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ข้อมูลงาน</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">ชื่องาน *</Label>
            <Input id="title" placeholder="เช่น Lab 1: Hello World" {...register("title")} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">คำอธิบาย</Label>
            <Textarea
              id="description"
              placeholder="รายละเอียดของงาน..."
              rows={3}
              {...register("description")}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>ประเภทงาน *</Label>
              <Select
                defaultValue={defaultValues?.type ?? "HOMEWORK"}
                onValueChange={(val) =>
                  setValue("type", val as FormValues["type"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignmentTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxScore">คะแนนเต็ม *</Label>
              <Input id="maxScore" type="number" min={1} {...register("maxScore")} />
              {errors.maxScore && (
                <p className="text-sm text-destructive">{errors.maxScore.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="weight">
                น้ำหนักคะแนน (%) *{" "}
                <span className="font-normal text-muted-foreground">
                  เหลือ {availableWeight - (watchedWeight > 0 ? watchedWeight : 0)}%
                </span>
              </Label>
              <Input
                id="weight"
                type="number"
                min={1}
                max={availableWeight}
                {...register("weight")}
              />
              {errors.weight && (
                <p className="text-sm text-destructive">{errors.weight.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">วันกำหนดส่ง *</Label>
              <Input id="dueDate" type="datetime-local" {...register("dueDate")} />
              {errors.dueDate && (
                <p className="text-sm text-destructive">{errors.dueDate.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="allowLate"
              defaultChecked={defaultValues?.allowLate ?? false}
              onCheckedChange={(val) => setValue("allowLate", val)}
            />
            <Label htmlFor="allowLate">อนุญาตให้ส่งช้า</Label>
          </div>
        </CardContent>
      </Card>

      {/* Rubric */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            เกณฑ์การให้คะแนน (Rubric){" "}
            <span className="text-sm font-normal text-muted-foreground">
              {rubricTotal > 0 && `รวม ${rubricTotal} / ${watchedMaxScore} คะแนน`}
            </span>
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ label: "", maxPoints: 0, order: fields.length })}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            เพิ่มเกณฑ์
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              ยังไม่มีเกณฑ์การให้คะแนน
            </p>
          )}
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-3">
              <div className="flex-1 space-y-1">
                <Input
                  placeholder={`เกณฑ์ที่ ${index + 1} เช่น ความถูกต้อง`}
                  {...register(`rubrics.${index}.label`)}
                />
                {errors.rubrics?.[index]?.label && (
                  <p className="text-xs text-destructive">
                    {errors.rubrics[index]?.label?.message}
                  </p>
                )}
              </div>
              <div className="w-28 space-y-1">
                <Input
                  type="number"
                  placeholder="คะแนน"
                  min={0}
                  {...register(`rubrics.${index}.maxPoints`)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {rubricTotal > 0 && rubricTotal !== watchedMaxScore && (
            <p className="text-xs text-yellow-600">
              ผลรวม Rubric ({rubricTotal}) ≠ คะแนนเต็ม ({watchedMaxScore})
            </p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          ยกเลิก
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
