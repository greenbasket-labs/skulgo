export type GradingBand = {
  min: number;
  grade: string;
};

export const DEFAULT_GRADING_BANDS: GradingBand[] = [
  { min: 70, grade: "A" },
  { min: 60, grade: "B" },
  { min: 50, grade: "C" },
  { min: 45, grade: "D" },
  { min: 40, grade: "E" },
  { min: 0, grade: "F" },
];

export function gradeFor(total: number, bands: GradingBand[] = DEFAULT_GRADING_BANDS): string {
  const score = Math.max(0, Math.min(100, total));
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  return sorted.find(band => score >= band.min)?.grade ?? "F";
}

export function percentage(ca:number, exam:number):number {
  return Math.max(0, Math.min(100, ca + exam));
}
