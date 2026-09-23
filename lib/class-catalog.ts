export const starterClasses: Record<string, string[]> = {
  Nursery: ["Nursery 1", "Nursery 2", "Nursery 3"],
  Primary: ["Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6"],
  "Junior Secondary": ["JSS 1", "JSS 2", "JSS 3"],
  "Senior Secondary": ["SS 1", "SS 2", "SS 3"],
};

export function starterClassNames(sectionName: string) {
  return starterClasses[sectionName] ?? [];
}
