"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptPii } from "@/lib/encryption";

export async function getDashboardData() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const userId = (session.user as any).id;

  // Get user details with full relationships
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      enrollments: {
        include: {
          course: true,
          scormState: true,
          certificate: true,
          surveyResponse: true,
        },
      },
      quizAttempts: true,
      transactions: {
        orderBy: { createdAt: "desc" }
      }
    },
  });

  if (!user) return null;

  // Compute multi-course enrollment progress
  const enrolledCourses = user.enrollments.map((enrollment) => {
    let progress = enrollment.progress || 0;
    const stateMap: Record<string, string> = {};
    enrollment.scormState.forEach((s) => (stateMap[s.cmiKey] = s.cmiValue));

    if (stateMap["cmi.progress_measure"]) {
      progress = Math.max(progress, Math.round(parseFloat(stateMap["cmi.progress_measure"]) * 100));
    } else if (
      stateMap["cmi.completion_status"] === "completed" ||
      stateMap["cmi.core.lesson_status"] === "completed" ||
      stateMap["cmi.core.lesson_status"] === "passed"
    ) {
      progress = 100;
    }

    const isComplete = progress >= 100 || enrollment.status === "COMPLETED";
    const hasSurvey = Boolean(enrollment.surveyCompleted || enrollment.surveyResponse);
    const hasCertificate = Boolean(enrollment.certificate);

    // Find latest transaction for this course
    const tx = user.transactions.find((t) => t.courseId === enrollment.courseId);

    return {
      id: enrollment.courseId,
      title: enrollment.course.title,
      category: enrollment.course.category || "Masterclass",
      duration: enrollment.course.duration || "Self-Paced",
      instructor: enrollment.course.instructor || enrollment.course.authorName || "AWIEF Faculty",
      progress: Math.min(100, progress),
      isComplete,
      surveyCompleted: hasSurvey,
      certificateNumber: enrollment.certificate?.certificateNumber || null,
      lastAccess: enrollment.lastAccess,
      receipt: tx ? {
        reference: tx.reference,
        gateway: tx.gateway,
        amountZar: tx.amountZar,
        currency: tx.currency,
        createdAt: tx.createdAt.toISOString()
      } : null
    };
  });

  // Calculate overall metrics
  const totalCourses = enrolledCourses.length;
  const completedCourses = enrolledCourses.filter((c) => c.isComplete).length;
  const totalCertificates = enrolledCourses.filter((c) => c.certificateNumber).length;
  
  const avgProgress =
    totalCourses > 0
      ? Math.round(enrolledCourses.reduce((acc, c) => acc + c.progress, 0) / totalCourses)
      : 0;

  // Native Quizzes passed
  const passedQuizzes = await prisma.quizAttempt.groupBy({
    by: ["quizId"],
    where: {
      userId,
      passed: true,
    },
  });
  const quizzesPassedCount = passedQuizzes.length;

  const allAttempts = await prisma.quizAttempt.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const quizStatus: Record<string, boolean> = {};
  for (const attempt of allAttempts) {
    if (!quizStatus[attempt.quizId]) {
      quizStatus[attempt.quizId] = attempt.passed;
    } else if (attempt.passed) {
      quizStatus[attempt.quizId] = true;
    }
  }

  // Streak logic
  let currentStreak = user.currentStreak || 1;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (user.lastActiveDate) {
    const lastActive = new Date(user.lastActiveDate);
    const lastActiveDay = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());
    const diffDays = Math.floor(Math.abs(today.getTime() - lastActiveDay.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak += 1;
      await prisma.user.update({
        where: { id: userId },
        data: { currentStreak, lastActiveDate: now },
      });
    } else if (diffDays > 1) {
      currentStreak = 1;
      await prisma.user.update({
        where: { id: userId },
        data: { currentStreak, lastActiveDate: now },
      });
    }
  } else {
    currentStreak = 1;
    await prisma.user.update({
      where: { id: userId },
      data: { currentStreak, lastActiveDate: now },
    });
  }

  // Calculate total user points:
  // 10 pts per 1% progress + 100 per quiz + 150 per survey + 200 per certificate
  const progressPoints = enrolledCourses.reduce((acc, c) => acc + c.progress * 10, 0);
  const quizPoints = quizzesPassedCount * 100;
  const surveyPoints = enrolledCourses.filter((c) => c.surveyCompleted).length * 150;
  const certPoints = totalCertificates * 200;
  const totalPoints = progressPoints + quizPoints + surveyPoints + certPoints;

  return {
    userName: user.name || user.email.split("@")[0],
    userEmail: user.email,
    userCountry: user.country,
    organization: decryptPii(user.organization),
    profession: user.profession,
    businessStage: user.businessStage,
    sector: user.sector,
    headline: decryptPii(user.headline),
    enrolledCourses,
    totalCourses,
    completedCourses,
    totalCertificates,
    avgProgress,
    quizzesPassedCount,
    quizStatus,
    currentStreak,
    totalPoints,
  };
}

export async function getLeaderboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];

  const users = await prisma.user.findMany({
    where: { showOnLeaderboard: true },
    select: {
      id: true,
      name: true,
      country: true,
      organization: true,
      profession: true,
      showOnLeaderboard: true,
      enrollments: {
        include: {
          scormState: true,
          certificate: true,
          surveyResponse: true,
        },
      },
      quizAttempts: { where: { passed: true } },
    },
  });

  const leaderboard = users.map((u) => {
    let totalProgress = 0;
    u.enrollments.forEach((enrollment) => {
      let progress = enrollment.progress || 0;
      const stateMap: Record<string, string> = {};
      enrollment.scormState.forEach((s) => (stateMap[s.cmiKey] = s.cmiValue));

      if (stateMap["cmi.progress_measure"]) {
        progress = Math.max(progress, parseFloat(stateMap["cmi.progress_measure"]) * 100);
      } else if (
        stateMap["cmi.completion_status"] === "completed" ||
        stateMap["cmi.core.lesson_status"] === "completed" ||
        stateMap["cmi.core.lesson_status"] === "passed"
      ) {
        progress = 100;
      }
      totalProgress += progress;
    });

    const passedQuizIds = new Set(u.quizAttempts.map((q) => q.quizId));
    const quizzesPassed = passedQuizIds.size;
    const certificatesCount = u.enrollments.filter((e) => e.certificate).length;
    const surveysCount = u.enrollments.filter((e) => e.surveyCompleted || e.surveyResponse).length;

    const points = Math.round(totalProgress * 10) + quizzesPassed * 100 + surveysCount * 150 + certificatesCount * 200;

    return {
      id: u.id,
      name: u.name,
      country: u.country,
      organization: decryptPii(u.organization),
      profession: u.profession,
      showOnLeaderboard: u.showOnLeaderboard,
      points,
      coursesEnrolled: u.enrollments.length,
      certificatesCount,
    };
  });

  leaderboard.sort((a, b) => b.points - a.points);

  return leaderboard
    .map((l, index) => ({
      ...l,
      rank: index + 1,
      displayName:
        l.showOnLeaderboard && l.name
          ? l.name
          : `Specialist #${l.id.substring(l.id.length - 4).toUpperCase()}`,
      displayCountry: l.showOnLeaderboard ? l.country : null,
      displayOrg: l.showOnLeaderboard ? l.organization : null,
    }))
    .slice(0, 5);
}

export async function getMyCoursesList() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { enrolled: [], available: [] };

  const userId = (session.user as any).id;

  const [courses, enrollments, userTxs, allQuizzes, userAttempts] = await Promise.all([
    prisma.course.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "asc" }
    }),
    prisma.enrollment.findMany({
      where: { userId },
      include: {
        scormState: true,
        certificate: true,
        surveyResponse: true
      }
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    }),
    prisma.quiz.findMany(),
    prisma.quizAttempt.findMany({
      where: { userId, passed: true }
    })
  ]);

  const enrollmentMap = new Map();
  for (const e of enrollments) {
    enrollmentMap.set(e.courseId, e);
  }

  const passedQuizIds = new Set(userAttempts.map((a) => a.quizId));

  const allProcessed = courses.map((course) => {
    const enrollment = enrollmentMap.get(course.id);
    let progress = enrollment?.progress || 0;
    
    if (enrollment) {
      const stateMap: Record<string, string> = {};
      enrollment.scormState.forEach((s: any) => stateMap[s.cmiKey] = s.cmiValue);
      if (stateMap['cmi.progress_measure']) {
        progress = Math.max(progress, Math.round(parseFloat(stateMap['cmi.progress_measure']) * 100));
      } else if (
        stateMap['cmi.completion_status'] === 'completed' ||
        stateMap['cmi.core.lesson_status'] === 'completed' ||
        stateMap['cmi.core.lesson_status'] === 'passed'
      ) {
        progress = 100;
      }
    }

    // Attached quizzes for this course
    const courseQuizzes = allQuizzes.filter((q) => q.courseId === course.id);
    const passedCount = courseQuizzes.filter((q) => passedQuizIds.has(q.quizKey) || passedQuizIds.has(q.id.toString())).length;

    // Latest receipt
    const tx = userTxs.find((t) => t.courseId === course.id);

    // Number of modules
    let moduleCount = 4;
    if (course.modulesJson) {
      try {
        const parsed = JSON.parse(course.modulesJson);
        if (Array.isArray(parsed)) moduleCount = parsed.length;
      } catch (e) {}
    }

    return {
      id: course.id,
      title: course.title,
      shortDescription: course.shortDescription || course.description,
      category: course.category,
      duration: course.duration,
      instructor: course.authorName || course.instructor || "AWIEF Faculty",
      authorRole: course.authorRole || course.instructorRole || "Lead Faculty",
      priceZar: course.priceZar,
      priceUsd: course.priceUsd,
      isFree: course.isFree,
      isEnrolled: !!enrollment,
      progress: Math.min(100, Math.round(progress)),
      surveyCompleted: !!enrollment?.surveyCompleted || !!enrollment?.surveyResponse,
      certificateNumber: enrollment?.certificate?.certificateNumber || null,
      moduleCount,
      totalQuizzes: courseQuizzes.length,
      passedQuizzes: passedCount,
      receipt: tx ? {
        reference: tx.reference,
        gateway: tx.gateway,
        amountZar: tx.amountZar,
        currency: tx.currency,
        createdAt: tx.createdAt.toISOString()
      } : null
    };
  });

  return {
    enrolled: allProcessed.filter((c) => c.isEnrolled),
    available: allProcessed.filter((c) => !c.isEnrolled)
  };
}
