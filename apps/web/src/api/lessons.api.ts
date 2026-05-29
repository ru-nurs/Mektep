import { api } from "./client";

export async function getLesson(lessonId: string) {
  const { data } = await api.get(`/api/lessons/${lessonId}`);
  return data;
}

export async function completeLesson(lessonId: string) {
  const { data } = await api.post(`/api/lessons/${lessonId}/complete`);
  return data;
}
