export function scoreToGrade(score: number): string {
  if (score >= 80) return "A";
  if (score >= 75) return "B+";
  if (score >= 70) return "B";
  if (score >= 65) return "C+";
  if (score >= 60) return "C";
  if (score >= 55) return "D+";
  if (score >= 50) return "D";
  return "F";
}

export function scoreToGradeColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 75) return "text-emerald-600";
  if (score >= 70) return "text-blue-600";
  if (score >= 65) return "text-cyan-600";
  if (score >= 60) return "text-yellow-600";
  if (score >= 55) return "text-orange-600";
  if (score >= 50) return "text-red-500";
  return "text-red-700";
}

export function calculateWeightedScore(
  submissions: { score: number | null; weight: number }[]
): number {
  const totalWeight = submissions.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) return 0;
  const weighted = submissions.reduce((sum, s) => sum + (s.score ?? 0) * s.weight, 0);
  return weighted / totalWeight;
}

export function getClassStats(scores: number[]): {
  mean: number;
  median: number;
  stdDev: number;
  highest: number;
  lowest: number;
} {
  if (scores.length === 0) {
    return { mean: 0, median: 0, stdDev: 0, highest: 0, lowest: 0 };
  }

  const sorted = [...scores].sort((a, b) => a - b);
  const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  return {
    mean: Math.round(mean * 10) / 10,
    median: Math.round(median * 10) / 10,
    stdDev: Math.round(stdDev * 10) / 10,
    highest: sorted[sorted.length - 1],
    lowest: sorted[0],
  };
}
