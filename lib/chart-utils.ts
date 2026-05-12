export function getScoreDistribution(
  scores: number[]
): { range: string; count: number; fill: string }[] {
  const buckets = Array.from({ length: 10 }, (_, i) => ({
    range: i === 9 ? "90-100" : `${i * 10}-${i * 10 + 9}`,
    count: 0,
    fill: i < 5 ? "var(--color-danger)" : i < 7 ? "var(--color-warning)" : "var(--color-success)",
  }));

  for (const s of scores) {
    const clamped = Math.min(100, Math.max(0, s));
    const idx = Math.min(9, Math.floor(clamped / 10));
    buckets[idx].count++;
  }

  return buckets;
}

export function getCompletionRate(
  assignments: { id: string; title: string; dueDate: Date }[],
  submissions: { assignmentId: string; isLate: boolean; studentId: string }[],
  totalStudents: number
): { name: string; onTime: number; late: number; missing: number }[] {
  const sorted = [...assignments].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  return sorted.map((a) => {
    const subs = submissions.filter((s) => s.assignmentId === a.id);
    const onTime = subs.filter((s) => !s.isLate).length;
    const late = subs.filter((s) => s.isLate).length;
    const missing = Math.max(0, totalStudents - subs.length);
    const label = a.title.length > 14 ? a.title.slice(0, 14) + "…" : a.title;
    return { name: label, onTime, late, missing };
  });
}

export function getTrendData(
  mySubmissions: {
    assignmentId: string;
    score: number | null;
    maxScore: number;
  }[],
  allSubmissions: {
    assignmentId: string;
    score: number | null;
    maxScore: number;
  }[],
  assignments: { id: string; title: string; dueDate: Date }[]
): { name: string; mine: number | null; avg: number | null }[] {
  const sorted = [...assignments].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  return sorted.map((a) => {
    const mySub = mySubmissions.find((s) => s.assignmentId === a.id);
    const allForA = allSubmissions.filter(
      (s) => s.assignmentId === a.id && s.score != null
    );
    const mine =
      mySub?.score != null
        ? Math.round(((mySub.score / mySub.maxScore) * 100) * 10) / 10
        : null;
    const avg =
      allForA.length > 0
        ? Math.round(
            (allForA.reduce((sum, s) => sum + (s.score! / s.maxScore) * 100, 0) /
              allForA.length) *
              10
          ) / 10
        : null;
    const label = a.title.length > 12 ? a.title.slice(0, 12) + "…" : a.title;
    return { name: label, mine, avg };
  });
}
