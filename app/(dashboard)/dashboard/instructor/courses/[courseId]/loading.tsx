import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function CourseDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-32 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-10" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
