import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";

type AssignmentType = "HOMEWORK" | "QUIZ" | "MIDTERM" | "FINAL" | "PROJECT";

const typeConfig: Record<AssignmentType, { label: string; variant: BadgeProps["variant"] }> = {
  HOMEWORK: { label: "การบ้าน", variant: "info" },
  QUIZ: { label: "Quiz", variant: "purple" },
  MIDTERM: { label: "สอบกลางภาค", variant: "warning" },
  FINAL: { label: "สอบปลายภาค", variant: "destructive" },
  PROJECT: { label: "โปรเจกต์", variant: "success" },
};

interface AssignmentTypeBadgeProps {
  type: AssignmentType;
  className?: string;
}

export function AssignmentTypeBadge({ type, className }: AssignmentTypeBadgeProps) {
  const config = typeConfig[type] ?? { label: type, variant: "secondary" as const };
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
