"use server";

import { prisma } from "@/lib/prisma";

export async function addReviewComment(
  courseId: string, 
  userId: string, 
  lessonHash: string, 
  selectedText: string, 
  elementSelector: string, 
  comment: string
) {
  return await prisma.reviewComment.create({
    data: {
      courseId,
      userId,
      lessonHash,
      selectedText,
      elementSelector,
      comment
    }
  });
}

export async function getReviewComments() {
  return await prisma.reviewComment.findMany({
    include: { user: true },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getCourseReviewComments(courseId: string) {
  return await prisma.reviewComment.findMany({
    where: { courseId },
    include: { user: true },
    orderBy: { createdAt: 'desc' }
  });
}

export async function updateReviewComment(commentId: string, userId: string, newComment: string) {
  const comment = await prisma.reviewComment.findUnique({ where: { id: commentId } });
  if (!comment || comment.userId !== userId) throw new Error("Unauthorized");

  return await prisma.reviewComment.update({
    where: { id: commentId },
    data: { comment: newComment }
  });
}

export async function deleteReviewComment(commentId: string, userId: string) {
  const comment = await prisma.reviewComment.findUnique({ where: { id: commentId } });
  if (!comment || comment.userId !== userId) throw new Error("Unauthorized");

  return await prisma.reviewComment.delete({
    where: { id: commentId }
  });
}
