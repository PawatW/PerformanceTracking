import { Badge } from "@/components/ui/badge";
import { scoreToGrade } from "@/lib/grade-utils";
import type { BadgeProps } from "@/components/ui/badge";

function gradeToVariant(grade: string): BadgeProps["variant"] {
  if (grade === "A") return "success";
  if (grade === "B+" || grade === "B") return "info";
  if (grade === "C+" || grade === "C") return "warning";
  if (grade === "D+" || grade === "D") return "orange";
  return "destructive";
}

interface GradeBadgeProps {
  score: number;
  showScore?: boolean;
  className?: string;
}

export function GradeBadge({ score, showScore = false, className }: GradeBadgeProps) {
  const grade = scoreToGrade(score);
  const variant = gradeToVariant(grade);
  return (
    <Badge variant={variant} className={className}>
      {grade}
      {showScore && ` (${score.toFixed(1)})`}
    </Badge>
  );
}
