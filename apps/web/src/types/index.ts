export type Role = "STUDENT" | "TEACHER" | "ADMIN";

export type User = {
  id: string;
  email: string;
  username: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  role: Role;
  xp: number;
  streakDays: number;
  createdAt: string;
};

export type Course = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  category?: string | null;
  modules?: Module[];
};

export type Module = {
  id: string;
  title: string;
  description?: string | null;
  lessons: Lesson[];
};

export type Lesson = {
  id: string;
  title: string;
  slug: string;
  lessonType: "THEORY" | "PRACTICE" | "QUIZ" | "VIDEO";
  xpReward: number;
  durationMin: number;
  blocks?: LessonBlock[];
};

export type LessonBlock = {
  id: string;
  blockType: "text" | "code" | "image" | "video" | "hint" | "source_pdf";
  content: Record<string, unknown>;
};
