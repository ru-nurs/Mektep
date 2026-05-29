import fs from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcrypt";
import mammoth from "mammoth";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "../src/prisma";

type FileNode = {
  absPath: string;
  relPath: string;
  name: string;
  ext: string;
};

type CourseTree = Map<string, Map<string, FileNode[]>>;
type CourseFolderMeta = {
  courseTitle: string;
  courseKey: string;
  partNumber: number | null;
};

type ParsedOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

type ParsedQuestion = {
  number: number;
  question: string;
  options: ParsedOption[];
};

type ImportedFileMeta = FileNode & {
  isTest: boolean;
  topicNumber: number | null;
  normalizedBaseTitle: string;
  sourceScore: number;
};

const BOOKS_ROOT = path.resolve(process.cwd(), "../../books");
const USER_PASSWORD = "12345678";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function cleanTitle(input: string) {
  return input
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCourseFolderName(rawName: string): CourseFolderMeta {
  const cleaned = cleanTitle(rawName);
  const inlinePartMatch = cleaned.match(/^(.+?)(\d{1,2})$/u);

  if (inlinePartMatch) {
    const base = cleanTitle(inlinePartMatch[1]);
    const partNumber = Number(inlinePartMatch[2]);

    if (base && Number.isFinite(partNumber) && partNumber > 0) {
      return {
        courseTitle: base,
        courseKey: base.toLowerCase(),
        partNumber,
      };
    }
  }

  return {
    courseTitle: cleaned,
    courseKey: cleaned.toLowerCase(),
    partNumber: null,
  };
}

function normalizeForDedup(input: string) {
  return cleanTitle(input)
    .replace(/\s*\(\d+\)\s*/g, " ")
    .replace(/\b(с\s+ответ(ом|ами)?|без\s+ответ(а|ов)?)\b/giu, "")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeLetter(raw: string) {
  const char = raw.trim().toUpperCase();
  const map: Record<string, string> = {
    А: "A",
    В: "B",
    С: "C",
    Д: "D",
    Е: "E",
    A: "A",
    B: "B",
    C: "C",
    D: "D",
    E: "E",
  };

  return map[char] || "";
}

function shouldSkipFile(name: string) {
  if (name.startsWith("~$")) return true;
  return /ключ\s*ответ/iu.test(name);
}

function isTestFile(name: string) {
  const plain = cleanTitle(name).toLowerCase();
  return plain.startsWith("тест") || plain.includes(" тест.") || plain.includes("тест тема");
}

function extractTopicNumber(input: string): number | null {
  const m = input.match(/тема\s*([0-9]{1,2})/iu);
  return m ? Number(m[1]) : null;
}

function extractTopicTail(input: string, isTest: boolean) {
  let title = cleanTitle(input);

  if (isTest) {
    title = title.replace(/^тест[\.\s:\-]*/iu, "");
  }

  title = title.replace(/^тема\s*\d{1,2}[\.\s:\-]*/iu, "");
  title = title
    .replace(/\s*\(\d+\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return title;
}

function chooseBetterFile(a: ImportedFileMeta, b: ImportedFileMeta) {
  if (a.sourceScore !== b.sourceScore) {
    return a.sourceScore > b.sourceScore ? a : b;
  }

  const aDup = /\(\d+\)/.test(a.name);
  const bDup = /\(\d+\)/.test(b.name);
  if (aDup !== bDup) {
    return aDup ? b : a;
  }

  return a.name.length <= b.name.length ? a : b;
}

function extensionScore(ext: string) {
  if (ext === ".docx") return 40;
  if (ext === ".doc") return 30;
  if (ext === ".pdf") return 20;
  if (ext === ".mp4") return 10;
  return 0;
}

function buildOrderedFiles(files: FileNode[]): ImportedFileMeta[] {
  const metas: ImportedFileMeta[] = files.map((file) => {
    const test = isTestFile(file.name);
    const topic = extractTopicNumber(file.name);

    return {
      ...file,
      isTest: test,
      topicNumber: topic,
      normalizedBaseTitle: normalizeForDedup(file.name),
      sourceScore: extensionScore(file.ext),
    };
  });

  const byTopicAndKind = new Map<string, ImportedFileMeta>();
  const noTopic = new Map<string, ImportedFileMeta>();

  for (const meta of metas) {
    if (meta.topicNumber !== null) {
      const key = `${meta.topicNumber}|${meta.isTest ? "test" : "theory"}|${meta.normalizedBaseTitle.includes("рождение кочевой цивилизации") ? "special" : "main"}`;
      const current = byTopicAndKind.get(key);
      byTopicAndKind.set(key, current ? chooseBetterFile(current, meta) : meta);
    } else {
      const key = `${meta.isTest ? "test" : "theory"}|${meta.normalizedBaseTitle}`;
      const current = noTopic.get(key);
      noTopic.set(key, current ? chooseBetterFile(current, meta) : meta);
    }
  }

  const topicNumbers = Array.from(
    new Set(
      Array.from(byTopicAndKind.values())
        .map((item) => item.topicNumber)
        .filter((item): item is number => item !== null),
    ),
  ).sort((a, b) => a - b);

  const ordered: ImportedFileMeta[] = [];

  for (const topic of topicNumbers) {
    const theory = Array.from(byTopicAndKind.values())
      .filter((item) => item.topicNumber === topic && !item.isTest)
      .sort((a, b) => b.sourceScore - a.sourceScore || a.name.localeCompare(b.name));

    const tests = Array.from(byTopicAndKind.values())
      .filter((item) => item.topicNumber === topic && item.isTest)
      .sort((a, b) => b.sourceScore - a.sourceScore || a.name.localeCompare(b.name));

    if (theory[0]) ordered.push(theory[0]);
    if (tests[0]) ordered.push(tests[0]);
  }

  const trailing = Array.from(noTopic.values()).sort((a, b) => {
    if (a.isTest !== b.isTest) return a.isTest ? 1 : -1;
    return cleanTitle(a.name).localeCompare(cleanTitle(b.name));
  });

  ordered.push(...trailing);

  return ordered;
}

function formatLessonTitle(meta: ImportedFileMeta) {
  if (meta.topicNumber === null) {
    return cleanTitle(meta.name);
  }

  const tail = extractTopicTail(meta.name, meta.isTest);
  if (meta.isTest) {
    return tail ? `Тест к теме ${meta.topicNumber}. ${tail}` : `Тест к теме ${meta.topicNumber}`;
  }

  return tail ? `Тема ${meta.topicNumber}. ${tail}` : `Тема ${meta.topicNumber}`;
}

function guessLessonType(file: ImportedFileMeta) {
  if (file.isTest) return "QUIZ" as const;
  if (file.ext === ".mp4") return "VIDEO" as const;
  return "THEORY" as const;
}

function moduleSortRank(name: string) {
  const partMatch = name.match(/^часть\s+(\d{1,2})$/iu);
  if (partMatch) {
    return { group: 0, number: Number(partMatch[1]), label: name.toLowerCase() };
  }

  return { group: 1, number: Number.MAX_SAFE_INTEGER, label: cleanTitle(name).toLowerCase() };
}

async function collectFiles(root: string): Promise<FileNode[]> {
  const stack = [root];
  const files: FileNode[] = [];

  while (stack.length) {
    const current = stack.pop()!;
    const entries = await fs.readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const absPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absPath);
        continue;
      }

      if (!entry.isFile() || shouldSkipFile(entry.name)) {
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (![".docx", ".doc", ".pdf", ".mp4"].includes(ext)) {
        continue;
      }

      files.push({
        absPath,
        relPath: path.relative(root, absPath),
        name: entry.name,
        ext,
      });
    }
  }

  return files;
}

async function extractDocxText(filePath: string): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value.trim();
  } catch {
    return "";
  }
}

function parseHistoryAnswerKey(text: string) {
  const topicMap = new Map<number, Map<number, string>>();
  const lines = text.replace(/\r/g, "").split("\n");

  let currentTopic: number | null = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\u2060/g, "").trim();
    if (!line) continue;

    const topicMatch = line.match(/тема\s*([0-9]{1,2})/iu);
    if (topicMatch) {
      currentTopic = Number(topicMatch[1]);
      if (!topicMap.has(currentTopic)) {
        topicMap.set(currentTopic, new Map<number, string>());
      }
      continue;
    }

    if (!currentTopic) continue;

    const answerRegex = /(\d{1,2})\s*[\-–—\.):]\s*([A-EА-Е])/giu;
    for (const match of line.matchAll(answerRegex)) {
      const qNum = Number(match[1]);
      const letter = normalizeLetter(match[2]);
      if (!letter) continue;
      topicMap.get(currentTopic)!.set(qNum, letter);
    }
  }

  return topicMap;
}

async function loadHistoryAnswerKey() {
  const keyPath = path.join(BOOKS_ROOT, "История", "Ключ ответов.docx");
  const exists = await fs
    .access(keyPath)
    .then(() => true)
    .catch(() => false);

  if (!exists) {
    return new Map<number, Map<number, string>>();
  }

  const rawText = await extractDocxText(keyPath);
  return parseHistoryAnswerKey(rawText);
}

function parseQuizQuestions(rawText: string, answersByNumber?: Map<number, string>): ParsedQuestion[] {
  let text = rawText
    .replace(/\r/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/\u2060/g, "")
    .replace(/[ \t]+/g, " ");

  text = text.replace(/([A-EА-Е])\s*[\)\.]/giu, "\n$1)");
  text = text.replace(/([^\d\n])(\d{1,2}\s*[\)\.])/g, "$1\n$2");

  const questionRegex = /(?:^|\n)\s*(\d{1,2})\s*[\)\.]\s*/g;
  const matches = Array.from(text.matchAll(questionRegex));
  const questions: ParsedQuestion[] = [];

  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    const qNum = Number(match[1]);
    const start = (match.index || 0) + match[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index || text.length) : text.length;
    const chunk = text.slice(start, end).trim();

    if (!chunk) continue;

    const firstOptionIndex = chunk.search(/(?:^|\n)\s*[A-EА-Е]\)\s*/iu);
    if (firstOptionIndex < 0) continue;

    const questionText = chunk
      .slice(0, firstOptionIndex)
      .replace(/\s+/g, " ")
      .trim();

    if (questionText.length < 5) continue;

    const optionsPart = chunk.slice(firstOptionIndex);
    const optionRegex = /(?:^|\n)\s*([A-EА-Е])\)\s*([\s\S]*?)(?=(?:\n\s*[A-EА-Е]\)\s*)|$)/giu;
    const options: ParsedOption[] = [];

    for (const optionMatch of optionsPart.matchAll(optionRegex)) {
      const id = normalizeLetter(optionMatch[1]);
      const optionText = optionMatch[2].replace(/\s+/g, " ").trim();
      if (!id || !optionText) continue;
      options.push({ id, text: optionText, isCorrect: false });
    }

    if (options.length < 2) continue;

    const fromKey = answersByNumber?.get(qNum);
    const fromInlineMatch = chunk.match(/(?:ответ|answer)\s*[:\-]?\s*([A-EА-Е])/iu);
    const fromInline = fromInlineMatch ? normalizeLetter(fromInlineMatch[1]) : "";
    const correct = fromKey || fromInline;

    if (correct) {
      for (const option of options) {
        option.isCorrect = option.id === correct;
      }
    }

    questions.push({ number: qNum, question: questionText, options });
  }

  return questions;
}

function buildTree(files: FileNode[]): CourseTree {
  const tree: CourseTree = new Map();
  const courseKeyToTitle = new Map<string, string>();
  const courseHasNumberedPart = new Map<string, boolean>();

  for (const file of files) {
    const parts = file.relPath.split(path.sep);
    if (!parts.length) continue;
    const folderMeta = parseCourseFolderName(parts[0]);
    if (folderMeta.partNumber !== null) {
      courseHasNumberedPart.set(folderMeta.courseKey, true);
    } else if (!courseHasNumberedPart.has(folderMeta.courseKey)) {
      courseHasNumberedPart.set(folderMeta.courseKey, false);
    }
  }

  for (const file of files) {
    const parts = file.relPath.split(path.sep);
    if (!parts.length) continue;

    const folderMeta = parseCourseFolderName(parts[0]);
    const courseName = courseKeyToTitle.get(folderMeta.courseKey) || folderMeta.courseTitle;
    courseKeyToTitle.set(folderMeta.courseKey, courseName);

    let moduleName = parts.length >= 3 ? parts[1] : "Основные материалы";
    if (parts.length < 3) {
      if (folderMeta.partNumber !== null) {
        moduleName = `Часть ${folderMeta.partNumber}`;
      } else if (courseHasNumberedPart.get(folderMeta.courseKey)) {
        moduleName = "Часть 1";
      }
    }

    if (!tree.has(courseName)) {
      tree.set(courseName, new Map());
    }

    const modules = tree.get(courseName)!;
    if (!modules.has(moduleName)) {
      modules.set(moduleName, []);
    }

    modules.get(moduleName)!.push(file);
  }

  return tree;
}

async function resetContentData() {
  await prisma.userQuizAnswer.deleteMany();
  await prisma.userProgress.deleteMany();
  await prisma.userAchievement.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.lessonBlock.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.module.deleteMany();
  await prisma.course.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.user.deleteMany();
}

async function importCourses(tree: CourseTree, historyAnswers: Map<number, Map<number, string>>) {
  let coursesCount = 0;
  let modulesCount = 0;
  let lessonsCount = 0;
  let blocksCount = 0;
  let questionsCount = 0;
  let quizLessonsCount = 0;
  let skippedBrokenTests = 0;

  for (const [courseName, modules] of tree.entries()) {
    const course = await prisma.course.create({
      data: {
        slug: slugify(courseName),
        title: cleanTitle(courseName),
        description: "Imported from local books folder",
        language: "ru",
        isPublished: true,
        orderIndex: coursesCount,
      },
    });
    coursesCount += 1;

    const sortedModules = Array.from(modules.entries()).sort((a, b) => {
      const left = moduleSortRank(a[0]);
      const right = moduleSortRank(b[0]);
      if (left.group !== right.group) return left.group - right.group;
      if (left.number !== right.number) return left.number - right.number;
      return left.label.localeCompare(right.label);
    });

    let moduleOrder = 0;
    for (const [moduleName, files] of sortedModules) {
      const module = await prisma.module.create({
        data: {
          courseId: course.id,
          title: cleanTitle(moduleName),
          description: "Generated automatically",
          orderIndex: moduleOrder++,
        },
      });
      modulesCount += 1;

      const orderedFiles = buildOrderedFiles(files);
      let lessonOrder = 0;

      for (const file of orderedFiles) {
        let rawText = "";
        let parsedQuestions: ParsedQuestion[] = [];

        if (file.ext === ".docx") {
          rawText = await extractDocxText(file.absPath);
          if (rawText && file.isTest) {
            const isHistoryCourse = /история/iu.test(courseName);
            const keyForTopic = isHistoryCourse && file.topicNumber ? historyAnswers.get(file.topicNumber) : undefined;
            parsedQuestions = parseQuizQuestions(rawText, keyForTopic);
          }
        }

        if (file.isTest && parsedQuestions.length === 0) {
          skippedBrokenTests += 1;
          continue;
        }

        const lesson = await prisma.lesson.create({
          data: {
            moduleId: module.id,
            title: formatLessonTitle(file),
            slug: slugify(formatLessonTitle(file)),
            lessonType: guessLessonType(file),
            xpReward: file.isTest ? 20 : 10,
            durationMin: file.isTest ? 15 : 10,
            orderIndex: lessonOrder++,
            isPublished: true,
          },
        });
        lessonsCount += 1;

        await prisma.lessonBlock.create({
          data: {
            lessonId: lesson.id,
            blockType: "text",
            content: {
              sourceFile: file.relPath.split("\\").join("/"),
              fileType: file.ext,
              note: "Source in local books folder",
            } satisfies Prisma.InputJsonValue,
            orderIndex: 0,
          },
        });
        blocksCount += 1;

        if (rawText) {
          await prisma.lessonBlock.create({
            data: {
              lessonId: lesson.id,
              blockType: "text",
              content: {
                markdown: rawText.length > 12000 ? `${rawText.slice(0, 12000)}\n\n...` : rawText,
              } satisfies Prisma.InputJsonValue,
              orderIndex: 1,
            },
          });
          blocksCount += 1;
        }

        if (parsedQuestions.length > 0) {
          quizLessonsCount += 1;
          for (const [idx, item] of parsedQuestions.entries()) {
            await prisma.quizQuestion.create({
              data: {
                lessonId: lesson.id,
                question: item.question,
                questionType: "SINGLE",
                options: item.options as unknown as Prisma.InputJsonValue,
                orderIndex: idx,
              },
            });
          }
          questionsCount += parsedQuestions.length;
        }
      }
    }
  }

  return { coursesCount, modulesCount, lessonsCount, blocksCount, questionsCount, quizLessonsCount, skippedBrokenTests };
}

async function seedUsersAndProgress() {
  const passwordHash = await bcrypt.hash(USER_PASSWORD, 10);
  const createdUsers = [];

  for (let i = 1; i <= 40; i += 1) {
    const role: Role = i <= 2 ? "TEACHER" : "STUDENT";
    const user = await prisma.user.create({
      data: {
        email: `user${i}@ai-mektep.local`,
        username: `user${i}`,
        fullName: `Demo User ${i}`,
        passwordHash,
        role,
        xp: 0,
        streakDays: i % 15,
        lastActivityAt: new Date(),
      },
    });
    createdUsers.push(user);
  }

  const achievements = await prisma.achievement.createMany({
    data: [
      { code: "FIRST_STEP", title: "Первый шаг", description: "Завершите первый урок", xpBonus: 10 },
      { code: "STREAK_3", title: "Серия 3", description: "Учитесь 3 дня подряд", xpBonus: 20 },
      { code: "STREAK_7", title: "Серия 7", description: "Учитесь 7 дней подряд", xpBonus: 50 },
      { code: "QUIZ_MASTER", title: "Мастер тестов", description: "Наберите 90% в тесте", xpBonus: 40 },
      { code: "TOP_100", title: "Топ-100", description: "Войти в топ-100 рейтинга", xpBonus: 30 },
    ],
  });

  const lessonIds = await prisma.lesson.findMany({
    select: { id: true, xpReward: true },
    orderBy: [{ orderIndex: "asc" }, { title: "asc" }],
  });

  let progressRows = 0;
  for (const [idx, user] of createdUsers.entries()) {
    const completedCount = Math.min(lessonIds.length, 3 + (idx % 12));
    let xpSum = 0;

    for (let i = 0; i < completedCount; i += 1) {
      const lesson = lessonIds[i];
      await prisma.userProgress.create({
        data: {
          userId: user.id,
          lessonId: lesson.id,
          status: "COMPLETED",
          score: 70 + (i % 30),
          attempts: 1 + (i % 3),
          completedAt: new Date(),
        },
      });
      xpSum += lesson.xpReward;
      progressRows += 1;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { xp: xpSum },
    });
  }

  const allAchievements = await prisma.achievement.findMany();
  let links = 0;
  for (const [idx, user] of createdUsers.entries()) {
    const assigned = allAchievements.slice(0, 1 + (idx % allAchievements.length));
    for (const item of assigned) {
      await prisma.userAchievement.create({
        data: {
          userId: user.id,
          achievementId: item.id,
        },
      });
      links += 1;
    }
  }

  return {
    usersCount: createdUsers.length,
    achievementsCount: achievements.count,
    progressRows,
    userAchievementsRows: links,
  };
}

async function main() {
  console.log(`[books-import] source: ${BOOKS_ROOT}`);
  const exists = await fs
    .access(BOOKS_ROOT)
    .then(() => true)
    .catch(() => false);

  if (!exists) {
    throw new Error(`books folder not found: ${BOOKS_ROOT}`);
  }

  const files = await collectFiles(BOOKS_ROOT);
  if (!files.length) {
    throw new Error("No supported files found in books folder");
  }

  console.log(`[books-import] files found: ${files.length}`);
  const tree = buildTree(files);
  console.log(`[books-import] courses found: ${tree.size}`);

  const historyAnswers = await loadHistoryAnswerKey();
  console.log(`[books-import] history answer key topics: ${historyAnswers.size}`);

  await resetContentData();
  const contentStats = await importCourses(tree, historyAnswers);
  const userStats = await seedUsersAndProgress();

  console.log("[books-import] done");
  console.log({
    ...contentStats,
    ...userStats,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
