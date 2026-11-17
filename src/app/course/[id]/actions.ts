"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gradeQuizOnServer, stripQuizAnswersForClient } from "@/lib/quizGrader";

async function requireAuthenticatedUser(): Promise<{ userId: string; role: string }> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const role = (session?.user as { role?: string } | undefined)?.role || "STUDENT";
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return { userId, role };
}

async function verifyEnrollmentOwnership(enrollmentId: string) {
  const { userId, role } = await requireAuthenticatedUser();
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { id: true, userId: true, courseId: true },
  });
  if (!enrollment) {
    throw new Error("Enrollment not found.");
  }
  if (enrollment.userId !== userId && role !== "ADMIN") {
    throw new Error("Forbidden: You do not own this enrollment.");
  }
  return enrollment;
}

/**
 * Fetches course metadata by ID.
 */
export async function getCourseDetails(courseId: string) {
  return await prisma.course.findUnique({
    where: { id: courseId },
  });
}

/**
 * Retrieves all SCORM CMI state key-value pairs for a verified enrollment.
 */
export async function getScormState(enrollmentId: string) {
  await verifyEnrollmentOwnership(enrollmentId);

  const states = await prisma.scormState.findMany({
    where: { enrollmentId },
  });

  const stateMap: Record<string, string> = {};
  for (const s of states) {
    stateMap[s.cmiKey] = s.cmiValue;
  }
  return stateMap;
}

/**
 * Sets a SCORM state key and synchronizes overall enrollment progress for the owning learner.
 */
export async function setScormState(enrollmentId: string, key: string, value: string) {
  await verifyEnrollmentOwnership(enrollmentId);

  await prisma.scormState.upsert({
    where: {
      enrollmentId_cmiKey: {
        enrollmentId,
        cmiKey: key,
      },
    },
    update: { cmiValue: value },
    create: { enrollmentId, cmiKey: key, cmiValue: value },
  });

  if (key === "cmi.progress_measure") {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      const pVal = Math.min(100, Math.max(0, Math.round(parsed <= 1.0 ? parsed * 100 : parsed)));
      await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          progress: pVal,
          status: pVal >= 100 ? "COMPLETED" : "IN_PROGRESS",
          completedAt: pVal >= 100 ? new Date() : undefined,
          lastAccess: new Date(),
        },
      });
    }
  }

  if (
    (key === "cmi.completion_status" && value === "completed") ||
    (key === "cmi.core.lesson_status" && (value === "completed" || value === "passed"))
  ) {
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: "COMPLETED",
        progress: 100,
        completedAt: new Date(),
        lastAccess: new Date(),
      },
    });
  }

  return true;
}

/**
 * Updates progress for native modular courses after verifying enrollment ownership.
 */
export async function updateNativeModuleProgress(
  enrollmentId: string,
  completedModuleIds: string[],
  totalModules: number
) {
  await verifyEnrollmentOwnership(enrollmentId);

  const uniqueCompleted = Array.from(new Set(completedModuleIds)).slice(
    0,
    Math.max(1, totalModules)
  );
  const percent =
    totalModules > 0
      ? Math.min(100, Math.round((uniqueCompleted.length / totalModules) * 100))
      : 0;

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      progress: percent,
      status: percent >= 100 ? "COMPLETED" : "IN_PROGRESS",
      completedAt: percent >= 100 ? new Date() : undefined,
      lastAccess: new Date(),
    },
  });

  await prisma.scormState.upsert({
    where: {
      enrollmentId_cmiKey: {
        enrollmentId,
        cmiKey: "awief.native.completed_modules",
      },
    },
    update: { cmiValue: JSON.stringify(uniqueCompleted) },
    create: {
      enrollmentId,
      cmiKey: "awief.native.completed_modules",
      cmiValue: JSON.stringify(uniqueCompleted),
    },
  });

  await prisma.scormState.upsert({
    where: {
      enrollmentId_cmiKey: {
        enrollmentId,
        cmiKey: "cmi.progress_measure",
      },
    },
    update: { cmiValue: (percent / 100).toFixed(2) },
    create: {
      enrollmentId,
      cmiKey: "cmi.progress_measure",
      cmiValue: (percent / 100).toFixed(2),
    },
  });

  if (percent >= 100) {
    await prisma.scormState.upsert({
      where: {
        enrollmentId_cmiKey: {
          enrollmentId,
          cmiKey: "cmi.completion_status",
        },
      },
      update: { cmiValue: "completed" },
      create: {
        enrollmentId,
        cmiKey: "cmi.completion_status",
        cmiValue: "completed",
      },
    });
  }

  return { success: true, progress: percent };
}

/**
 * Retrieves the verified enrollment ID for the signed-in user.
 * Auto-creates only for free courses or Admin/Reviewer inspection (blocks unpaid bypass).
 */
export async function getEnrollmentId(
  _ignoredUserId: string,
  courseId: string,
  createIfMissing: boolean = false
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const role = (session?.user as { role?: string } | undefined)?.role || "STUDENT";
  if (!userId) return null;

  let enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
  });

  if (!enrollment && createIfMissing) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, isFree: true },
    });
    if (course && (course.isFree || role === "ADMIN" || role === "REVIEWER")) {
      enrollment = await prisma.enrollment.create({
        data: {
          userId,
          courseId,
          status: "IN_PROGRESS",
        },
      });
    }
  }

  return enrollment?.id || null;
}

/**
 * Retrieves course quizzes (without exposing answer keys) and the signed-in learner's attempts.
 */
export async function getCourseQuizzesAndGrades(courseId: string, _ignoredUserId?: string) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const quizzes = await prisma.quiz.findMany({
    where: { courseId },
    orderBy: { id: "asc" },
  });

  const parsedQuizzes = quizzes.map((q) => {
    let questions: ReturnType<typeof stripQuizAnswersForClient> = [];
    try {
      questions = stripQuizAnswersForClient(JSON.parse(q.questionsJson));
    } catch {
      questions = [];
    }
    return {
      id: q.quizKey,
      dbId: q.id,
      courseId: q.courseId,
      name: q.name,
      intro: q.intro,
      questions,
    };
  });

  let attempts: Array<{
    id: string;
    quizId: string;
    score: number;
    maxScore: number;
    passed: boolean;
    createdAt: Date;
  }> = [];

  if (userId && parsedQuizzes.length > 0) {
    attempts = await prisma.quizAttempt.findMany({
      where: {
        userId,
        quizId: { in: parsedQuizzes.map((q) => q.id) },
      },
      select: {
        id: true,
        quizId: true,
        score: true,
        maxScore: true,
        passed: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  return { quizzes: parsedQuizzes, attempts };
}

/**
 * Grades and persists a learner's module assessment strictly on the server
 * from submitted answer selections (ignoring client-provided scores).
 */
export async function submitCourseQuizAttempt(
  quizId: string,
  selectedAnswersByQuestionId: Record<string, number | null>
) {
  const { userId } = await requireAuthenticatedUser();
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

  return {
    passed: graded.passed,
    percentage: graded.percentage,
    score: graded.score,
    maxScore: graded.maxScore,
  };
}
