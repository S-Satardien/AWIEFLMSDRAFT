"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface SubmitReviewResult {
  success: boolean;
  error?: string;
  review?: {
    id: string;
    rating: number;
    title: string | null;
    comment: string;
    createdAt: string;
  };
}

/**
 * Creates or updates a verified learner review for a course.
 * Strictly requires an active enrollment with 100% completion or COMPLETED status.
 *
 * @param courseId - Target course identifier.
 * @param payload - Rating (1-5), optional review headline, and review text.
 * @returns Result object indicating success or validation/eligibility error.
 */
export async function submitCourseReview(
  courseId: string,
  payload: { rating: number; title?: string; comment: string }
): Promise<SubmitReviewResult> {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return { success: false, error: "Please sign in to submit a course review." };
    }

    const rating = Math.round(Number(payload.rating));
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return { success: false, error: "Please select a star rating between 1 and 5." };
    }

    const comment = (payload.comment || "").trim();
    if (comment.length < 10) {
      return {
        success: false,
        error: "Please write at least 10 characters sharing what you gained from this masterclass.",
      };
    }
    if (comment.length > 2000) {
      return {
        success: false,
        error: "Review comment must be 2,000 characters or fewer.",
      };
    }

    const cleanTitle = (payload.title || "").trim().slice(0, 120) || null;

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      select: {
        status: true,
        progress: true,
      },
    });

    if (!enrollment) {
      return {
        success: false,
        error: "Only enrolled learners who have completed 100% of this course can submit a review.",
      };
    }

    const isCompleted = enrollment.progress >= 100 || enrollment.status === "COMPLETED";
    if (!isCompleted) {
      return {
        success: false,
        error: `Complete 100% of the curriculum before submitting a verified review (currently ${Math.round(
          enrollment.progress
        )}%).`,
      };
    }

    const saved = await prisma.courseReview.upsert({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      update: {
        rating,
        title: cleanTitle,
        comment,
        isVerified: true,
      },
      create: {
        userId,
        courseId,
        rating,
        title: cleanTitle,
        comment,
        isVerified: true,
      },
    });

    revalidatePath("/");
    revalidatePath("/catalog");
    revalidatePath(`/courses/${courseId}`);
    revalidatePath(`/course/${courseId}`);
    revalidatePath(`/certificate/${courseId}`);

    return {
      success: true,
      review: {
        id: saved.id,
        rating: saved.rating,
        title: saved.title,
        comment: saved.comment,
        createdAt: saved.createdAt.toISOString(),
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save review.";
    return { success: false, error: message };
  }
}

/**
 * Deletes the currently signed-in learner's review for a given course.
 *
 * @param courseId - Target course identifier.
 * @returns Success status object.
 */
export async function deleteOwnCourseReview(
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return { success: false, error: "Authentication required." };
    }

    await prisma.courseReview.deleteMany({
      where: {
        userId,
        courseId,
      },
    });

    revalidatePath("/");
    revalidatePath("/catalog");
    revalidatePath(`/courses/${courseId}`);
    revalidatePath(`/course/${courseId}`);
    revalidatePath(`/certificate/${courseId}`);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete review.";
    return { success: false, error: message };
  }
}

/**
 * Retrieves review eligibility (100% completion check) and existing review
 * for the authenticated learner on a given course.
 *
 * @param courseId - Target course identifier.
 * @returns Eligibility flag, completion %, and existing review if any.
 */
export async function getCourseReviewStatusForCurrentUser(courseId: string): Promise<{
  isEnrolled: boolean;
  progress: number;
  canReview: boolean;
  existingReview: {
    id: string;
    rating: number;
    title: string | null;
    comment: string;
    createdAt: string;
  } | null;
}> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return { isEnrolled: false, progress: 0, canReview: false, existingReview: null };
  }

  const [enrollment, review] = await Promise.all([
    prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { progress: true, status: true },
    }),
    prisma.courseReview.findUnique({
      where: { userId_courseId: { userId, courseId } },
    }),
  ]);

  const progress = enrollment?.progress ?? 0;
  const canReview = Boolean(
    enrollment && (progress >= 100 || enrollment.status === "COMPLETED")
  );

  return {
    isEnrolled: Boolean(enrollment),
    progress,
    canReview,
    existingReview: review
      ? {
          id: review.id,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          createdAt: review.createdAt.toISOString(),
        }
      : null,
  };
}
