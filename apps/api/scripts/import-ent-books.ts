import { Prisma, PrismaClient, QuestionType } from "@prisma/client";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();
const BOOKS_ROOT = path.resolve(process.cwd(), "../../books");
const TMP_ROOT = path.resolve(process.cwd(), ".tmp/book-zips");

type TestPackage = {
  subjectRoot: string;
  testDir: string;
};

type FileMapEntry = {
  file: string;
  topicNo: string;
  topicTitle: string;
  level: LevelKey;
};

type AnswerEntry = {
  file?: string;
  topicNo?: string;
  level?: LevelKey;
  questionNo: number;
  type?: string;
  answer: string;
  explanation?: string;
};

type QuizOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

type ParsedQuestion = {
  question: string;
  questionType: QuestionType;
  options: QuizOption[];
  explanation?: string;
};

type SourceFile = {
  label: string;
  path: string;
};

type LevelKey = "basic" | "medium" | "high";

const LEVEL_LABEL: Record<LevelKey, string> = {
  basic: "Базовый",
  medium: "Средний",
  high: "Высокий",
};

const LEVEL_ORDER: Record<LevelKey, number> = {
  basic: 0,
  medium: 1,
  high: 2,
};

async function exists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readUtf8(filePath: string) {
  return fs.readFile(filePath, "utf8");
}

async function walkFiles(root: string): Promise<string[]> {
  if (!(await exists(root))) return [];
  const entries = await fs.readdir(root, { withFileTypes: true });
  const result: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await walkFiles(fullPath)));
      continue;
    }
    result.push(fullPath);
  }

  return result;
}

async function walkDirs(root: string): Promise<string[]> {
  if (!(await exists(root))) return [];
  const entries = await fs.readdir(root, { withFileTypes: true });
  const result = [root];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    result.push(...(await walkDirs(path.join(root, entry.name))));
  }

  return result;
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = cells[index] || "";
      return row;
    }, {});
  });
}

function normalizeLevel(value?: string, fileName?: string): LevelKey {
  const raw = `${value || ""} ${fileName || ""}`.toLowerCase();
  if (/(^|[_\s-])h($|[_\s.-])|high|высок/.test(raw)) return "high";
  if (/(^|[_\s-])m($|[_\s.-])|medium|сред/.test(raw)) return "medium";
  return "basic";
}

function normalizeTopicNo(value?: string, fileName?: string) {
  const raw = value || fileName || "";
  const match = raw.match(/\d+/);
  return match ? match[0].padStart(2, "0") : raw.trim();
}

function cleanTopicTitle(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/^\s*(t)?\d{1,2}[\s._-]+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeFileMapRow(row: Record<string, string>): FileMapEntry | null {
  const file = row.file?.trim();
  if (!file) return null;

  const topicNo = normalizeTopicNo(row.topic_no || row.topic_id || row.topic_code || row.topic, file);
  const rawTitle = row.topic_name || row.topic_title || row.topic || row.topic_code || topicNo;
  const topicTitle = /^t\d+$/i.test(rawTitle.trim()) ? `Тема ${topicNo}` : cleanTopicTitle(rawTitle);
  const level = normalizeLevel(row.level_ru || row.level || row.level_code, file);

  return {
    file,
    topicNo,
    topicTitle: topicTitle || `Тема ${topicNo}`,
    level,
  };
}

function normalizeAnswerRow(row: Record<string, string>): AnswerEntry | null {
  const questionNo = Number(row.question || row.question_no);
  const answer = row.answer?.trim();
  if (!Number.isInteger(questionNo) || !answer) return null;

  return {
    file: row.file?.trim() || undefined,
    topicNo: normalizeTopicNo(row.topic_id || row.topic_no || row.topic_code || row.topic || undefined),
    level: normalizeLevel(row.level || row.level_ru || row.level_code || undefined, row.file),
    questionNo,
    type: row.type?.trim(),
    answer,
    explanation: row.explanation?.trim() || undefined,
  };
}

function answerKey(file: string, questionNo: number) {
  return `${file.toLowerCase()}::${questionNo}`;
}

function topicAnswerKey(topicNo: string, level: LevelKey, questionNo: number) {
  return `${topicNo}::${level}::${questionNo}`;
}

function createAnswerResolver(answers: AnswerEntry[]) {
  const byFile = new Map<string, AnswerEntry>();
  const byTopic = new Map<string, AnswerEntry>();

  answers.forEach((answer) => {
    if (answer.file) byFile.set(answerKey(answer.file, answer.questionNo), answer);
    if (answer.topicNo && answer.level) byTopic.set(topicAnswerKey(answer.topicNo, answer.level, answer.questionNo), answer);
  });

  return (file: FileMapEntry, questionNo: number) =>
    byFile.get(answerKey(file.file, questionNo)) || byTopic.get(topicAnswerKey(file.topicNo, file.level, questionNo));
}

function normalizeLetter(value: string) {
  return value.toUpperCase().replace("А", "A").replace("В", "B").replace("С", "C").replace("Е", "E");
}

function normalizeMatchingAnswer(answer: string) {
  return answer
    .replace(/[–—]/g, "-")
    .replace(/,/g, ";")
    .split(";")
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean)
    .join("; ");
}

function stripAnswersSection(markdown: string) {
  return markdown.replace(/\n##\s*Ответы[\s\S]*$/i, "");
}

function cleanQuestionChunk(chunk: string, questionNo: number) {
  const lines = chunk
    .split(/\r?\n/)
    .filter((line) => !/^\s*(\*\*)?Ответ(\*\*)?\s*:/i.test(line))
    .map((line) => line.replace(/^\s*#{1,6}\s*/, "").trimEnd());

  if (lines.length) {
    lines[0] = lines[0].replace(new RegExp(`^${questionNo}\\.\\s*`), "").trim();
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function splitQuestionAndOptions(chunk: string, questionNo: number) {
  const lines = cleanQuestionChunk(chunk, questionNo).split(/\r?\n/);
  const questionLines: string[] = [];
  const options: Array<{ letter: string; text: string }> = [];
  let currentOption: { letter: string; text: string } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const optionMatch = trimmed.match(/^([A-EА-Е])\)\s*(.+)$/i);

    if (optionMatch) {
      if (currentOption) options.push(currentOption);
      currentOption = {
        letter: normalizeLetter(optionMatch[1]),
        text: optionMatch[2].trim(),
      };
      continue;
    }

    if (currentOption && trimmed) {
      currentOption.text = `${currentOption.text} ${trimmed}`.trim();
      continue;
    }

    if (!currentOption && trimmed) {
      questionLines.push(trimmed);
    }
  }

  if (currentOption) options.push(currentOption);

  return {
    question: questionLines.join("\n").trim(),
    options,
  };
}

function parseQuestions(markdown: string, file: FileMapEntry, answers: AnswerEntry[]) {
  const resolveAnswer = createAnswerResolver(answers);
  const body = stripAnswersSection(markdown);
  const matches = Array.from(body.matchAll(/^[ \t]*(?:#{1,6}\s*)?(\d{1,2})\.\s+/gm));
  const parsed: ParsedQuestion[] = [];

  matches.forEach((match, index) => {
    const questionNo = Number(match[1]);
    const next = matches[index + 1];
    const chunk = body.slice(match.index || 0, next?.index ?? body.length).trim();
    const answer = resolveAnswer(file, questionNo);
    if (!answer) return;

    const answerType = (answer.type || "").toLowerCase();
    const isMatching = answerType.includes("match") || /\d+\s*[-–—]\s*[A-EА-Е]/i.test(answer.answer);

    if (isMatching) {
      parsed.push({
        question: `${cleanQuestionChunk(chunk, questionNo)}\n\nВведите соответствие в формате: 1-A; 2-B; 3-C; 4-D`,
        questionType: "TEXT_INPUT",
        options: [{ id: "answer", text: normalizeMatchingAnswer(answer.answer), isCorrect: true }],
        explanation: answer.explanation,
      });
      return;
    }

    const { question, options } = splitQuestionAndOptions(chunk, questionNo);
    const correctLetters = answer.answer
      .replace(/[^A-EА-Е]/gi, "")
      .split("")
      .map(normalizeLetter)
      .filter(Boolean);

    if (!question || !options.length || !correctLetters.length) return;

    parsed.push({
      question,
      questionType: answerType.includes("multi") || correctLetters.length > 1 ? "MULTIPLE" : "SINGLE",
      options: options.map((option) => ({
        id: option.letter,
        text: option.text,
        isCorrect: correctLetters.includes(option.letter),
      })),
      explanation: answer.explanation,
    });
  });

  return parsed;
}

function transliterate(value: string) {
  const map: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "i",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "c",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ы: "y",
    э: "e",
    ю: "yu",
    я: "ya",
    қ: "k",
    ә: "a",
    ө: "o",
    ү: "u",
    ұ: "u",
    ғ: "g",
    ң: "n",
    і: "i",
    һ: "h",
  };

  return value
    .toLowerCase()
    .split("")
    .map((char) => map[char] ?? char)
    .join("");
}

function slugify(value: string) {
  return transliterate(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function subjectTitle(subjectRoot: string) {
  const name = path.basename(subjectRoot).replace(/\d+$/, "").trim();
  const normalized = name.toLowerCase();

  if (normalized === "математика") return "Математика";
  if (normalized === "история казахстана") return "История Казахстана";

  return name.replace(/^./, (char) => char.toUpperCase());
}

async function findDatasetDirs(root: string) {
  const dirs = await walkDirs(root);
  const datasetDirs: string[] = [];

  for (const dir of dirs) {
    if ((await exists(path.join(dir, "answers.csv"))) && (await exists(path.join(dir, "file_map.csv")))) {
      datasetDirs.push(dir);
    }
  }

  return datasetDirs;
}

function subjectRootForPath(testDir: string) {
  const relative = path.relative(BOOKS_ROOT, testDir);
  const [topLevel] = relative.split(path.sep);
  return path.join(BOOKS_ROOT, topLevel);
}

async function extractZipPackages() {
  const zipFiles = (await walkFiles(BOOKS_ROOT)).filter((file) => file.toLowerCase().endsWith(".zip"));
  const packages: TestPackage[] = [];

  await fs.rm(TMP_ROOT, { recursive: true, force: true });
  await fs.mkdir(TMP_ROOT, { recursive: true });

  for (const zipFile of zipFiles) {
    const relativeZip = path.relative(BOOKS_ROOT, zipFile);
    const destination = path.join(TMP_ROOT, slugify(relativeZip.replace(/\.zip$/i, "")));

    await fs.mkdir(destination, { recursive: true });
    try {
      execFileSync(
        "powershell.exe",
        ["-NoProfile", "-Command", `Expand-Archive -LiteralPath ${psQuote(zipFile)} -DestinationPath ${psQuote(destination)} -Force`],
        { stdio: "ignore" },
      );
    } catch (error) {
      console.warn(`Skipped zip: ${relativeZip}`);
      continue;
    }

    const dirs = await findDatasetDirs(destination);
    dirs.forEach((dir) => {
      packages.push({ subjectRoot: path.dirname(zipFile), testDir: dir });
    });
  }

  return packages;
}

function psQuote(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

async function findPackages() {
  const direct = (await findDatasetDirs(BOOKS_ROOT)).map((testDir) => ({
    subjectRoot: subjectRootForPath(testDir),
    testDir,
  }));
  const fromZips = await extractZipPackages();
  const all = [...direct, ...fromZips];
  const unique = new Map<string, TestPackage>();

  all.forEach((pkg) => unique.set(pkg.testDir, pkg));
  return Array.from(unique.values()).sort((a, b) => subjectTitle(a.subjectRoot).localeCompare(subjectTitle(b.subjectRoot), "ru"));
}

async function resolveMarkdownPath(testDir: string, fileName: string) {
  const direct = path.join(testDir, fileName);
  const nested = path.join(testDir, "tests", fileName);

  if (await exists(direct)) return direct;
  if (await exists(nested)) return nested;
  return null;
}

async function topicSources(subjectRoot: string, topicNo: string) {
  const entries = await fs.readdir(subjectRoot, { withFileTypes: true });
  const topicContainers = entries
    .filter((entry) => entry.isDirectory() && entry.name.toLowerCase().includes("тем"))
    .map((entry) => path.join(subjectRoot, entry.name));

  const sources: SourceFile[] = [];

  for (const container of topicContainers) {
    const topicDirs = await fs.readdir(container, { withFileTypes: true });
    const matchingDirs = topicDirs.filter((entry) => entry.isDirectory() && normalizeTopicNo(entry.name) === topicNo);

    for (const dir of matchingDirs) {
      const files = (await walkFiles(path.join(container, dir.name))).filter((file) => /\.(pdf|docx?|png|jpe?g)$/i.test(file));
      files.forEach((file) => {
        sources.push({
          label: path.relative(subjectRoot, file).split(path.sep).join(" / "),
          path: path.relative(BOOKS_ROOT, file).split(path.sep).join("/"),
        });
      });
    }
  }

  if (!sources.length) {
    const fallbackFiles = (await fs.readdir(subjectRoot, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && /раздел|тем/i.test(entry.name) && /\.pdf$/i.test(entry.name))
      .map((entry) => path.join(subjectRoot, entry.name));

    fallbackFiles.forEach((file) => {
      sources.push({
        label: path.relative(subjectRoot, file).split(path.sep).join(" / "),
        path: path.relative(BOOKS_ROOT, file).split(path.sep).join("/"),
      });
    });
  }

  return sources.slice(0, 8);
}

function correctAnswerText(question: ParsedQuestion) {
  if (question.questionType === "TEXT_INPUT") return "";
  return question.options
    .filter((option) => option.isCorrect)
    .map((option) => option.text)
    .join("; ");
}

function buildTheoryMarkdown(subject: string, topicTitle: string, questions: ParsedQuestion[]) {
  const terms = topicTitle
    .split(/[.;:]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 5);

  const facts = questions
    .filter((question) => question.questionType !== "TEXT_INPUT")
    .slice(0, 7)
    .map((question) => {
      const shortQuestion = question.question.split("\n")[0].replace(/\s+/g, " ").trim();
      const answer = correctAnswerText(question);
      return answer ? `- ${shortQuestion} -> ${answer}` : "";
    })
    .filter(Boolean);

  const termsBlock = terms.length
    ? terms.map((term) => `- ${term}: найди определение, формулу или главный признак в материалах.`).join("\n")
    : `- Главная идея темы: ${topicTitle}.`;

  const factsBlock = facts.length
    ? facts.join("\n")
    : "- Прочитай источник и выпиши 5 терминов.\n- После чтения сразу реши базовый тест.\n- Ошибки разбери с AI-наставником.";

  return `# ${topicTitle}

Это короткий маршрут по теме для ЕНТ по предмету **${subject}**.

## Сначала пойми базу
${termsBlock}

## Опорные факты из тестов
${factsBlock}

## Как проходить
- Прочитай этот конспект и открой материалы из книг ниже.
- Реши базовый тест без подсказок.
- Если результат ниже 70%, попроси AI-наставника объяснить ошибки простыми словами.
- Потом переходи на средний и высокий уровень.
`;
}

async function importPackage(pkg: TestPackage, orderIndex: number) {
  const fileMapRows = parseCsv(await readUtf8(path.join(pkg.testDir, "file_map.csv")))
    .map(normalizeFileMapRow)
    .filter((row): row is FileMapEntry => Boolean(row));
  const answerRows = parseCsv(await readUtf8(path.join(pkg.testDir, "answers.csv")))
    .map(normalizeAnswerRow)
    .filter((row): row is AnswerEntry => Boolean(row));

  const title = subjectTitle(pkg.subjectRoot);
  const slug = `ent-${slugify(title)}`;

  const course = await prisma.course.upsert({
    where: { slug },
    update: {
      title,
      description: "Курс ЕНТ из локальных учебников, тем и тестовых вариантов.",
      category: "ЕНТ",
      difficulty: "INTERMEDIATE",
      isPublished: true,
      orderIndex,
    },
    create: {
      slug,
      title,
      description: "Курс ЕНТ из локальных учебников, тем и тестовых вариантов.",
      category: "ЕНТ",
      difficulty: "INTERMEDIATE",
      language: "ru",
      isPublished: true,
      orderIndex,
    },
  });

  await prisma.module.deleteMany({ where: { courseId: course.id } });

  const topicMap = new Map<string, FileMapEntry[]>();
  fileMapRows.forEach((row) => {
    const rows = topicMap.get(row.topicNo) || [];
    rows.push(row);
    topicMap.set(row.topicNo, rows);
  });

  let moduleCount = 0;
  let lessonCount = 0;
  let questionCount = 0;

  const topics = Array.from(topicMap.entries()).sort(([a], [b]) => Number(a) - Number(b));

  for (const [topicNo, rows] of topics) {
    const sortedRows = [...rows].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
    const topicTitle = sortedRows[0]?.topicTitle || `Тема ${topicNo}`;
    const parsedTests: Array<{ file: FileMapEntry; questions: ParsedQuestion[] }> = [];

    for (const row of sortedRows) {
      const markdownPath = await resolveMarkdownPath(pkg.testDir, row.file);
      if (!markdownPath) continue;
      const markdown = await readUtf8(markdownPath);
      parsedTests.push({ file: row, questions: parseQuestions(markdown, row, answerRows) });
    }

    const sourceFiles = await topicSources(pkg.subjectRoot, topicNo);
    const baseQuestions = parsedTests.find((test) => test.file.level === "basic")?.questions || parsedTests[0]?.questions || [];

    const module = await prisma.module.create({
      data: {
        courseId: course.id,
        title: `${topicNo}. ${topicTitle}`,
        description: "Теория, источники и тесты по уровню сложности.",
        orderIndex: Number(topicNo) || moduleCount,
      },
    });
    moduleCount += 1;

    const theoryLesson = await prisma.lesson.create({
      data: {
        moduleId: module.id,
        title: `Теория: ${topicTitle}`,
        slug: `${slug}-${topicNo}-theory`,
        lessonType: "THEORY",
        xpReward: 10,
        durationMin: 12,
        orderIndex: 0,
        isPublished: true,
      },
    });
    lessonCount += 1;

    await prisma.lessonBlock.createMany({
      data: [
        {
          lessonId: theoryLesson.id,
          blockType: "text",
          orderIndex: 0,
          content: { markdown: buildTheoryMarkdown(title, topicTitle, baseQuestions) } as Prisma.InputJsonValue,
        },
        {
          lessonId: theoryLesson.id,
          blockType: "source_pdf",
          orderIndex: 1,
          content: { sources: sourceFiles } as Prisma.InputJsonValue,
        },
      ],
    });

    for (const [testIndex, test] of parsedTests.entries()) {
      const quizLesson = await prisma.lesson.create({
        data: {
          moduleId: module.id,
          title: `Тест: ${LEVEL_LABEL[test.file.level]}`,
          slug: `${slug}-${topicNo}-${test.file.level}`,
          lessonType: "QUIZ",
          xpReward: 15 + LEVEL_ORDER[test.file.level] * 5,
          durationMin: test.questions.length > 20 ? 35 : 20,
          orderIndex: testIndex + 1,
          isPublished: true,
        },
      });
      lessonCount += 1;

      await prisma.lessonBlock.create({
        data: {
          lessonId: quizLesson.id,
          blockType: "text",
          orderIndex: 0,
          content: {
            markdown: `# ${topicTitle}\n\nУровень: **${LEVEL_LABEL[test.file.level]}**.\n\nВ тесте ${test.questions.length} заданий. Сначала реши сам, затем разбери ошибки с AI-наставником.`,
          } as Prisma.InputJsonValue,
        },
      });

      if (test.questions.length) {
        await prisma.quizQuestion.createMany({
          data: test.questions.map((question, questionIndex) => ({
            lessonId: quizLesson.id,
            question: question.question,
            questionType: question.questionType,
            options: question.options as unknown as Prisma.InputJsonValue,
            explanation: question.explanation,
            orderIndex: questionIndex,
          })),
        });
        questionCount += test.questions.length;
      }
    }
  }

  return { title, moduleCount, lessonCount, questionCount };
}

async function main() {
  const packages = await findPackages();
  console.log(`Found ${packages.length} ENT book packages.`);

  for (const [index, pkg] of packages.entries()) {
    const result = await importPackage(pkg, index);
    console.log(
      `${result.title}: ${result.moduleCount} modules, ${result.lessonCount} lessons, ${result.questionCount} questions`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
