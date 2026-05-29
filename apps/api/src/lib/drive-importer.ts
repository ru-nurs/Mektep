import fs from "node:fs";
import path from "node:path";
import { google, drive_v3 } from "googleapis";
import { Prisma, QuestionType } from "@prisma/client";
import { config } from "../config";
import { prisma } from "../prisma";

type QuizPayload = {
  questions: Array<{
    question: string;
    type: QuestionType;
    options?: Array<{ id: string; text: string; isCorrect: boolean }>;
    explanation?: string;
  }>;
};

function stripOrderPrefix(name: string) {
  return name.replace(/^\d+[_\-.\s]*/, "").trim();
}

function slugify(input: string) {
  return stripOrderPrefix(input)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s+/g, "_");
}

function titleize(input: string) {
  return stripOrderPrefix(input).replace(/[_-]+/g, " ").trim();
}

async function buildDriveClient() {
  const serviceAccountPath = path.resolve(config.GOOGLE_SERVICE_ACCOUNT_JSON);
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(`Service account json not found at ${serviceAccountPath}`);
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: serviceAccountPath,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  return google.drive({ version: "v3", auth });
}

async function listChildren(drive: drive_v3.Drive, folderId: string) {
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id,name,mimeType)",
    pageSize: 200,
  });

  return (response.data.files || []).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

async function downloadAsText(drive: drive_v3.Drive, fileId: string) {
  const response = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });

  return new Promise<string>((resolve, reject) => {
    let data = "";
    response.data.on("data", (chunk) => {
      data += chunk;
    });
    response.data.on("end", () => resolve(data));
    response.data.on("error", (err) => reject(err));
  });
}

function splitMarkdownToBlocks(markdown: string) {
  return markdown
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part, idx) => ({
      blockType: "text",
      content: { markdown: part },
      orderIndex: idx,
    }));
}

export async function importFromGoogleDrive(folderId = config.GOOGLE_DRIVE_FOLDER_ID) {
  if (!folderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID is not configured");
  }

  console.log(`[drive-import] start folderId=${folderId}`);
  const drive = await buildDriveClient();
  const courseFolders = await listChildren(drive, folderId);
  console.log(`[drive-import] found ${courseFolders.length} top-level items`);

  for (const [courseIndex, courseFolder] of courseFolders.entries()) {
    if (courseFolder.mimeType !== "application/vnd.google-apps.folder" || !courseFolder.id || !courseFolder.name) {
      continue;
    }

    const courseSlug = slugify(courseFolder.name);
    const courseTitle = titleize(courseFolder.name);

    const course = await prisma.course.upsert({
      where: { slug: courseSlug },
      create: {
        slug: courseSlug,
        title: courseTitle,
        description: "Imported from Google Drive",
        isPublished: true,
        orderIndex: courseIndex,
      },
      update: {
        title: courseTitle,
        isPublished: true,
        orderIndex: courseIndex,
      },
    });

    // Idempotent import: replace tree for this course to avoid duplicates.
    await prisma.module.deleteMany({ where: { courseId: course.id } });

    const moduleFolders = await listChildren(drive, courseFolder.id);
    console.log(`[drive-import] course=${courseSlug} modules=${moduleFolders.length}`);

    for (const [moduleIndex, moduleFolder] of moduleFolders.entries()) {
      if (moduleFolder.mimeType !== "application/vnd.google-apps.folder" || !moduleFolder.id || !moduleFolder.name) {
        continue;
      }

      const module = await prisma.module.create({
        data: {
          courseId: course.id,
          title: titleize(moduleFolder.name),
          description: "Imported from Google Drive",
          orderIndex: moduleIndex,
        },
      });

      const moduleFiles = await listChildren(drive, moduleFolder.id);
      const lessonMd = moduleFiles.find((f) => f.name?.toLowerCase() === "lesson.md");
      const taskPy = moduleFiles.find((f) => f.name?.toLowerCase() === "task.py");
      const quizJson = moduleFiles.find((f) => f.name?.toLowerCase() === "quiz.json");

      const lesson = await prisma.lesson.create({
        data: {
          moduleId: module.id,
          title: titleize(moduleFolder.name),
          slug: slugify(moduleFolder.name),
          lessonType: "THEORY",
          isPublished: true,
          orderIndex: 0,
        },
      });

      let blockOrder = 0;

      if (lessonMd?.id) {
        const markdown = await downloadAsText(drive, lessonMd.id);
        const textBlocks = splitMarkdownToBlocks(markdown);

        for (const block of textBlocks) {
          await prisma.lessonBlock.create({
            data: {
              lessonId: lesson.id,
              blockType: block.blockType,
              content: block.content,
              orderIndex: blockOrder++,
            },
          });
        }
      }

      if (taskPy?.id) {
        const starterCode = await downloadAsText(drive, taskPy.id);
        await prisma.lessonBlock.create({
          data: {
            lessonId: lesson.id,
            blockType: "code",
            content: {
              language: "python",
              starterCode,
              tests: [],
            },
            orderIndex: blockOrder++,
          },
        });
      }

      if (quizJson?.id) {
        const rawQuiz = await downloadAsText(drive, quizJson.id);
        const parsedQuiz = JSON.parse(rawQuiz) as QuizPayload;

        for (const [questionIndex, item] of (parsedQuiz.questions || []).entries()) {
          await prisma.quizQuestion.create({
            data: {
              lessonId: lesson.id,
              question: item.question,
              questionType: item.type || "SINGLE",
              options: item.options ? (item.options as Prisma.InputJsonValue) : undefined,
              explanation: item.explanation,
              orderIndex: questionIndex,
            },
          });
        }
      }

      console.log(`[drive-import] lesson imported: ${lesson.slug}`);
    }
  }

  console.log("[drive-import] completed");
}
