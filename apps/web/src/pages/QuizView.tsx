import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  Keyboard,
  Lightbulb,
  RotateCcw,
  Square,
  XCircle,
} from "lucide-react";
import { KeyboardEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { sendAiMessage } from "../api/ai.api";
import { api } from "../api/client";
import SiteHeader from "../components/layout/SiteHeader";

type QuestionType = "SINGLE" | "MULTIPLE" | "TEXT_INPUT";

type Option = {
  id: string;
  text: string;
};

type SelectedOption = {
  optionIndex: number;
  optionId: string;
};

type Question = {
  id: string;
  question: string;
  questionType: QuestionType;
  options: Option[];
};

type CheckResult = {
  isCorrect: boolean;
  correctOptions: Array<{ id: string; text: string; optionIndex: number }>;
  correctAnswer: string;
  explanation?: string;
};

function isSelected(answer: unknown, optionIndex: number) {
  if (Array.isArray(answer)) {
    return answer.some((item) => typeof item === "object" && item !== null && (item as SelectedOption).optionIndex === optionIndex);
  }

  return typeof answer === "object" && answer !== null && (answer as SelectedOption).optionIndex === optionIndex;
}

function hasAnswer(question: Question, answer: unknown) {
  if (question.questionType === "TEXT_INPUT") {
    return typeof answer === "string" && answer.trim().length > 0;
  }

  if (question.questionType === "MULTIPLE") {
    return Array.isArray(answer) && answer.length > 0;
  }

  return Boolean(answer);
}

function selectedIndexes(answer: unknown) {
  if (Array.isArray(answer)) {
    return answer
      .map((item) => (typeof item === "object" && item !== null ? Number((item as SelectedOption).optionIndex) : Number.NaN))
      .filter(Number.isInteger);
  }

  if (typeof answer === "object" && answer !== null) {
    const index = Number((answer as SelectedOption).optionIndex);
    return Number.isInteger(index) ? [index] : [];
  }

  return [];
}

function hasWrongSelectedAnswer(answer: unknown, check?: CheckResult) {
  if (!check) return false;
  return selectedIndexes(answer).some((index) => !check.correctOptions.some((option) => option.optionIndex === index));
}

function isQuestionLocked(question: Question, answer: unknown, check?: CheckResult) {
  if (!check) return false;
  if (question.questionType !== "MULTIPLE") return true;
  return check.isCorrect || hasWrongSelectedAnswer(answer, check);
}

function canChooseOption(question: Question, answer: unknown, optionIndex: number, check?: CheckResult) {
  if (isQuestionLocked(question, answer, check)) return false;
  if (question.questionType === "MULTIPLE") return !isSelected(answer, optionIndex);
  return !check;
}

function optionState(answer: unknown, optionIndex: number, check?: CheckResult) {
  const selected = isSelected(answer, optionIndex);

  if (!selected) {
    return "border-slate-200 bg-white text-slate-600 hover:border-emerald-200";
  }

  if (!check) {
    return "border-slate-300 bg-slate-50 text-slate-950";
  }

  const correct = check.correctOptions.some((option) => option.optionIndex === optionIndex);
  return correct ? "border-emerald-400 bg-emerald-50 text-slate-950" : "border-rose-300 bg-rose-50 text-slate-950";
}

function optionBadge(answer: unknown, optionIndex: number, check?: CheckResult) {
  const selected = isSelected(answer, optionIndex);

  if (!selected) return "bg-slate-100 text-slate-500";
  if (!check) return "bg-slate-800 text-white";

  const correct = check.correctOptions.some((option) => option.optionIndex === optionIndex);
  return correct ? "bg-emerald-600 text-white" : "bg-rose-600 text-white";
}

function feedbackText(question: Question, answer: unknown, check?: CheckResult) {
  if (!check) return null;

  if (question.questionType === "MULTIPLE") {
    const selected = selectedIndexes(answer);
    const correctSelected = selected.filter((index) => check.correctOptions.some((option) => option.optionIndex === index));
    const wrongSelected = selected.length - correctSelected.length;

    if (check.isCorrect) return { good: true, title: "Верно", text: "Все выбранные варианты подходят." };
    if (wrongSelected > 0) return { good: false, title: "Есть неверный вариант", text: "Убери красный вариант и возьми подсказку, если застрял." };
    return { good: true, title: "Пока хорошо", text: "Выбранный вариант подходит. Возможно, нужно выбрать ещё один ответ." };
  }

  if (question.questionType === "TEXT_INPUT") {
    return check.isCorrect
      ? { good: true, title: "Верно", text: "Соответствие записано правильно." }
      : { good: false, title: "Неверно", text: "Проверь пары ещё раз или возьми AI-подсказку." };
  }

  return check.isCorrect
    ? { good: true, title: "Верно", text: "Можно идти дальше." }
    : { good: false, title: "Неверно", text: "Попробуй понять, почему этот вариант не подходит. Можно взять AI-подсказку." };
}

function formatOptions(options: Option[]) {
  return options.map((option, index) => `${String.fromCharCode(65 + index)}) ${option.text}`).join("\n");
}

export default function QuizView() {
  const navigate = useNavigate();
  const { lessonId } = useParams();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [checks, setChecks] = useState<Record<string, CheckResult>>({});
  const [aiHints, setAiHints] = useState<Record<string, string[]>>({});
  const [hintLoadingId, setHintLoadingId] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [result, setResult] = useState<{ score: number; correctCount: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId) return;
    setLoading(true);
    setLoadError(null);
    api
      .get(`/api/quiz/${lessonId}/questions`)
      .then((res) => {
        const list = (res.data.questions || []).map((item: any) => ({
          id: item.id,
          question: item.question,
          questionType: item.questionType || "SINGLE",
          options: (item.options || []).map((opt: any) => ({ id: opt.id, text: opt.text })),
        }));
        setQuestions(list);
      })
      .catch((error) => {
        setQuestions([]);
        setLoadError(error?.response?.data?.error || "Не удалось загрузить тест. Проверьте, что API запущен на порту 3001.");
      })
      .finally(() => setLoading(false));
  }, [lessonId]);

  const current = useMemo(() => questions[index], [questions, index]);
  const currentAnswer = current ? answers[current.id] : undefined;
  const currentCheck = current ? checks[current.id] : undefined;
  const progress = questions.length ? Math.round(((index + 1) / questions.length) * 100) : 0;
  const feedback = current ? feedbackText(current, currentAnswer, currentCheck) : null;

  async function checkSelection(question: Question, answer: unknown) {
    if (!lessonId || !hasAnswer(question, answer)) return;
    setCheckingId(question.id);
    setSubmitError(null);

    try {
      const { data } = await api.post<CheckResult>(`/api/quiz/${lessonId}/check`, {
        questionId: question.id,
        answer,
      });
      setChecks((prev) => ({ ...prev, [question.id]: data }));
    } catch (error: any) {
      setSubmitError(error?.response?.data?.error || "Не удалось проверить ответ.");
    } finally {
      setCheckingId(null);
    }
  }

  function selectOption(question: Question, option: Option, optionIndex: number) {
    const currentQuestionAnswer = answers[question.id];
    const currentQuestionCheck = checks[question.id];
    if (checkingId === question.id || !canChooseOption(question, currentQuestionAnswer, optionIndex, currentQuestionCheck)) {
      return;
    }

    const selected = { optionIndex, optionId: option.id };

    setAnswers((prev) => {
      const nextAnswer =
        question.questionType === "MULTIPLE"
          ? (() => {
              const previous = Array.isArray(prev[question.id]) ? (prev[question.id] as SelectedOption[]) : [];
              const exists = previous.some((item) => item.optionIndex === optionIndex);
              return exists ? previous.filter((item) => item.optionIndex !== optionIndex) : [...previous, selected];
            })()
          : selected;

      void checkSelection(question, nextAnswer);
      return { ...prev, [question.id]: nextAnswer };
    });
  }

  function updateTextAnswer(question: Question, value: string) {
    if (isQuestionLocked(question, answers[question.id], checks[question.id])) return;

    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    setChecks((prev) => {
      const next = { ...prev };
      delete next[question.id];
      return next;
    });
  }

  function checkTextAnswer(question: Question) {
    if (isQuestionLocked(question, answers[question.id], checks[question.id])) return;

    const answer = answers[question.id];
    if (hasAnswer(question, answer)) {
      void checkSelection(question, answer);
    }
  }

  function onTextKeyDown(event: KeyboardEvent<HTMLInputElement>, question: Question) {
    if (event.key === "Enter") {
      event.preventDefault();
      checkTextAnswer(question);
    }
  }

  async function requestAiHint(question: Question) {
    if (!lessonId) return;
    const previousHints = aiHints[question.id] || [];
    setHintLoadingId(question.id);
    setSubmitError(null);

    const prompt = [
      "Дай подсказку к тестовому вопросу ЕНТ.",
      "Не называй букву ответа, правильный вариант, правильные пары и не решай полностью.",
      `Это подсказка номер ${previousHints.length + 1}. Сделай её новой и чуть полезнее предыдущей, но всё ещё без ответа.`,
      "Ответь на русском, максимум 2 коротких предложения.",
      "",
      `Вопрос:\n${question.question}`,
      question.options.length ? `Варианты:\n${formatOptions(question.options)}` : "",
      currentAnswer ? `Текущий ответ ученика: ${JSON.stringify(currentAnswer)}` : "",
      previousHints.length ? `Предыдущие подсказки:\n${previousHints.map((hint, hintIndex) => `${hintIndex + 1}. ${hint}`).join("\n")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const data = await sendAiMessage({ lessonId, message: prompt });
      setAiHints((prev) => ({
        ...prev,
        [question.id]: [...(prev[question.id] || []), data.reply],
      }));
    } catch {
      setAiHints((prev) => ({
        ...prev,
        [question.id]: [...(prev[question.id] || []), "Не получилось получить AI-подсказку. Проверь подключение и попробуй ещё раз."],
      }));
    } finally {
      setHintLoadingId(null);
    }
  }

  async function submit() {
    if (!lessonId) return;
    setSubmitting(true);
    setSubmitError(null);
    const payload = {
      answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
    };

    try {
      const { data } = await api.post(`/api/quiz/${lessonId}/submit`, payload);
      setResult(data);
    } catch (error: any) {
      setSubmitError(error?.response?.data?.error || "Не удалось отправить тест. Проверьте подключение к API.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7fbf7]">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 py-8">
        {loading && <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">Загрузка вопросов...</p>}

        {!loading && loadError && (
          <article className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {loadError}
          </article>
        )}

        {!loading && questions.length === 0 && !result && (
          <article className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-2 text-xl font-semibold text-slate-950">Тест недоступен</h2>
            <p className="text-sm text-slate-500">В этом уроке пока нет корректно распознанных вопросов.</p>
          </article>
        )}

        {current && !result && !loading && (
          <>
            <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-slate-950">
                  Вопрос {index + 1} из {questions.length}
                </span>
                <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-slate-500 hover:bg-slate-50" type="button">
                  <ArrowLeft size={16} />
                  Назад
                </button>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <article className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  {current.questionType === "MULTIPLE" ? "Можно выбрать несколько" : current.questionType === "TEXT_INPUT" ? "Ответ текстом" : "Один ответ"}
                </span>
                {checkingId === current.id && <span className="text-xs font-semibold text-slate-500">Проверяем...</span>}
              </div>

              <h1 className="whitespace-pre-line text-2xl font-bold leading-9 text-slate-950">{current.question}</h1>

              {current.questionType === "TEXT_INPUT" ? (
                <label className="mt-6 block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Keyboard size={16} className="text-emerald-600" />
                    Введите ответ и нажмите Enter
                  </span>
                  <input
                    value={typeof currentAnswer === "string" ? currentAnswer : ""}
                    onChange={(event) => updateTextAnswer(current, event.target.value)}
                    onBlur={() => checkTextAnswer(current)}
                    onKeyDown={(event) => onTextKeyDown(event, current)}
                    readOnly={isQuestionLocked(current, currentAnswer, currentCheck)}
                    className={`w-full rounded-md border px-4 py-3 text-sm outline-none focus:ring-2 ${
                      currentCheck
                        ? currentCheck.isCorrect
                          ? "border-emerald-400 bg-emerald-50 focus:ring-emerald-100"
                          : "border-rose-300 bg-rose-50 focus:ring-rose-100"
                        : "border-slate-200 bg-slate-50 focus:border-emerald-400 focus:bg-white focus:ring-emerald-100"
                    }`}
                    placeholder="Например: 1-A; 2-B; 3-C; 4-D"
                  />
                </label>
              ) : (
                <div className="mt-6 space-y-3">
                  {current.options.map((option, optionIndex) => {
                    const selected = isSelected(currentAnswer, optionIndex);
                    const canPick = checkingId !== current.id && canChooseOption(current, currentAnswer, optionIndex, currentCheck);
                    return (
                      <button
                        key={`${option.id}-${optionIndex}`}
                        onClick={() => selectOption(current, option, optionIndex)}
                        className={`flex w-full items-start gap-3 rounded-lg border px-4 py-4 text-left text-sm leading-6 ${optionState(
                          currentAnswer,
                          optionIndex,
                          currentCheck,
                        )} disabled:cursor-not-allowed`}
                        type="button"
                        disabled={!canPick}
                      >
                        <span
                          className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-xs font-bold ${optionBadge(
                            currentAnswer,
                            optionIndex,
                            currentCheck,
                          )}`}
                        >
                          {current.questionType === "MULTIPLE" ? (
                            selected ? <CheckSquare size={15} /> : <Square size={15} />
                          ) : (
                            String.fromCharCode(65 + optionIndex)
                          )}
                        </span>
                        <span>{option.text}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {feedback && (
                <div
                  className={`mt-5 rounded-lg border px-4 py-4 text-sm leading-6 ${
                    feedback.good ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 font-semibold">
                    {feedback.good ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
                    {feedback.title}
                  </div>
                  <p>{feedback.text}</p>
                </div>
              )}

              <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <button
                  type="button"
                  onClick={() => requestAiHint(current)}
                  disabled={hintLoadingId === current.id}
                  className="inline-flex items-center gap-2 rounded-md bg-amber-400 px-3 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Lightbulb size={16} />
                  {hintLoadingId === current.id ? "Думаю..." : (aiHints[current.id]?.length || 0) > 0 ? "Ещё подсказка" : "AI-подсказка"}
                </button>

                {(aiHints[current.id] || []).length > 0 && (
                  <div className="mt-4 space-y-2">
                    {(aiHints[current.id] || []).map((hint, hintIndex) => (
                      <div key={`${current.id}-hint-${hintIndex}`} className="rounded-md bg-white px-3 py-2 text-sm leading-6 text-amber-950">
                        <span className="font-semibold">Подсказка {hintIndex + 1}: </span>
                        {hint}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>

            {submitError && <p className="mt-3 text-sm text-rose-600">{submitError}</p>}

            <div className="mt-5 flex flex-wrap justify-between gap-3">
              <button
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setIndex((prev) => Math.max(prev - 1, 0))}
                type="button"
                disabled={index === 0}
              >
                <ArrowLeft size={16} />
                Назад
              </button>

              {index < questions.length - 1 ? (
                <button
                  className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => setIndex((prev) => Math.min(prev + 1, questions.length - 1))}
                  type="button"
                  disabled={!hasAnswer(current, currentAnswer)}
                >
                  Далее
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={submit}
                  type="button"
                  disabled={!hasAnswer(current, currentAnswer) || submitting}
                >
                  {submitting ? "Проверяем..." : "Завершить тест"}
                  <CheckCircle2 size={16} />
                </button>
              )}
            </div>
          </>
        )}

        {result && (
          <article className="rounded-lg border border-emerald-100 bg-white p-8 text-center">
            <CheckCircle2 className="mx-auto text-emerald-600" size={40} />
            <h2 className="mt-4 text-3xl font-bold text-slate-950">Результат: {result.score}%</h2>
            <p className="mt-2 text-slate-500">
              Верно {result.correctCount} из {result.total}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={() => navigate("/dashboard")}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                type="button"
              >
                На главную
                <ArrowRight size={16} />
              </button>
              <button
                onClick={() => {
                  setResult(null);
                  setIndex(0);
                  setAnswers({});
                  setChecks({});
                  setAiHints({});
                }}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                type="button"
              >
                <RotateCcw size={16} />
                Еще раз
              </button>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
