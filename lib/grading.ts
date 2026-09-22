export function gradeFor(total:number):string {
  if (total >= 70) return "A";
  if (total >= 60) return "B";
  if (total >= 50) return "C";
  if (total >= 45) return "D";
  if (total >= 40) return "E";
  return "F";
}

export function percentage(ca:number, exam:number):number {
  return Math.max(0, Math.min(100, ca + exam));
}
