import type { Course } from "../types";

export const difficultyMeta: Record<
  Course["difficulty"],
  { label: string; pillClass: string; barClass: string }
> = {
  BEGINNER: {
    label: "Старт",
    pillClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    barClass: "bg-emerald-500",
  },
  INTERMEDIATE: {
    label: "Средний",
    pillClass: "border-sky-200 bg-sky-50 text-sky-700",
    barClass: "bg-sky-500",
  },
  ADVANCED: {
    label: "Сложный",
    pillClass: "border-amber-200 bg-amber-50 text-amber-700",
    barClass: "bg-amber-500",
  },
};

export function getDifficultyMeta(difficulty: Course["difficulty"]) {
  return difficultyMeta[difficulty] || difficultyMeta.BEGINNER;
}
