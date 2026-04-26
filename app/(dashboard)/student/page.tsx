import { requireRole } from "@/lib/auth-utils";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";

export default async function StudentDashboardPage() {
  await requireRole("STUDENT");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard นักศึกษา</h1>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <GraduationCap className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">ส่วนนี้จะพัฒนาต่อไป</p>
        </CardContent>
      </Card>
    </div>
  );
}
