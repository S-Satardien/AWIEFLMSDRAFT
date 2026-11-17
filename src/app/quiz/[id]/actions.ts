"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gradeQuizOnServer } from "@/lib/quizGrader";

const SAFE_REVIEWER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
} as const;

async function requireAuthenticated() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const role = (session?.user as { role?: string } | undefined)?.role || "STUDENT";
  if (!userId) throw new Error("Unauthorized");
  return { userId, role };
}

/**
 * Grades and records a standalone quiz attempt strictly on the server.
 */
export async function submitQuizAttempt(
  quizId: string,
  selectedAnswersByQuestionId: Record<string, number | null>
) {
  const { userId } = await requireAuthenticated();
  const graded = await gradeQuizOnServer(quizId, selectedAnswersByQuestionId);

  await prisma.quizAttempt.create({
    data: {
      userId,
      quizId,
      score: graded.score,
      maxScore: graded.maxScore,
      passed: graded.passed,
      details: JSON.stringify(graded.details),
    },
  });

  return { passed: graded.passed, percentage: graded.percentage };
}

export async function submitQuizReviewComment(
  _ignoredUserId: string,
  quizId: string,
  questionNumber: number,
  comment: string,
  questionText: string
) {
  const { userId, role } = await requireAuthenticated();
  if (!["ADMIN", "REVIEWER"].includes(role)) {
    throw new Error("Unauthorized");
  }

  await prisma.reviewComment.create({
    data: {
      courseId: `quiz-${quizId}`,
      userId,
      lessonHash: `Question ${questionNumber}`,
      selectedText: questionText,
      elementSelector: `quiz-q-${questionNumber}`,
      comment,
      status: "OPEN",
    },
  });
  return true;
}

export async function getQuizComments(quizId: string) {
  const { role } = await requireAuthenticated();
  if (!["ADMIN", "REVIEWER"].includes(role)) {
    throw new Error("Unauthorized");
  }

  return await prisma.reviewComment.findMany({
    where: { courseId: `quiz-${quizId}` },
    include: { user: { select: SAFE_REVIEWER_SELECT } },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateQuizComment(
  commentId: string,
  newComment: string,
  _ignoredUserId: string
) {
  const { userId, role } = await requireAuthenticated();
  const comment = await prisma.reviewComment.findUnique({ where: { id: commentId } });
  if (!comment || (comment.userId !== userId && role !== "ADMIN")) {
    throw new Error("Unauthorized");
  }

  await prisma.reviewComment.update({
    where: { id: commentId },
    data: { comment: newComment },
  });
  return true;
}

export async function deleteQuizComment(commentId: string, _ignoredUserId: string) {
  const { userId, role } = await requireAuthenticated();
  const comment = await prisma.reviewComment.findUnique({ where: { id: commentId } });
  if (!comment || (comment.userId !== userId && role !== "ADMIN")) {
    throw new Error("Unauthorized");
  }

  await prisma.reviewComment.delete({
    where: { id: commentId },
  });
  return true;
}
