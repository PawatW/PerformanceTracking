import { differenceInDays, isPast, isToday, isTomorrow } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface DeadlineBadgeProps {
  dueDate: Date | string;
  className?: string;
}

export function DeadlineBadge({ dueDate, className }: DeadlineBadgeProps) {
  const due = new Date(dueDate);
  const now = new Date();

  if (isPast(due) && !isToday(due)) {
    return (
      <Badge variant="destructive" className={className}>
        เลย deadline แล้ว
      </Badge>
    );
  }

  if (isToday(due)) {
    return (
      <Badge variant="warning" className={className}>
        วันนี้
      </Badge>
    );
  }

  if (isTomorrow(due)) {
    return (
      <Badge variant="warning" className={className}>
        พรุ่งนี้
      </Badge>
    );
  }

  const days = differenceInDays(due, now);

  if (days <= 3) {
    return (
      <Badge variant="warning" className={className}>
        เหลือ {days} วัน
      </Badge>
    );
  }

  if (days <= 7) {
    return (
      <Badge variant="info" className={className}>
        เหลือ {days} วัน
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className={className}>
      เหลือ {days} วัน
    </Badge>
  );
}
