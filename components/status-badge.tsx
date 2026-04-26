import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";

type SubmissionStatus = "SUBMITTED" | "LATE" | "NOT_SUBMITTED" | "GRADED";

const statusConfig: Record<SubmissionStatus, { label: string; variant: BadgeProps["variant"] }> = {
  SUBMITTED: { label: "ส่งแล้ว", variant: "info" },
  LATE: { label: "ส่งช้า", variant: "warning" },
  NOT_SUBMITTED: { label: "ยังไม่ส่ง", variant: "destructive" },
  GRADED: { label: "ตรวจแล้ว", variant: "success" },
};

interface StatusBadgeProps {
  status: SubmissionStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, variant: "secondary" as const };
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
