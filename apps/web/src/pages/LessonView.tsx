import { ArrowLeft, BookOpenCheck, CheckCircle2, LayoutDashboard, MessageCircle, Route } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { completeLesson, getLesson } from "../api/lessons.api";
import AiTutor from "../components/lesson/AiTutor";
import CodeBlock from "../components/lesson/CodeBlock";
import HintBlock from "../components/lesson/HintBlock";
import SourceBlock from "../components/lesson/SourceBlock";
import TextBlock from "../components/lesson/TextBlock";
import VideoBlock from "../components/lesson/VideoBlock";

type Source = {
  label?: string;
  path?: string;
};

function renderBlock(lessonId: string, block: { id: string; blockType: string; content: Record<string, unknown> }) {
  if (block.blockType === "text") {
    const markdown = String(block.content.markdown || "").trim();
    if (!markdown) return null;
    return <TextBlock markdown={markdown} />;
  }

  if (block.blockType === "code") {
    return (
      <CodeBlock
        lessonId={lessonId}
        starterCode={String(block.content.starterCode || "")}
        language={(String(block.content.language || "python") as "python" | "javascript" | "cpp") || "python"}
      />
    );
  }

  if (block.blockType === "video") {
    const url = String(block.content.url || "").trim();
    if (!url) return null;
    return <VideoBlock url={url} />;
  }

  if (block.blockType === "hint") {
    const text = String(block.content.text || "").trim();
    if (!text) return null;
    return <HintBlock text={text} />;
  }

  if (block.blockType === "source_pdf") {
    const sources = Array.isArray(block.content.sources) ? (block.content.sources as Source[]) : [];
    return <SourceBlock sources={sources} />;
  }

  return null;
}

export default function LessonView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getLesson(id).then(setData).catch(() => setData(null));
  }, [id]);

  const blocks = useMemo(() => data?.lesson?.blocks || [], [data]);

  if (!data?.lesson) {
    return <p className="p-8">Урок не найден</p>;
  }

  const courseTitle = data.lesson.module?.course?.title || "Курс";
  const moduleTitle = data.lesson.module?.title || "Модуль";
  const progressValue = data.progress?.status === "COMPLETED" ? 100 : 50;

  return (
    <div className="h-screen overflow-hidden bg-[#f7fbf7]">
      <header className="flex h-16 items-center justify-between border-b border-emerald-100 bg-white px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Назад
          </button>
          <div className="min-w-0">
            <div className="truncate text-xs text-slate-500">
              {courseTitle} / {moduleTitle}
            </div>
            <div className="truncate text-sm font-semibold text-slate-950">{data.lesson.title}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 text-sm text-slate-500 md:flex">
            <span>{progressValue}%</span>
            <div className="h-2 w-28 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${progressValue}%` }} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            <LayoutDashboard size={16} />
            Главная
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        <aside className="hidden w-80 flex-shrink-0 border-r border-emerald-100 bg-white p-4 lg:block">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <Route size={18} />
            Навигация
          </div>
          <button
            onClick={() => navigate(`/courses/${data.lesson.module?.course?.slug || ""}`)}
            type="button"
            className="mb-3 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-semibold text-slate-900 hover:border-emerald-200"
          >
            {courseTitle}
          </button>
          <div className="rounded-lg border border-slate-200 p-4 text-sm">
            <div className="mb-2 text-slate-500">Текущий урок</div>
            <div className="font-semibold text-slate-950">{data.lesson.title}</div>
            <div className="mt-3 h-2 rounded-full bg-slate-100">
              <div className="h-2 w-1/3 rounded-full bg-emerald-500" />
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-3xl p-5 lg:p-8">
            <div className="mb-5 rounded-lg border border-emerald-100 bg-white p-5">
              <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                <BookOpenCheck size={16} />
                Урок
              </div>
              <h1 className="text-3xl font-bold leading-tight text-slate-950">{data.lesson.title}</h1>
              <p className="mt-2 text-sm text-slate-500">
                +{data.lesson.xpReward} XP / {data.lesson.durationMin} мин
              </p>
            </div>

            {blocks.map((block: any) => {
              const content = renderBlock(data.lesson.id, block);
              if (!content) return null;
              return (
                <div key={block.id} className="mb-5 rounded-lg border border-slate-200 bg-white p-5">
                  {content}
                </div>
              );
            })}

            <div className="rounded-lg border border-emerald-100 bg-white p-5">
              <h3 className="font-semibold text-slate-950">Готово?</h3>
              <p className="mt-1 text-sm text-slate-500">Отметь урок как пройденный и переходи к следующему шагу.</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  disabled={completing}
                  onClick={async () => {
                    if (!id) return;
                    setCompleting(true);
                    try {
                      await completeLesson(id);
                      navigate("/dashboard");
                    } finally {
                      setCompleting(false);
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <CheckCircle2 size={16} />
                  Завершить
                </button>
                {data.lesson.lessonType === "QUIZ" && (
                  <button
                    onClick={() => navigate(`/quiz/${data.lesson.id}`)}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                  >
                    К тесту
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>

        <aside className="hidden w-96 flex-shrink-0 border-l border-emerald-100 bg-white xl:block">
          <div className="border-b border-emerald-100 px-4 py-3 text-sm font-semibold text-slate-950">
            <span className="inline-flex items-center gap-2">
              <MessageCircle size={16} className="text-emerald-600" />
              AI-наставник
            </span>
          </div>
          <AiTutor lessonId={data.lesson.id} />
        </aside>
      </div>
    </div>
  );
}
