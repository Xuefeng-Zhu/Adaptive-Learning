export const EDUCATION_LEVELS = [
  { value: 'high_school', label: 'High School' },
  { value: 'undergraduate', label: 'Undergraduate' },
  { value: 'graduate', label: 'Graduate' },
  { value: 'postgraduate', label: 'Postgraduate' },
  { value: 'professional', label: 'Professional' },
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number]['value'];

export const ADAPTATION_LEVELS = [
  { value: 1, label: 'Beginner', description: 'Plain language, define all jargon, add analogies' },
  { value: 2, label: 'Elementary', description: 'Basic terms with inline definitions' },
  { value: 3, label: 'Intermediate', description: 'Standard terminology, moderate explanations' },
  { value: 4, label: 'Advanced', description: 'Full technical vocabulary, nuances' },
  { value: 5, label: 'Expert', description: 'Precise language, depth over simplification' },
] as const;

export function knowledgeLevelToAdaptation(level: number): number {
  if (level <= 20) return 1;
  if (level <= 40) return 2;
  if (level <= 60) return 3;
  if (level <= 80) return 4;
  return 5;
}

export function educationToDefaultLevel(education: string | null): number {
  switch (education) {
    case 'high_school': return 1;
    case 'undergraduate': return 2;
    case 'graduate': return 3;
    case 'postgraduate': return 4;
    case 'professional': return 3;
    default: return 2;
  }
}
