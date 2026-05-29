import { create } from "zustand";

type LessonState = {
  currentLessonId: string | null;
  setCurrentLessonId: (id: string) => void;
};

export const useLessonStore = create<LessonState>((set) => ({
  currentLessonId: null,
  setCurrentLessonId: (id) => set({ currentLessonId: id }),
}));
