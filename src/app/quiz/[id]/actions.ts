"use server";

import { prisma } from "@/lib/prisma";

export async function submitQuizAttempt(userId: string, quizId: string, score: number, maxScore: number, details?: string) {
  const percentage = (score / maxScore) * 100;
  const passed = percentage >= 80; // Pass mark is 80%

  await prisma.quizAttempt.create({
    data: {
      userId,
      quizId,
      score,
      maxScore,
      passed,
      details,
    }
  });

  return { passed, percentage };
}

export async function submitQuizReviewComment(userId: string, quizId: string, questionNumber: number, comment: string, questionText: string) {
  // Save as a ReviewComment with courseId = "quiz-{id}" and lessonHash = "Question {number}"
  await prisma.reviewComment.create({
    data: {
      courseId: `quiz-${quizId}`,
      userId,
      lessonHash: `Question ${questionNumber}`,
      selectedText: questionText,
      elementSelector: `quiz-q-${questionNumber}`,
      comment,
      status: "OPEN"
    }
  });
  return true;
}

export async function getQuizComments(quizId: string) {
  return await prisma.reviewComment.findMany({
    where: { courseId: `quiz-${quizId}` },
    include: { user: true },
    orderBy: { createdAt: 'desc' }
  });
}

export async function updateQuizComment(commentId: string, newComment: string, userId: string) {
  const comment = await prisma.reviewComment.findUnique({ where: { id: commentId } });
  if (!comment || comment.userId !== userId) throw new Error("Unauthorized");

  await prisma.reviewComment.update({
    where: { id: commentId },
    data: { comment: newComment }
  });
  return true;
}

export async function deleteQuizComment(commentId: string, userId: string) {
  const comment = await prisma.reviewComment.findUnique({ where: { id: commentId } });
  if (!comment || comment.userId !== userId) throw new Error("Unauthorized");

  await prisma.reviewComment.delete({
    where: { id: commentId }
  });
  return true;
}
