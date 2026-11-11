"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

/**
 * Fetches comprehensive administrative data including learners, courses,
 * transactions, author royalties, survey analytics, certificates, and review comments.
 *
 * @returns {Promise<any>} Aggregated admin dataset.
 */
export async function getAdminData() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  
  if (!session?.user || !['ADMIN', 'REVIEWER'].includes(role)) {
    return null;
  }

  // 1. Fetch Master Student Reports (ADMIN ONLY)
  let students: any[] = [];
  if (role === 'ADMIN') {
    const users = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      include: {
        enrollments: {
          include: { scormState: true, course: true }
        },
        quizAttempts: true
      }
    });

    students = users.map(user => {
      // Calculate overall progress across courses
      let maxProgress = 0;
      user.enrollments.forEach(enrollment => {
        let p = enrollment.progress || 0;
        enrollment.scormState.forEach(s => {
          if (s.cmiKey === 'cmi.progress_measure') {
            p = Math.max(p, Math.round(parseFloat(s.cmiValue) * 100));
          }
        });
        if (p > maxProgress) maxProgress = p;
      });

      // Calculate Quiz Scores (Best passed score)
      const quizzes: Record<string, { passed: boolean, score: number }> = {};
      user.quizAttempts.forEach(attempt => {
        if (!quizzes[attempt.quizId] || (!quizzes[attempt.quizId].passed && attempt.passed)) {
          quizzes[attempt.quizId] = {
            passed: attempt.passed,
            score: Math.round((attempt.score / attempt.maxScore) * 100)
          };
        }
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        lastActiveDate: user.lastActiveDate,
        country: user.country,
        organization: user.organization,
        profession: user.profession,
        businessStage: user.businessStage,
        sector: user.sector,
        awiefProgram: user.awiefProgram,
        yearsInBusiness: user.yearsInBusiness,
        isAwiefAlumni: user.isAwiefAlumni,
        scormProgress: Math.round(maxProgress),
        enrolledCount: user.enrollments.length,
        quizzes
      };
    });
  }

  // 2. Fetch Review Comments
  const reviewComments = await prisma.reviewComment.findMany({
    include: { user: true },
    orderBy: { createdAt: 'desc' }
  });

  // 3. Fetch Survey Responses
  const surveyResponses = await prisma.courseSurveyResponse.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
          country: true,
          organization: true,
          profession: true,
          sector: true,
          businessStage: true,
        }
      },
      course: {
        select: {
          title: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // 4. Fetch Certificates
  const certificates = await prisma.certificate.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
          country: true
        }
      }
    },
    orderBy: { issuedAt: 'desc' }
  });

  // 5. Fetch Courses
  const courses = await prisma.course.findMany({
    orderBy: { createdAt: 'asc' }
  });

  // 6. Fetch Transactions (for Author Royalties & Statement Engine)
  const transactionsRaw = await prisma.transaction.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
          country: true,
          organization: true
        }
      },
      course: {
        select: {
          id: true,
          title: true,
          authorName: true,
          authorRole: true,
          royaltyRate: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const transactions = transactionsRaw.map((t) => ({
    id: t.id,
    reference: t.reference,
    gateway: t.gateway,
    currency: t.currency,
    amountZar: t.amountZar,
    amountOriginal: t.amountOriginal,
    gatewayFeeZar: t.gatewayFeeZar,
    netAmountZar: t.netAmountZar,
    authorRoyaltyZar: t.authorRoyaltyZar,
    awiefShareZar: t.awiefShareZar,
    status: t.status,
    paymentMethodDetail: t.paymentMethodDetail,
    createdAt: t.createdAt.toISOString(),
    user: t.user,
    course: t.course
  }));

  // 7. Load Quizzes JSON / DB to get names
  const quizNames: Record<string, string> = {};
  try {
    const dbQuizzes = await prisma.quiz.findMany();
    if (dbQuizzes.length > 0) {
      dbQuizzes.forEach((q) => {
        quizNames[q.quizKey] = q.name;
        quizNames[q.id.toString()] = q.name;
      });
    } else {
      const quizzesPath = path.join(process.cwd(), "public", "moodle_quizzes.json");
      if (fs.existsSync(quizzesPath)) {
        const fileData = JSON.parse(fs.readFileSync(quizzesPath, "utf-8"));
        fileData.forEach((q: any) => {
          quizNames[q.id.toString()] = q.name;
        });
      }
    }
  } catch (e) {
    console.error("Error reading quiz names:", e);
  }

  return {
    students,
    reviewComments,
    surveyResponses,
    certificates,
    quizNames,
    courses,
    transactions,
    role
  };
}

export async function resolveComment(commentId: string) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  
  if (!session?.user || !['ADMIN', 'REVIEWER'].includes(role)) {
    return false;
  }

  await prisma.reviewComment.update({
    where: { id: commentId },
    data: { status: 'RESOLVED' }
  });
  
  return true;
}

// --- SELF-SERVICE COURSE MANAGEMENT ACTIONS ---
export async function saveAdminCourse(courseData: {
  id: string;
  title: string;
  category?: string;
  duration?: string;
  priceZar: number;
  priceUsd: number;
  isFree: boolean;
  authorName?: string;
  authorRole?: string;
  authorEmail?: string;
  authorBio?: string;
  royaltyRate?: number;
  shortDescription?: string;
  description?: string;
  isNative: boolean;
  isPublished: boolean;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return { success: false, error: "Unauthorized." };
  }

  try {
    await prisma.course.upsert({
      where: { id: courseData.id },
      update: {
        title: courseData.title,
        category: courseData.category,
        duration: courseData.duration,
        priceZar: courseData.priceZar,
        priceUsd: courseData.priceUsd,
        isFree: courseData.isFree,
        authorName: courseData.authorName,
        authorRole: courseData.authorRole,
        authorEmail: courseData.authorEmail,
        authorBio: courseData.authorBio,
        instructor: courseData.authorName,
        instructorRole: courseData.authorRole,
        royaltyRate: courseData.royaltyRate,
        shortDescription: courseData.shortDescription,
        description: courseData.description,
        isNative: courseData.isNative,
        isPublished: courseData.isPublished,
      },
      create: {
        id: courseData.id,
        title: courseData.title,
        category: courseData.category || "Masterclass",
        duration: courseData.duration || "2.5 Hours",
        priceZar: courseData.priceZar,
        priceUsd: courseData.priceUsd,
        isFree: courseData.isFree,
        authorName: courseData.authorName,
        authorRole: courseData.authorRole,
        authorEmail: courseData.authorEmail,
        authorBio: courseData.authorBio,
        instructor: courseData.authorName || "AWIEF Faculty",
        instructorRole: courseData.authorRole || "Practitioner",
        royaltyRate: courseData.royaltyRate || 35,
        shortDescription: courseData.shortDescription,
        description: courseData.description,
        isNative: courseData.isNative,
        isPublished: courseData.isPublished,
      }
    });

    return { success: true };
  } catch (err: any) {
    console.error("Error saving course:", err);
    return { success: false, error: err.message || "Failed to save course." };
  }
}

export async function deleteAdminCourse(courseId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return { success: false, error: "Unauthorized." };
  }

  try {
    await prisma.course.delete({
      where: { id: courseId }
    });
    return { success: true };
  } catch (err: any) {
    console.error("Error deleting course:", err);
    return { success: false, error: err.message || "Failed to delete course." };
  }
}

/**
 * Exports complete platform data (courses, learners, transactions, certificates, surveys)
 * in structured format for 1-click download, demonstrating zero vendor lock-in.
 */
export async function exportAllPlatformData() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized.");
  }

  const [courses, users, transactions, certificates, surveys] = await Promise.all([
    prisma.course.findMany(),
    prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, country: true, organization: true, sector: true, businessStage: true, createdAt: true } }),
    prisma.transaction.findMany(),
    prisma.certificate.findMany(),
    prisma.courseSurveyResponse.findMany(),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    organization: "Africa Women Innovation and Entrepreneurship Forum (AWIEF NPC)",
    platform: "AWIEF Digital Learning Academy",
    accreditation: "UN ECOSOC Special Consultative Status",
    counts: {
      courses: courses.length,
      users: users.length,
      transactions: transactions.length,
      certificates: certificates.length,
      surveys: surveys.length,
    },
    courses,
    users,
    transactions,
    certificates,
    surveys,
  };
}

// --- USER MANAGEMENT ACTIONS (ADMIN ONLY) ---
export async function getAllUsers() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") return [];

    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true, lastActiveDate: true },
      orderBy: { createdAt: 'desc' }
    });

    return users.map(u => ({
      ...u,
      createdAt: u.createdAt ? u.createdAt.toISOString() : new Date().toISOString(),
      lastActiveDate: u.lastActiveDate ? u.lastActiveDate.toISOString() : null
    }));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

export async function createUser(email: string, name: string, role: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return { success: false, error: "Unauthorized: Administrator access required." };
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanRole = role.trim().toUpperCase();

    if (!cleanEmail) {
      return { success: false, error: "Email is required." };
    }

    if (!['STUDENT', 'REVIEWER', 'ADMIN'].includes(cleanRole)) {
      return { success: false, error: "Invalid role selected." };
    }

    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      return { success: false, error: "A user with this email already exists." };
    }

    const hashedPassword = await bcrypt.hash("changeme123", 10);
    
    await prisma.user.create({
      data: {
        email: cleanEmail,
        name: cleanName || cleanEmail.split('@')[0],
        role: cleanRole,
        password: hashedPassword
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error creating user:", error);
    return { success: false, error: error.message || "Failed to create user." };
  }
}

export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return { success: false, error: "Unauthorized: Administrator access required." };
    }

    if (userId === (session.user as any).id) {
      return { success: false, error: "You cannot delete your own active administrator account." };
    }

    await prisma.user.delete({ where: { id: userId } });
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return { success: false, error: error.message || "Failed to delete user." };
  }
}

export async function updateUserRole(userId: string, role: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return { success: false, error: "Unauthorized: Administrator access required." };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role }
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error updating user role:", error);
    return { success: false, error: error.message || "Failed to update role." };
  }
}

export async function resetPasswordAdmin(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return { success: false, error: "Unauthorized: Administrator access required." };
    }

    const defaultHashed = await bcrypt.hash("changeme123", 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: defaultHashed }
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error resetting password:", error);
    return { success: false, error: error.message || "Failed to reset password." };
  }
}

export async function resetUserPassword(userId: string): Promise<{ success: boolean; error?: string }> {
  return resetPasswordAdmin(userId);
}

export async function getAdvancedQuizAnalytics() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'REVIEWER'].includes((session.user as any).role)) return null;

  const attempts = await prisma.quizAttempt.findMany({
    orderBy: { createdAt: 'asc' }
  });

  const analytics: Record<string, any> = {};

  attempts.forEach(attempt => {
    const qid = attempt.quizId;
    if (!analytics[qid]) {
      analytics[qid] = {
        totalAttempts: 0,
        uniqueUsers: new Set(),
        userAttempts: {} as Record<string, number>,
        userPassed: {} as Record<string, boolean>,
        questionFails: {} as Record<string, number>
      };
    }

    const quizStats = analytics[qid];
    quizStats.totalAttempts++;
    quizStats.uniqueUsers.add(attempt.userId);
    
    if (!quizStats.userAttempts[attempt.userId]) quizStats.userAttempts[attempt.userId] = 0;
    quizStats.userAttempts[attempt.userId]++;

    if (attempt.passed) {
      quizStats.userPassed[attempt.userId] = true;
    }

    if (attempt.details) {
      try {
        const details = JSON.parse(attempt.details);
        for (const [questionId, result] of Object.entries(details) as any[]) {
          if (!result.isCorrect) {
            quizStats.questionFails[questionId] = (quizStats.questionFails[questionId] || 0) + 1;
          }
        }
      } catch (e) {
        // invalid json
      }
    }
  });

  const finalAnalytics: Record<string, any> = {};
  
  for (const [qid, stats] of Object.entries(analytics)) {
    let totalAttemptsToPass = 0;
    let passedUsersCount = 0;

    for (const [userId, passed] of Object.entries(stats.userPassed)) {
      if (passed) {
        passedUsersCount++;
        totalAttemptsToPass += stats.userAttempts[userId];
      }
    }

    const avgAttemptsToPass = passedUsersCount > 0 ? (totalAttemptsToPass / passedUsersCount).toFixed(1) : 0;
    
    finalAnalytics[qid] = {
      totalAttempts: stats.totalAttempts,
      uniqueUsers: stats.uniqueUsers.size,
      passedUsers: passedUsersCount,
      avgAttemptsToPass,
      questionFails: stats.questionFails
    };
  }

  const questionMap: Record<string, string> = {};
  try {
    const quizzesPath = path.join(process.cwd(), "public", "moodle_quizzes.json");
    if (fs.existsSync(quizzesPath)) {
      const quizzesData = JSON.parse(fs.readFileSync(quizzesPath, "utf-8"));
      quizzesData.forEach((q: any) => {
        q.questions.forEach((question: any) => {
          questionMap[question.id.toString()] = question.questiontext.replace(/<[^>]+>/g, '').trim().substring(0, 100) + '...';
        });
      });
    }
  } catch (e) {
    // fallback
  }

  return { analytics: finalAnalytics, questionMap };
}

// --- COURSE-SCOPED USER MANAGEMENT & 360° STUDENT PROFILE ACTIONS ---

/**
 * Fetches the comprehensive 360° dossier for an individual student,
 * including LinkedIn-style profile data, all enrolled masterclasses,
 * module progress, quiz scores, certificates, and payment receipts.
 *
 * @param {string} userId - Target student ID.
 * @returns {Promise<any>} Full student dossier.
 */
export async function getStudentFullProfile(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'REVIEWER'].includes((session.user as any).role)) {
    throw new Error("Unauthorized.");
  }

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
        orderBy: { lastAccess: "desc" }
      },
      quizAttempts: {
        orderBy: { createdAt: "desc" }
      },
      transactions: {
        include: { course: { select: { title: true } } },
        orderBy: { createdAt: "desc" }
      },
      certificates: {
        include: { course: { select: { title: true } } },
        orderBy: { issuedAt: "desc" }
      }
    }
  });

  if (!user) return null;

  // Compute clean enrollment summaries
  const enrollments = user.enrollments.map((e) => {
    let progress = e.progress || 0;
    const stateMap: Record<string, string> = {};
    e.scormState.forEach((s) => (stateMap[s.cmiKey] = s.cmiValue));

    if (stateMap["cmi.progress_measure"]) {
      progress = Math.max(progress, Math.round(parseFloat(stateMap["cmi.progress_measure"]) * 100));
    } else if (
      stateMap["cmi.completion_status"] === "completed" ||
      stateMap["cmi.core.lesson_status"] === "completed" ||
      stateMap["cmi.core.lesson_status"] === "passed"
    ) {
      progress = 100;
    }

    return {
      enrollmentId: e.id,
      courseId: e.courseId,
      courseTitle: e.course.title,
      category: e.course.category,
      priceZar: e.course.priceZar,
      status: e.status,
      progress: Math.min(100, Math.round(progress)),
      lastAccess: e.lastAccess.toISOString(),
      completedAt: e.completedAt ? e.completedAt.toISOString() : null,
      certificateNumber: e.certificate?.certificateNumber || null,
      surveyCompleted: Boolean(e.surveyCompleted || e.surveyResponse)
    };
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    country: user.country,
    city: user.city,
    headline: user.headline,
    bio: user.bio,
    organization: user.organization,
    profession: user.profession,
    businessStage: user.businessStage,
    sector: user.sector,
    awiefProgram: user.awiefProgram,
    yearsInBusiness: user.yearsInBusiness,
    website: user.website,
    linkedinUrl: user.linkedinUrl,
    twitterUrl: user.twitterUrl,
    skills: user.skills,
    education: user.education,
    currentStreak: user.currentStreak,
    createdAt: user.createdAt.toISOString(),
    lastActiveDate: user.lastActiveDate ? user.lastActiveDate.toISOString() : null,
    enrollments,
    quizAttempts: user.quizAttempts.map((q) => ({
      id: q.id,
      quizId: q.quizId,
      score: q.score,
      maxScore: q.maxScore,
      passed: q.passed,
      createdAt: q.createdAt.toISOString()
    })),
    transactions: user.transactions.map((t) => ({
      id: t.id,
      reference: t.reference,
      courseTitle: t.course?.title,
      gateway: t.gateway,
      currency: t.currency,
      amountZar: t.amountZar,
      createdAt: t.createdAt.toISOString()
    })),
    certificates: user.certificates.map((c) => ({
      id: c.id,
      certificateNumber: c.certificateNumber,
      courseTitle: c.courseTitle,
      issuedAt: c.issuedAt.toISOString()
    }))
  };
}

/**
 * Enrolls a student directly into a specific course from the admin portal.
 *
 * @param {string} userId - Student ID.
 * @param {string} courseId - Course ID.
 * @returns {Promise<{ success: boolean; error?: string }>}
 */
export async function adminEnrollUserInCourse(userId: string, courseId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return { success: false, error: "Unauthorized." };
  }

  try {
    await prisma.enrollment.upsert({
      where: {
        userId_courseId: { userId, courseId }
      },
      update: {
        lastAccess: new Date()
      },
      create: {
        userId,
        courseId,
        status: "IN_PROGRESS",
        progress: 0
      }
    });

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Updates a student's completion rate or marks a course complete from admin.
 *
 * @param {string} enrollmentId - Enrollment ID.
 * @param {number} progress - Completion percentage (0 to 100).
 * @returns {Promise<{ success: boolean; error?: string }>}
 */
export async function adminUpdateEnrollmentProgress(enrollmentId: string, progress: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const isComplete = progress >= 100;
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        progress,
        status: isComplete ? "COMPLETED" : "IN_PROGRESS",
        completedAt: isComplete ? new Date() : null,
        lastAccess: new Date()
      }
    });

    // Update scormState as well
    await prisma.scormState.upsert({
      where: {
        enrollmentId_cmiKey: { enrollmentId, cmiKey: "cmi.progress_measure" }
      },
      update: { cmiValue: (progress / 100).toFixed(2) },
      create: { enrollmentId, cmiKey: "cmi.progress_measure", cmiValue: (progress / 100).toFixed(2) }
    });

    if (isComplete) {
      await prisma.scormState.upsert({
        where: {
          enrollmentId_cmiKey: { enrollmentId, cmiKey: "cmi.completion_status" }
        },
        update: { cmiValue: "completed" },
        create: { enrollmentId, cmiKey: "cmi.completion_status", cmiValue: "completed" }
      });
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Unenrolls a student from a course.
 *
 * @param {string} enrollmentId - Enrollment ID.
 * @returns {Promise<{ success: boolean; error?: string }>}
 */
export async function adminUnenrollUser(enrollmentId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return { success: false, error: "Unauthorized." };
  }

  try {
    await prisma.enrollment.delete({ where: { id: enrollmentId } });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Fetches the course-scoped roster with filterable student telemetry.
 *
 * @param {string} courseId - Optional Course ID to scope by.
 * @returns {Promise<any[]>} List of enrolled students for this course.
 */
export async function getCourseRoster(courseId?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['ADMIN', 'REVIEWER'].includes((session.user as any).role)) {
    return [];
  }

  const whereClause: any = {};
  if (courseId && courseId !== "ALL") {
    whereClause.courseId = courseId;
  }

  const enrollments = await prisma.enrollment.findMany({
    where: whereClause,
    include: {
      user: true,
      course: { select: { id: true, title: true, category: true } },
      scormState: true,
      certificate: true,
      surveyResponse: true,
    },
    orderBy: { lastAccess: "desc" }
  });

  const [allQuizzes, allAttempts, allTxs] = await Promise.all([
    prisma.quiz.findMany(),
    prisma.quizAttempt.findMany({ where: { passed: true } }),
    prisma.transaction.findMany()
  ]);

  return enrollments.map((e) => {
    let progress = e.progress || 0;
    const stateMap: Record<string, string> = {};
    e.scormState.forEach((s) => (stateMap[s.cmiKey] = s.cmiValue));

    if (stateMap["cmi.progress_measure"]) {
      progress = Math.max(progress, Math.round(parseFloat(stateMap["cmi.progress_measure"]) * 100));
    } else if (
      stateMap["cmi.completion_status"] === "completed" ||
      stateMap["cmi.core.lesson_status"] === "completed"
    ) {
      progress = 100;
    }

    // Quizzes for this course
    const courseQuizzes = allQuizzes.filter((q) => q.courseId === e.courseId);
    const userPassed = allAttempts.filter(
      (a) => a.userId === e.userId && courseQuizzes.some((cq) => cq.quizKey === a.quizId || cq.id.toString() === a.quizId)
    );

    // Latest transaction
    const tx = allTxs.find((t) => t.userId === e.userId && t.courseId === e.courseId);

    return {
      enrollmentId: e.id,
      userId: e.userId,
      studentName: e.user.name || "Anonymous",
      email: e.user.email,
      country: e.user.country || "ZA",
      city: e.user.city || "",
      organization: e.user.organization || "Independent Enterprise",
      profession: e.user.profession || "Founder",
      businessStage: e.user.businessStage || "Growth Stage",
      sector: e.user.sector || "Enterprise",
      courseId: e.courseId,
      courseTitle: e.course.title,
      progress: Math.min(100, Math.round(progress)),
      status: e.status,
      lastAccess: e.lastAccess.toISOString(),
      passedQuizzesCount: userPassed.length,
      totalCourseQuizzes: courseQuizzes.length,
      certificateNumber: e.certificate?.certificateNumber || null,
      gateway: tx?.gateway || (e.progress > 0 ? "DIRECT" : "SCHOLARSHIP")
    };
  });
}

