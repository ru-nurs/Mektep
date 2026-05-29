import { BookOpenCheck, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getCourses } from "../api/courses.api";
import CourseCard from "../components/course/CourseCard";
import SiteHeader from "../components/layout/SiteHeader";
import { Course } from "../types";

export default function CourseCatalog() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "my" | "available">("all");

  useEffect(() => {
    getCourses().then(setCourses).catch(() => setCourses([]));
  }, []);

  const myCourses = useMemo(() => courses.slice(0, 2), [courses]);
  const availableCourses = useMemo(() => courses.filter((_, index) => index >= 2), [courses]);
  const baseCourses = tab === "all" ? courses : tab === "my" ? myCourses : availableCourses;
  const shown = useMemo(
    () => baseCourses.filter((c) => `${c.title} ${c.description || ""}`.toLowerCase().includes(search.toLowerCase())),
    [baseCourses, search],
  );

  const tabs = [
    ["all", `Все ${courses.length}`],
    ["my", `Мои ${myCourses.length}`],
    ["available", `Новые ${availableCourses.length}`],
  ] as const;

  return (
    <div className="min-h-screen bg-[#f7fbf7]">
      <SiteHeader />

      <main className="container mx-auto px-4 py-8">
        <section className="mb-7 rounded-lg border border-emerald-100 bg-white p-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                <BookOpenCheck size={16} />
                Библиотека подготовки
              </div>
              <h1 className="text-3xl font-bold text-slate-950 md:text-4xl">Каталог курсов</h1>
              <p className="mt-2 max-w-2xl text-slate-500">
                Здесь только нужные направления для ЕНТ. Выбери курс и иди по темам сверху вниз.
              </p>
            </div>

            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Найти предмет или тему"
                className="h-12 w-full rounded-md border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-emerald-300 focus:bg-white"
              />
            </label>
          </div>
        </section>

        <div className="mb-6 inline-flex rounded-lg border border-slate-200 bg-white p-1">
          {tabs.map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`rounded-md px-3 py-2 text-sm font-semibold ${
                tab === value ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        {shown.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <article className="rounded-lg border border-dashed border-emerald-200 bg-white p-8 text-center">
            <Search className="mx-auto text-emerald-600" size={28} />
            <h2 className="mt-4 text-xl font-semibold text-slate-950">Ничего не найдено</h2>
            <p className="mt-2 text-sm text-slate-500">Попробуй другое слово или открой вкладку “Все”.</p>
          </article>
        )}
      </main>
    </div>
  );
}
