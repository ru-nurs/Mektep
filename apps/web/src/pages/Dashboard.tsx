import { ArrowRight, BookOpenCheck, Flame, Route, Star, Target, Trophy, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { getCourses } from "../api/courses.api";
import CourseCard from "../components/course/CourseCard";
import SiteHeader from "../components/layout/SiteHeader";
import { useAuthStore } from "../store/authStore";
import { Course } from "../types";

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<{ xp: number; streak: number; completedLessons: number; rank: number } | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    api.get("/api/users/me/stats").then((res) => setStats(res.data)).catch(() => setStats(null));
    getCourses().then(setCourses).catch(() => setCourses([]));
  }, []);

  const welcomeName = useMemo(() => user?.fullName || user?.username || "ученик", [user]);
  const completedLessons = stats?.completedLessons ?? 0;
  const dailyProgress = Math.min(100, completedLessons > 0 ? 66 : 18);

  return (
    <div className="min-h-screen bg-[#f7fbf7]">
      <SiteHeader />

      <main className="container mx-auto px-4 py-8">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-lg border border-emerald-100 bg-white p-6">
            <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <Route size={18} />
              Маршрут ЕНТ-140
            </div>
            <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              Привет, {welcomeName}. Сегодня нужен только один шаг.
            </h1>
            <p className="mt-3 max-w-2xl text-slate-500">
              Открой короткий урок, ответь на вопросы и закрепи тему. Ничего лишнего на экране.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                ["1 урок", "прочитать"],
                ["10 вопросов", "ответить"],
                ["+XP", "получить"],
              ].map(([title, label]) => (
                <div key={title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xl font-bold text-slate-950">{title}</div>
                  <div className="text-sm text-slate-500">{label}</div>
                </div>
              ))}
            </div>

            <div className="mt-7">
              <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                <span>Готовность к дневной цели</span>
                <span>{dailyProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${dailyProgress}%` }} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/courses")}
              className="mt-7 inline-flex items-center gap-2 rounded-md bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Продолжить обучение
              <ArrowRight size={18} />
            </button>
          </div>

          <aside className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <article className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                  <Zap size={20} />
                </span>
                <div>
                  <p className="text-sm text-slate-500">XP</p>
                  <p className="text-2xl font-bold text-slate-950">{stats?.xp ?? 0}</p>
                </div>
              </div>
            </article>
            <article className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-100 text-amber-700">
                  <Flame size={20} />
                </span>
                <div>
                  <p className="text-sm text-slate-500">Дней подряд</p>
                  <p className="text-2xl font-bold text-slate-950">{stats?.streak ?? 0}</p>
                </div>
              </div>
            </article>
            <article className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-sky-100 text-sky-700">
                  <Trophy size={20} />
                </span>
                <div>
                  <p className="text-sm text-slate-500">Место</p>
                  <p className="text-2xl font-bold text-slate-950">#{stats?.rank ?? "-"}</p>
                </div>
              </div>
            </article>
          </aside>
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-950">Твои курсы</h2>
                <p className="text-sm text-slate-500">Выбери карточку и продолжай с ближайшей темы.</p>
              </div>
              <button
                onClick={() => navigate("/courses")}
                className="hidden rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 sm:inline-flex"
                type="button"
              >
                Все курсы
              </button>
            </div>

            {courses.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {courses.slice(0, 4).map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            ) : (
              <article className="rounded-lg border border-dashed border-emerald-200 bg-white p-6">
                <BookOpenCheck className="text-emerald-600" size={28} />
                <h3 className="mt-4 font-semibold text-slate-950">Курсы появятся здесь</h3>
                <p className="mt-2 text-sm text-slate-500">Если список пустой, проверь, что API запущен и база заполнена.</p>
              </article>
            )}
          </div>

          <aside className="space-y-4">
            <article className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2 font-semibold text-slate-950">
                <Target size={20} className="text-emerald-600" />
                Ближайшая цель
              </div>
              <p className="text-sm leading-6 text-slate-500">
                Закрой одну тему полностью: теория плюс тест. Это проще удержать, чем “заниматься два часа”.
              </p>
            </article>

            <article className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2 font-semibold text-slate-950">
                <Star size={20} className="text-amber-500" />
                Достижения
              </div>
              <div className="space-y-2 text-sm">
                {["Первая серия дней", "100 правильных ответов", "Неделя без пропусков"].map((item) => (
                  <div key={item} className="rounded-md bg-slate-50 px-3 py-2 text-slate-600">
                    {item}
                  </div>
                ))}
              </div>
            </article>
          </aside>
        </section>
      </main>
    </div>
  );
}
