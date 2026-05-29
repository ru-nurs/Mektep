import { useEffect, useState } from "react";
import { api } from "../api/client";

export function useProgress(courseSlug?: string) {
  const [progress, setProgress] = useState<{ totalLessons: number; completedLessons: number } | null>(null);

  useEffect(() => {
    if (!courseSlug) return;

    api
      .get(`/api/courses/${courseSlug}/progress`)
      .then((res) => setProgress(res.data))
      .catch(() => setProgress(null));
  }, [courseSlug]);

  return progress;
}
