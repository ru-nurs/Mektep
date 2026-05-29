import { ArrowLeft, BookOpen, CheckCircle2, Clock, FileQuestion, ListChecks, Route } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCourse } from "../api/courses.api";
import SiteHeader from "../components/layout/SiteHeader";
import { getDifficultyMeta } from "../lib/courseUi";
import { Course, Lesson, Module } from "../types";

function extractTopicFromTitle(title: string) {
  const theory = title.match(/^Тема\s+(\d{1,2})[.\s:-]*/i);
  if (theory) {
    return { topicNumber: Number(theory[1]), isTest: false };
  }

  const test = title.match(/^Тест\s+к\s+теме\s+(\d{1,2})[.\s:-]*/i);
  if (test) {
    return { topicNumber: Number(test[1]), isTest: true };
  }

  return null;
}

function compactTopicLessonTitle(title: string, topicNumber: number, isTest: boolean) {
  const cleaned = title.replace(/\s+/g, " ").trim();
  const pattern = isTest
    ? new RegExp(`^Тест\\s+к\\s+теме\\s+${topicNumber}[.\\s:-]*`, "i")
    : new RegExp(`^Тема\\s+${topicNumber}[.\\s:-]*`, "i");

  const tail = cleaned.replace(pattern, "").trim();
  return tail || (isTest ? "Тест" : "Теория");
}

function buildModuleTopics(module: Module) {
  const topicMap = new Map<number, { theory?: Lesson; test?: Lesson }>();
  const others: Lesson[] = [];

  for (const lesson of module.lessons) {
    const parsed = extractTopicFromTitle(lesson.title);
    if (!parsed) {
      others.push(lesson);
      continue;
    }

    if (!topicMap.has(parsed.topicNumber)) {
      topicMap.set(parsed.topicNumber, {});
    }

    const topic = topicMap.get(parsed.topicNumber)!;
    if (parsed.isTest) {
      topic.test = lesson;
    } else {
      topic.theory = lesson;
    }
  }

  const topics = Array.from(topicMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([topicNumber, value]) => ({ topicNumber, ...value }));

  return { topics, others };
}

export default function CourseDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);

  useEffect(() => {
    if (!slug) return;
    getCourse(slug).then(setCourse).catch(() => setCourse(null));
  }, [slug]);

  const totalLessons = useMemo(
    () => (course?.modules || []).reduce((sum, module) => sum + module.lessons.length, 0),
    [course],
  );

  if (!course) {
    return (
      <div className="min-h-screen bg-[#f7fbf7]">
        <SiteHeader />
        <main className="container mx-auto px-4 py-8">
          <article className="rounded-lg border border-slate-200 bg-white p-6">Курс не найден</article>
        </main>
      </div>
    );
  }

  const difficulty = getDifficultyMeta(course.difficulty);

  return (
    <div className="min-h-screen bg-[#f7fbf7]">
      <SiteHeader />

      <main className="container mx-auto px-4 py-8">
        <button
          type="button"
          onClick={() => navigate("/courses")}
          className="mb-5 inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-white hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          К курсам
        </button>

        <section className="mb-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-lg border border-emerald-100 bg-white p-6">
            <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${difficulty.pillClass}`}>
              {difficulty.label}
            </span>
            <h1 className="mt-4 text-3xl font-bold text-slate-950 md:text-4xl">{course.title}</h1>
            <p className="mt-3 max-w-3xl text-slate-500">{course.description}</p>
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2 font-semibold text-slate-950">
              <Route size={20} className="text-emerald-600" />
              Карта курса
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-2xl font-bold text-slate-950">{course.modules?.length || 0}</div>
                <div className="text-sm text-slate-500">модулей</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-2xl font-bold text-slate-950">{totalLessons}</div>
                <div className="text-sm text-slate-500">уроков</div>
              </div>
            </div>
          </aside>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <ListChecks className="text-emerald-600" size={22} />
            <h2 className="text-2xl font-bold text-slate-950">Программа</h2>
          </div>

          <div className="space-y-4">
            {(course.modules || []).map((module, index) => {
              const grouped = buildModuleTopics(module);
              return (
                <article key={module.id} className="rounded-lg border border-slate-200 bg-white p-5">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-emerald-600 text-sm font-bold text-white">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-950">{module.title}</h3>
                      {module.description && <p className="mt-1 text-sm text-slate-500">{module.description}</p>}
                    </div>
                  </div>

                  <div className="space-y-3 lg:pl-12">
                    {grouped.topics.map((topic) => (
                      <div key={topic.topicNumber} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950">
                          <CheckCircle2 size={16} className="text-emerald-600" />
                          Тема {topic.topicNumber}
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                          {topic.theory ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/lessons/${topic.theory?.id}`)}
                              className="flex min-h-20 items-center justify-between gap-3 rounded-md border border-white bg-white px-3 py-3 text-left text-sm hover:border-emerald-200"
                            >
                              <span className="min-w-0">
                                <span className="mb-1 flex items-center gap-2 font-semibold text-slate-950">
                                  <BookOpen size={16} className="text-emerald-600" />
                                  Теория
                                </span>
                                <span className="line-clamp-2 text-slate-500">
                                  {compactTopicLessonTitle(topic.theory.title, topic.topicNumber, false)}
                                </span>
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                <Clock size={14} />
                                {topic.theory.durationMin} мин
                              </span>
                            </button>
                          ) : (
                            <div className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-3 text-sm text-slate-400">
                              Теория не найдена
                            </div>
                          )}

                          {topic.test ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/quiz/${topic.test?.id}`)}
                              className="flex min-h-20 items-center justify-between gap-3 rounded-md border border-white bg-white px-3 py-3 text-left text-sm hover:border-emerald-200"
                            >
                              <span className="min-w-0">
                                <span className="mb-1 flex items-center gap-2 font-semibold text-slate-950">
                                  <FileQuestion size={16} className="text-sky-600" />
                                  Тест
                                </span>
                                <span className="line-clamp-2 text-slate-500">
                                  {compactTopicLessonTitle(topic.test.title, topic.topicNumber, true)}
                                </span>
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                <Clock size={14} />
                                {topic.test.durationMin} мин
                              </span>
                            </button>
                          ) : (
                            <div className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-3 text-sm text-slate-400">
                              Тест не найден
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {grouped.others.map((lesson) => (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => navigate(`/lessons/${lesson.id}`)}
                        className="flex w-full items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-3 text-left text-sm hover:border-emerald-200 hover:bg-slate-50"
                      >
                        <span>{lesson.title}</span>
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <Clock size={14} />
                          {lesson.durationMin} мин
                        </span>
                      </button>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
