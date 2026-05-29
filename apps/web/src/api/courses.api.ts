import { api } from "./client";
import { Course } from "../types";

export async function getCourses() {
  const { data } = await api.get<{ courses: Course[] }>("/api/courses");
  return data.courses;
}

export async function getCourse(slug: string) {
  const { data } = await api.get<{ course: Course }>(`/api/courses/${slug}`);
  return data.course;
}
