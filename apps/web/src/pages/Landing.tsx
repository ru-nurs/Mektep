import { ArrowRight, BookOpenCheck, CheckCircle2, Route, Sparkles, Target, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroStudyPath from "../assets/hero-study-path.png";
import SiteHeader from "../components/layout/SiteHeader";

const steps = [
  ["1 маленький урок", "Короткая теория без лишних слов."],
  ["10 вопросов", "Проверка сразу после темы."],
  ["Понятный разбор", "Ошибки превращаются в следующий шаг."],
];

const features = [
  {
    icon: Route,
    title: "Маршрут ЕНТ-140",
    text: "Темы выстроены как путь: ребенок всегда видит, куда нажать дальше.",
  },
  {
    icon: Target,
    title: "Дневная цель",
    text: "Не огромный курс, а один понятный шаг на сегодня.",
  },
  {
    icon: Sparkles,
    title: "AI-наставник",
    text: "Объясняет проще, если тема не зашла с первого раза.",
  },
  {
    icon: Trophy,
    title: "Мягкая мотивация",
    text: "XP, серия дней и рейтинг поддерживают темп без давления.",
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f7fbf7]">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-emerald-100 bg-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-80"
          style={{ backgroundImage: `url(${heroStudyPath})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/35" aria-hidden="true" />

        <div className="container relative mx-auto flex min-h-[calc(100svh-10rem)] items-center px-4 py-16">
          <div className="max-w-2xl">
            <span className="mb-5 inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-white/85 px-3 py-2 text-sm font-medium text-emerald-700">
              <CheckCircle2 size={16} />
              Подготовка к ЕНТ без хаоса
            </span>
            <h1 className="text-5xl font-bold tracking-tight text-slate-950 md:text-7xl">AI-Mektep</h1>
            <p className="mt-5 max-w-xl text-xl leading-8 text-slate-600">
              Простая платформа для школьников: один урок, один тест, один следующий шаг. Все понятно с первого экрана.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 py-3 text-base font-semibold text-white hover:bg-emerald-700"
              >
                Начать маршрут
                <ArrowRight size={18} />
              </button>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white/85 px-5 py-3 text-base font-semibold text-slate-800 hover:bg-white"
              >
                <BookOpenCheck size={18} />
                Я уже учусь
              </button>
            </div>

            <dl className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              {[
                ["232", "урока"],
                ["3 548", "тестов"],
                ["40+", "учеников"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-lg border border-white/80 bg-white/75 p-3">
                  <dt className="text-2xl font-bold text-slate-950">{value}</dt>
                  <dd className="text-sm text-slate-500">{label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section id="how" className="container mx-auto px-4 py-14">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Как это работает</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-950">Ребенок не ищет, что делать. Он просто идет дальше.</h2>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {steps.map(([title, text], index) => (
              <article key={title} className="rounded-lg border border-emerald-100 bg-white p-5">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-emerald-100 font-bold text-emerald-700">
                  {index + 1}
                </div>
                <h3 className="font-semibold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-emerald-100 bg-white">
        <div className="container mx-auto px-4 py-14">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Что уникального</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-950">Минимализм, но не пустота.</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-lg border border-slate-200 bg-white p-5 hover:border-emerald-200">
                  <Icon className="mb-5 text-emerald-600" size={24} />
                  <h3 className="font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{item.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-14">
        <div className="grid gap-6 rounded-lg border border-emerald-100 bg-emerald-600 p-6 text-white md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-3xl font-bold">Начать можно с одного урока.</h2>
            <p className="mt-2 max-w-2xl text-emerald-50">
              Без сложных настроек и длинных объяснений. После регистрации ребенок сразу видит свой первый шаг.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            Создать аккаунт
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      <footer className="border-t border-emerald-100 bg-white">
        <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500 md:flex-row">
          <span className="font-semibold text-slate-900">AI-Mektep</span>
          <p>Платформа для подготовки к ЕНТ.</p>
        </div>
      </footer>
    </div>
  );
}
