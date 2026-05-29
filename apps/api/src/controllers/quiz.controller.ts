import { Prisma, QuestionType } from "@prisma/client";
import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";

const submitSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        answer: z.any(),
      }),
    )
    .min(1),
});

const checkAnswerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.any(),
});

type QuizOption = { id: string; text: string; isCorrect: boolean };

function normalizeTextAnswer(value: unknown) {
  return String(value ?? "")
    .replace(/[;,\s]+/g, "")
    .replace(/[–—]/g, "-")
    .toUpperCase()
    .trim();
}

function extractAnswerIndexes(userAnswer: unknown): number[] | null {
  if (typeof userAnswer === "object" && userAnswer !== null && !Array.isArray(userAnswer)) {
    const idx = Number((userAnswer as { optionIndex?: unknown }).optionIndex);
    return Number.isInteger(idx) ? [idx] : null;
  }

  if (Array.isArray(userAnswer)) {
    const indexes = userAnswer
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          return Number((item as { optionIndex?: unknown }).optionIndex);
        }

        return Number.NaN;
      })
      .filter(Number.isInteger);

    return indexes.length ? indexes : null;
  }

  return null;
}

function isAnswerCorrect(questionType: QuestionType, userAnswer: unknown, options: QuizOption[] | null) {
  if (questionType === "TEXT_INPUT") {
    const correct = options?.find((opt) => opt.isCorrect)?.text;
    return normalizeTextAnswer(userAnswer) === normalizeTextAnswer(correct);
  }

  if (!options) return false;

  const answerIndexes = extractAnswerIndexes(userAnswer);
  if (answerIndexes) {
    const correctIndexes = options
      .map((opt, idx) => (opt.isCorrect ? idx : -1))
      .filter((idx) => idx >= 0)
      .sort((a, b) => a - b);

    const normalizedAnswerIndexes = [...answerIndexes].sort((a, b) => a - b);
    return JSON.stringify(correctIndexes) === JSON.stringify(normalizedAnswerIndexes);
  }

  const correctIds = options.filter((opt) => opt.isCorrect).map((opt) => opt.id).sort();
  const answerIds = Array.isArray(userAnswer)
    ? userAnswer.map(String).sort()
    : [String(userAnswer ?? "")].sort();

  return JSON.stringify(correctIds) === JSON.stringify(answerIds);
}

function buildHint(questionType: QuestionType) {
  if (questionType === "MULTIPLE") {
    return "Проверь каждый вариант отдельно: верный вариант должен точно подходить к условию, а не просто быть знакомым словом.";
  }

  if (questionType === "TEXT_INPUT") {
    return "Сначала сопоставь самые очевидные пары, потом оставшиеся. Формат ответа: 1-A; 2-B; 3-C; 4-D.";
  }

  return "Убери явно неверные варианты и найди ключевое слово в вопросе. Обычно оно прямо указывает на нужное понятие.";
}

function getCorrectOptions(options: QuizOption[] | null) {
  return (options || [])
    .map((option, optionIndex) => ({
      id: option.id,
      text: option.text,
      optionIndex,
      isCorrect: option.isCorrect,
    }))
    .filter((option) => option.isCorrect);
}

function getCorrectAnswer(questionType: QuestionType, options: QuizOption[] | null) {
  if (questionType === "TEXT_INPUT") {
    return options?.find((option) => option.isCorrect)?.text || "";
  }

  return getCorrectOptions(options)
    .map((option) => `${String.fromCharCode(65 + option.optionIndex)}) ${option.text}`)
    .join("; ");
}

export async function getQuizQuestions(req: Request, res: Response) {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { lessonId } = req.params;

  const questionsRaw = await prisma.quizQuestion.findMany({
    where: { lessonId },
    orderBy: { orderIndex: "asc" },
    select: {
      id: true,
      question: true,
      questionType: true,
      options: true,
      explanation: true,
      orderIndex: true,
    },
  });

  const questions = questionsRaw.map((item) => {
    const options = (item.options as QuizOption[] | null)?.map((opt) => ({
      id: opt.id,
      text: opt.text,
    })) ?? null;

    return {
      ...item,
      options,
      hint: buildHint(item.questionType),
    };
  });

  return res.json({ questions });
}

export async function checkQuizAnswer(req: Request, res: Response) {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { lessonId } = req.params;
  const parsed = checkAnswerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }

  const question = await prisma.quizQuestion.findFirst({
    where: {
      id: parsed.data.questionId,
      lessonId,
    },
  });

  if (!question) {
    return res.status(404).json({ error: "Question not found" });
  }

  const options = (question.options as QuizOption[] | null) ?? null;
  const isCorrect = isAnswerCorrect(question.questionType, parsed.data.answer, options);

  return res.json({
    isCorrect,
    correctOptions: getCorrectOptions(options).map(({ isCorrect: _isCorrect, ...option }) => option),
    correctAnswer: getCorrectAnswer(question.questionType, options),
    explanation: question.explanation || (isCorrect ? "Верно. Можно переходить дальше." : "Сравни свой ответ с правильным и попробуй объяснить, почему он подходит."),
  });
}

export async function submitQuiz(req: Request, res: Response) {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { lessonId } = req.params;
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }

  const questions = await prisma.quizQuestion.findMany({
    where: { lessonId },
  });

  const questionById = new Map(questions.map((q) => [q.id, q]));
  let correctCount = 0;

  const answersToCreate: Prisma.UserQuizAnswerCreateManyInput[] = parsed.data.answers.map((input) => {
    const question = questionById.get(input.questionId);
    if (!question) {
      return {
        userId,
        questionId: input.questionId,
        answer: input.answer,
        isCorrect: false,
      };
    }

    const options = (question.options as QuizOption[] | null) ?? null;
    const isCorrect = isAnswerCorrect(question.questionType, input.answer, options);

    if (isCorrect) {
      correctCount += 1;
    }

    return {
      userId,
      questionId: input.questionId,
      answer: input.answer,
      isCorrect,
    };
  });

  await prisma.$transaction([
    prisma.userQuizAnswer.createMany({ data: answersToCreate }),
    prisma.userProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: {
        userId,
        lessonId,
        status: "COMPLETED",
        score: questions.length ? Math.round((correctCount / questions.length) * 100) : 0,
        attempts: 1,
        completedAt: new Date(),
      },
      update: {
        status: "COMPLETED",
        score: questions.length ? Math.round((correctCount / questions.length) * 100) : 0,
        attempts: { increment: 1 },
        completedAt: new Date(),
        lastAccessedAt: new Date(),
      },
    }),
  ]);

  return res.json({
    correctCount,
    total: questions.length,
    score: questions.length ? Math.round((correctCount / questions.length) * 100) : 0,
  });
}
