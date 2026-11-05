"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

/**
 * Type definitions for Quiz, Question, and Answer structures
 */
export interface AnswerItem {
  id: number;
  text: string;
  isCorrect: boolean;
}

export interface QuestionItem {
  id: number;
  qtype: string;
  name: string;
  questiontext: string;
  answers: AnswerItem[];
}

export interface QuizItem {
  id: number;
  courseId?: string | null;
  name: string;
  intro: string;
  questions: QuestionItem[];
}

const QUIZZES_FILE_PATH = path.join(process.cwd(), "public", "moodle_quizzes.json");

/**
 * Helper to read quizzes from disk safely (fallback)
 */
function readQuizzesFile(): QuizItem[] {
  try {
    if (!fs.existsSync(QUIZZES_FILE_PATH)) {
      return [];
    }
    const data = fs.readFileSync(QUIZZES_FILE_PATH, "utf-8");
    return JSON.parse(data) as QuizItem[];
  } catch {
    return [];
  }
}

/**
 * Helper to write quizzes to disk safely (best effort in local dev, ignored on read-only serverless)
 */
function tryWriteQuizzesFile(quizzes: QuizItem[]): void {
  try {
    fs.writeFileSync(QUIZZES_FILE_PATH, JSON.stringify(quizzes, null, 2), "utf-8");
  } catch {
    // Ignore EROFS error on Vercel serverless filesystem
  }
}

/**
 * Helper to verify Admin authorization
 */
async function verifyAdminRole() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || role !== "ADMIN") {
    throw new Error("Unauthorized: Only administrators can manage quizzes.");
  }
  return session;
}

/**
 * Synchronizes an in-memory QuizItem to the database Quiz table
 */
async function syncQuizToDb(quiz: QuizItem) {
  try {
    await prisma.quiz.upsert({
      where: { quizKey: quiz.id.toString() },
      update: {
        name: quiz.name,
        intro: quiz.intro,
        courseId: quiz.courseId || null,
        questionsJson: JSON.stringify(quiz.questions),
      },
      create: {
        quizKey: quiz.id.toString(),
        name: quiz.name,
        intro: quiz.intro,
        courseId: quiz.courseId || null,
        questionsJson: JSON.stringify(quiz.questions),
      },
    });
  } catch (err) {
    console.error("Database sync error for quiz:", err);
  }
}

/**
 * Fetches all quizzes with their full questions and answers.
 * Optionally filters by courseId if specified.
 */
export async function getQuizzesForManagement(courseId?: string): Promise<QuizItem[]> {
  await verifyAdminRole();

  try {
    const whereClause = courseId && courseId !== "ALL" ? { courseId } : {};
    const dbQuizzes = await prisma.quiz.findMany({
      where: whereClause,
      orderBy: { id: "asc" }
    });
    if (dbQuizzes.length > 0) {
      return dbQuizzes.map((q) => {
        let questions: QuestionItem[] = [];
        try {
          questions = JSON.parse(q.questionsJson);
        } catch {
          questions = [];
        }
        return {
          id: parseInt(q.quizKey, 10) || q.id,
          courseId: q.courseId,
          name: q.name,
          intro: q.intro,
          questions,
        };
      });
    }
  } catch (err) {
    console.error("Error reading quizzes from database:", err);
  }

  // Fallback to file and seed to DB
  const fileQuizzes = readQuizzesFile();
  for (const q of fileQuizzes) {
    await syncQuizToDb(q);
  }
  return courseId && courseId !== "ALL"
    ? fileQuizzes.filter((q) => q.courseId === courseId)
    : fileQuizzes;
}

/**
 * Updates quiz title, description, or assigned course.
 */
export async function updateQuizMetadata(quizId: number, data: { name: string; intro?: string; courseId?: string | null }): Promise<QuizItem> {
  await verifyAdminRole();

  if (!data.name || !data.name.trim()) {
    throw new Error("Quiz title cannot be empty.");
  }

  const quizzes = await getQuizzesForManagement();
  const quizIndex = quizzes.findIndex((q) => q.id === quizId);
  if (quizIndex === -1) {
    throw new Error(`Quiz with ID ${quizId} not found.`);
  }

  quizzes[quizIndex].name = data.name.trim();
  quizzes[quizIndex].intro = data.intro !== undefined ? data.intro.trim() : quizzes[quizIndex].intro;
  if (data.courseId !== undefined) {
    quizzes[quizIndex].courseId = data.courseId;
  }

  await syncQuizToDb(quizzes[quizIndex]);
  tryWriteQuizzesFile(quizzes);
  return quizzes[quizIndex];
}

/**
 * Creates a new quiz while preserving existing quiz IDs and linking to a course.
 */
export async function createNewQuiz(data: { name: string; intro?: string; courseId?: string | null }): Promise<QuizItem> {
  await verifyAdminRole();

  if (!data.name || !data.name.trim()) {
    throw new Error("Quiz title cannot be empty.");
  }

  const quizzes = await getQuizzesForManagement();
  const maxId = quizzes.reduce((max, q) => (q.id > max ? q.id : max), 0);
  const newId = maxId + 1;

  const newQuiz: QuizItem = {
    id: newId,
    courseId: data.courseId || null,
    name: data.name.trim(),
    intro: data.intro ? data.intro.trim() : "",
    questions: []
  };

  quizzes.push(newQuiz);
  await syncQuizToDb(newQuiz);
  tryWriteQuizzesFile(quizzes);
  return newQuiz;
}

/**
 * Saves (creates or updates) a question within a specified quiz.
 */
export async function saveQuestion(
  quizId: number,
  questionData: {
    id?: number;
    name?: string;
    questiontext: string;
    answers: { id?: number; text: string; isCorrect: boolean }[];
  }
): Promise<QuizItem> {
  await verifyAdminRole();

  if (!questionData.questiontext || !questionData.questiontext.trim()) {
    throw new Error("Question text cannot be empty.");
  }

  if (!questionData.answers || questionData.answers.length < 2) {
    throw new Error("A question must have at least 2 answer choices.");
  }

  const hasCorrectAnswer = questionData.answers.some((a) => a.isCorrect);
  if (!hasCorrectAnswer) {
    throw new Error("Please select at least one correct answer.");
  }

  const quizzes = await getQuizzesForManagement();
  const quizIndex = quizzes.findIndex((q) => q.id === quizId);
  if (quizIndex === -1) {
    throw new Error(`Quiz with ID ${quizId} not found.`);
  }

  const targetQuiz = quizzes[quizIndex];

  const formatText = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.startsWith("<p>") && trimmed.endsWith("</p>")) {
      return trimmed;
    }
    return `<p>${trimmed}</p>`;
  };

  let globalMaxAnswerId = 0;
  quizzes.forEach((q) => {
    q.questions.forEach((qu) => {
      qu.answers.forEach((ans) => {
        if (ans.id > globalMaxAnswerId) globalMaxAnswerId = ans.id;
      });
    });
  });

  const formattedAnswers: AnswerItem[] = questionData.answers.map((ans, idx) => {
    if (!ans.text || !ans.text.trim()) {
      throw new Error(`Answer choice ${idx + 1} cannot be empty.`);
    }
    const answerId = ans.id && ans.id > 0 ? ans.id : ++globalMaxAnswerId;
    return {
      id: answerId,
      text: formatText(ans.text),
      isCorrect: Boolean(ans.isCorrect)
    };
  });

  if (questionData.id) {
    const qIndex = targetQuiz.questions.findIndex((q) => q.id === questionData.id);
    if (qIndex === -1) {
      throw new Error(`Question with ID ${questionData.id} not found in Quiz ${quizId}.`);
    }

    targetQuiz.questions[qIndex] = {
      ...targetQuiz.questions[qIndex],
      name: questionData.name?.trim() || targetQuiz.questions[qIndex].name || `Question ${qIndex + 1}`,
      questiontext: formatText(questionData.questiontext),
      answers: formattedAnswers
    };
  } else {
    let maxQuestionId = 0;
    quizzes.forEach((q) => {
      q.questions.forEach((qu) => {
        if (qu.id > maxQuestionId) maxQuestionId = qu.id;
      });
    });
    const newQuestionId = maxQuestionId + 1;
    const questionNumber = targetQuiz.questions.length + 1;

    const newQuestion: QuestionItem = {
      id: newQuestionId,
      qtype: "multichoice",
      name: questionData.name?.trim() || `Question ${questionNumber}`,
      questiontext: formatText(questionData.questiontext),
      answers: formattedAnswers
    };

    targetQuiz.questions.push(newQuestion);
  }

  await syncQuizToDb(targetQuiz);
  tryWriteQuizzesFile(quizzes);
  return targetQuiz;
}

/**
 * Deletes a question from a specified quiz.
 */
export async function deleteQuestion(quizId: number, questionId: number): Promise<QuizItem> {
  await verifyAdminRole();

  const quizzes = await getQuizzesForManagement();
  const quizIndex = quizzes.findIndex((q) => q.id === quizId);
  if (quizIndex === -1) {
    throw new Error(`Quiz with ID ${quizId} not found.`);
  }

  const targetQuiz = quizzes[quizIndex];
  targetQuiz.questions = targetQuiz.questions.filter((q) => q.id !== questionId);

  targetQuiz.questions.forEach((q, idx) => {
    if (q.name.startsWith("Question ")) {
      q.name = `Question ${idx + 1}`;
    }
  });

  await syncQuizToDb(targetQuiz);
  tryWriteQuizzesFile(quizzes);
  return targetQuiz;
}

/**
 * Deletes an entire quiz.
 */
export async function deleteQuiz(quizId: number): Promise<QuizItem[]> {
  await verifyAdminRole();

  let quizzes = await getQuizzesForManagement();
  const exists = quizzes.some((q) => q.id === quizId);
  if (!exists) {
    throw new Error(`Quiz with ID ${quizId} not found.`);
  }

  try {
    await prisma.quiz.deleteMany({
      where: { quizKey: quizId.toString() }
    });
  } catch (err) {
    console.error("Error deleting quiz from DB:", err);
  }

  quizzes = quizzes.filter((q) => q.id !== quizId);
  tryWriteQuizzesFile(quizzes);
  return quizzes;
}
