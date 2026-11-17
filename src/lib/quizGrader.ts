import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

interface RawAnswer {
  id: number;
  text: string;
  isCorrect?: boolean;
}

interface RawQuestion {
  id: number;
  qtype?: string;
  name?: string;
  questiontext: string;
  answers?: RawAnswer[];
}

/**
 * Strips `isCorrect` answer keys from quiz questions before returning payloads
 * to learner client components so answers cannot be inspected in browser DevTools.
 */
export function stripQuizAnswersForClient(questions: RawQuestion[]): RawQuestion[] {
  return (questions || []).map((q) => ({
    ...q,
    answers: Array.isArray(q.answers)
      ? q.answers.map((a) => ({ id: a.id, text: a.text }))
      : [],
  }));
}

/**
 * Loads authoritative quiz questions from Prisma `Quiz` (with JSON fallback)
 * and grades a learner's selected answers strictly on the server.
 *
 * @param quizKeyOrId - Quiz key or numeric identifier.
 * @param selectedAnswersByQuestionId - Map of questionId -> selectedAnswerId.
 * @returns Authoritative score, maxScore, percentage, pass flag, and detailed breakdown.
 */
export async function gradeQuizOnServer(
  quizKeyOrId: string,
  selectedAnswersByQuestionId: Record<string, number | null>
): Promise<{
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  details: Record<string, { isCorrect: boolean; selectedAnswerId: number | null }>;
}> {
  const numericId = parseInt(quizKeyOrId, 10);
  let questions: RawQuestion[] = [];

  const dbQuiz = await prisma.quiz.findFirst({
    where: {
      OR: [
        { quizKey: quizKeyOrId },
        ...(!isNaN(numericId) ? [{ id: numericId }] : []),
      ],
    },
  });

  if (dbQuiz) {
    try {
      const parsed = JSON.parse(dbQuiz.questionsJson);
      if (Array.isArray(parsed)) questions = parsed;
    } catch {
      questions = [];
    }
  } else {
    try {
      const quizzesPath = path.join(process.cwd(), "public", "moodle_quizzes.json");
      if (fs.existsSync(quizzesPath)) {
        const allQuizzes = JSON.parse(fs.readFileSync(quizzesPath, "utf-8"));
        const match = Array.isArray(allQuizzes)
          ? allQuizzes.find((q: { id: number | string }) => String(q.id) === quizKeyOrId)
          : null;
        if (match && Array.isArray(match.questions)) {
          questions = match.questions;
        }
      }
    } catch {
      questions = [];
    }
  }

  let score = 0;
  const maxScore = questions.length;
  const details: Record<string, { isCorrect: boolean; selectedAnswerId: number | null }> = {};

  for (const q of questions) {
    const qKey = String(q.id);
    const selectedId = selectedAnswersByQuestionId[qKey] ?? null;
    const correctAns = Array.isArray(q.answers)
      ? q.answers.find((a) => Boolean(a.isCorrect))
      : undefined;
    const isCorrect = Boolean(correctAns && selectedId !== null && selectedId === correctAns.id);
    if (isCorrect) score += 1;
    details[qKey] = { isCorrect, selectedAnswerId: selectedId };
  }

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const passed = maxScore > 0 ? percentage >= 80 : false;

  return { score, maxScore, percentage, passed, details };
}
