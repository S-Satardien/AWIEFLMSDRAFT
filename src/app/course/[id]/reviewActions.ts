"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SAFE_REVIEWER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
} as const;

async function requireReviewerOrAdmin() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const role = (session?.user as { role?: string } | undefined)?.role || "";
  if (!userId || !["ADMIN", "REVIEWER"].includes(role)) {
    throw new Error("Unauthorized: Reviewer or Administrator role required.");
  }
  return { userId, role };
}

export async function addReviewComment(
  courseId: string,
  _ignoredUserId: string,
  lessonHash: string,
  selectedText: string,
  elementSelector: string,
  comment: string
) {
  const { userId } = await requireReviewerOrAdmin();
  return await prisma.reviewComment.create({
    data: {
      courseId,
      userId,
      lessonHash,
      selectedText,
      elementSelector,
      comment,
    },
  });
}

export async function getReviewComments() {
  await requireReviewerOrAdmin();
  return await prisma.reviewComment.findMany({
    include: { user: { select: SAFE_REVIEWER_SELECT } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCourseReviewComments(courseId: string) {
  await requireReviewerOrAdmin();
  return await prisma.reviewComment.findMany({
    where: { courseId },
    include: { user: { select: SAFE_REVIEWER_SELECT } },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateReviewComment(
  commentId: string,
  _ignoredUserId: string,
  newComment: string
) {
  const { userId, role } = await requireReviewerOrAdmin();
  const comment = await prisma.reviewComment.findUnique({ where: { id: commentId } });
  if (!comment || (comment.userId !== userId && role !== "ADMIN")) {
    throw new Error("Unauthorized");
  }

  return await prisma.reviewComment.update({
    where: { id: commentId },
    data: { comment: newComment },
  });
}

export async function deleteReviewComment(commentId: string, _ignoredUserId: string) {
  const { userId, role } = await requireReviewerOrAdmin();
  const comment = await prisma.reviewComment.findUnique({ where: { id: commentId } });
  if (!comment || (comment.userId !== userId && role !== "ADMIN")) {
    throw new Error("Unauthorized");
  }

  return await prisma.reviewComment.delete({
    where: { id: commentId },
  });
}
