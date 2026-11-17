"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import {
  parseLearnDashWxrXml,
  parseLearnDashJson,
  parseLearnDashZip,
  getSampleLearnDashXml,
  type ParsedLearnDashCourse,
} from "@/lib/learndashImporter";
import {
  isScormManifestXml,
  parseScormPackageBuffer,
  getSampleScormManifestXml,
} from "@/lib/scormImporter";
import { extractZipEntries } from "@/lib/zipUtils";

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

// --- SELF-SERVICE COURSE MANAGEMENT & LEARNDASH IMPORT ACTIONS ---

export interface InlineQuizInput {
  quizKey?: string;
  moduleIndex?: number;
  name: string;
  intro?: string;
  questions: {
    id?: number;
    name?: string;
    questiontext: string;
    answers: {
      id?: number;
      text: string;
      isCorrect: boolean;
    }[];
  }[];
}

/**
 * Generates a unique URL-friendly slug for a course record.
 */
async function ensureUniqueCourseSlug(baseSlug: string, excludeCourseId?: string): Promise<string> {
  const cleanBase =
    baseSlug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || `course-${Date.now()}`;

  let candidate = cleanBase;
  let counter = 2;
  while (true) {
    const existing = await prisma.course.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeCourseId) {
      return candidate;
    }
    candidate = `${cleanBase}-${counter++}`;
  }
}

/**
 * Syncs an array of quizzes into the Quiz table for a given course and returns quizKey mapping.
 */
async function syncInlineQuizzesForCourse(
  courseId: string,
  quizzes: InlineQuizInput[]
): Promise<Record<number, string>> {
  const existingQuizzes = await prisma.quiz.findMany();
  let maxKey = existingQuizzes.reduce((max, q) => {
    const num = parseInt(q.quizKey, 10);
    return !isNaN(num) && num > max ? num : max;
  }, 0);

  let maxQuestionId = 100;
  let maxAnswerId = 1000;
  existingQuizzes.forEach((q) => {
    try {
      const qs = JSON.parse(q.questionsJson);
      if (Array.isArray(qs)) {
        qs.forEach((qu: any) => {
          if (qu.id && qu.id > maxQuestionId) maxQuestionId = qu.id;
          if (Array.isArray(qu.answers)) {
            qu.answers.forEach((a: any) => {
              if (a.id && a.id > maxAnswerId) maxAnswerId = a.id;
            });
          }
        });
      }
    } catch {
      // ignore malformed JSON
    }
  });

  const moduleToQuizKey: Record<number, string> = {};

  for (let i = 0; i < quizzes.length; i++) {
    const q = quizzes[i];
    if (!q.name?.trim()) continue;

    const quizKey = q.quizKey && q.quizKey.trim() ? q.quizKey.trim() : String(++maxKey);
    const formattedQuestions = (q.questions || []).map((qu, qIdx) => {
      const qId = qu.id && qu.id > 0 ? qu.id : ++maxQuestionId;
      const trimmedPrompt = qu.questiontext.trim();
      const promptHtml =
        trimmedPrompt.startsWith("<p>") && trimmedPrompt.endsWith("</p>")
          ? trimmedPrompt
          : `<p>${trimmedPrompt}</p>`;

      return {
        id: qId,
        qtype: "multichoice",
        name: qu.name?.trim() || `Question ${qIdx + 1}`,
        questiontext: promptHtml,
        answers: (qu.answers || []).map((ans) => ({
          id: ans.id && ans.id > 0 ? ans.id : ++maxAnswerId,
          text: ans.text.trim(),
          isCorrect: Boolean(ans.isCorrect),
        })),
      };
    });

    await prisma.quiz.upsert({
      where: { quizKey },
      update: {
        courseId,
        name: q.name.trim(),
        intro: (q.intro || "").trim(),
        questionsJson: JSON.stringify(formattedQuestions),
      },
      create: {
        quizKey,
        courseId,
        name: q.name.trim(),
        intro: (q.intro || "").trim(),
        questionsJson: JSON.stringify(formattedQuestions),
      },
    });

    if (typeof q.moduleIndex === "number") {
      moduleToQuizKey[q.moduleIndex] = quizKey;
    }
  }

  return moduleToQuizKey;
}

/**
 * Fetches quizzes belonging to a specific course for the Course Builder editor.
 *
 * @param {string} courseId - Target course ID.
 * @returns {Promise<InlineQuizInput[]>} Quizzes attached to this course.
 */
export async function getCourseQuizzesAdmin(courseId: string): Promise<InlineQuizInput[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "REVIEWER"].includes((session.user as any).role)) {
    return [];
  }

  const rows = await prisma.quiz.findMany({
    where: { courseId },
    orderBy: { id: "asc" },
  });

  return rows.map((r) => {
    let questions: any[] = [];
    try {
      questions = JSON.parse(r.questionsJson);
    } catch {
      questions = [];
    }
    return {
      quizKey: r.quizKey,
      name: r.name,
      intro: r.intro,
      questions: questions.map((q: any) => ({
        id: q.id,
        name: q.name,
        questiontext: String(q.questiontext || "").replace(/<[^>]+>/g, "").trim(),
        answers: Array.isArray(q.answers)
          ? q.answers.map((a: any) => ({
              id: a.id,
              text: String(a.text || "").replace(/<[^>]+>/g, "").trim(),
              isCorrect: Boolean(a.isCorrect),
            }))
          : [],
      })),
    };
  });
}

/**
 * Creates or updates a commercial masterclass / course, including its full curriculum modules,
 * learning objectives, thumbnail, delivery mode, and embedded module quizzes.
 *
 * @param {object} courseData - Full course configuration and curriculum payload.
 * @returns {Promise<{ success: boolean; courseId?: string; error?: string }>}
 */
export async function saveAdminCourse(courseData: {
  id: string;
  title: string;
  slug?: string;
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
  targetAudience?: string;
  thumbnailUrl?: string;
  learningObjectives?: string;
  modulesJson?: string;
  scormPath?: string;
  learndashSourceId?: string;
  isNative: boolean;
  isPublished: boolean;
  inlineQuizzes?: InlineQuizInput[];
  detachedQuizKeys?: string[];
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const idPrefix =
      (courseData.title || "course")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || "course";
    const cleanId =
      courseData.id?.trim() ||
      `${idPrefix}-${Date.now().toString().slice(-4)}`;

    const uniqueSlug = await ensureUniqueCourseSlug(
      courseData.slug || courseData.title || cleanId,
      cleanId
    );

    // Delete quizzes explicitly detached in CourseBuilder (unless re-attached in inlineQuizzes)
    if (courseData.detachedQuizKeys && courseData.detachedQuizKeys.length > 0) {
      const activeKeys = new Set(
        (courseData.inlineQuizzes || []).map((q) => q.quizKey).filter(Boolean)
      );
      const keysToDelete = courseData.detachedQuizKeys.filter((k) => k && !activeKeys.has(k));
      if (keysToDelete.length > 0) {
        await prisma.quiz.deleteMany({
          where: {
            courseId: cleanId,
            quizKey: { in: keysToDelete },
          },
        });
      }
    }

    // Sync any inline module quizzes first so we can bind module.quizId accurately
    let finalModulesJson = courseData.modulesJson;
    if (courseData.inlineQuizzes && courseData.inlineQuizzes.length > 0) {
      const moduleToQuizKey = await syncInlineQuizzesForCourse(cleanId, courseData.inlineQuizzes);
      if (finalModulesJson) {
        try {
          const parsedMods = JSON.parse(finalModulesJson);
          if (Array.isArray(parsedMods)) {
            parsedMods.forEach((m: any, idx: number) => {
              if (moduleToQuizKey[idx]) {
                m.quizId = moduleToQuizKey[idx];
              }
            });
            finalModulesJson = JSON.stringify(parsedMods);
          }
        } catch {
          // keep original modulesJson
        }
      }
    }

    await prisma.course.upsert({
      where: { id: cleanId },
      update: {
        title: courseData.title,
        slug: uniqueSlug,
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
        targetAudience: courseData.targetAudience,
        thumbnailUrl: courseData.thumbnailUrl,
        learningObjectives: courseData.learningObjectives,
        modulesJson: finalModulesJson,
        scormPath: courseData.scormPath,
        learndashSourceId: courseData.learndashSourceId,
        isNative: courseData.isNative,
        isPublished: courseData.isPublished,
      },
      create: {
        id: cleanId,
        title: courseData.title,
        slug: uniqueSlug,
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
        royaltyRate: courseData.royaltyRate ?? 35,
        shortDescription: courseData.shortDescription,
        description: courseData.description,
        targetAudience: courseData.targetAudience,
        thumbnailUrl: courseData.thumbnailUrl || "/images/investment-readiness.png",
        learningObjectives: courseData.learningObjectives,
        modulesJson: finalModulesJson,
        scormPath: courseData.scormPath,
        learndashSourceId: courseData.learndashSourceId,
        isNative: courseData.isNative,
        isPublished: courseData.isPublished,
      },
    });

    return { success: true, courseId: cleanId };
  } catch (err: any) {
    console.error("Error saving course:", err);
    return { success: false, error: err.message || "Failed to save course." };
  }
}

/**
 * Parses an uploaded LearnDash export file (.xml, .json, or .zip) into normalized preview data.
 *
 * @param {object} payload - File name and base64-encoded content (or sample flag).
 * @returns {Promise<{ success: boolean; courses?: ParsedLearnDashCourse[]; sampleXml?: string; error?: string }>}
 */
export async function parseLearnDashExportAction(payload: {
  fileName?: string;
  base64Content?: string;
  useSample?: boolean | "learndash" | "scorm";
}): Promise<{
  success: boolean;
  courses?: ParsedLearnDashCourse[];
  sampleXml?: string;
  error?: string;
}> {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return { success: false, error: "Unauthorized." };
  }

  try {
    if (payload.useSample === "scorm") {
      const sampleXml = getSampleScormManifestXml();
      const courses = parseScormPackageBuffer(Buffer.from(sampleXml, "utf8"), {
        fileName: "awief-esg-scorm-manifest.xml",
      });
      return { success: true, courses, sampleXml };
    }

    if (payload.useSample) {
      const sampleXml = getSampleLearnDashXml();
      const courses = parseLearnDashWxrXml(sampleXml);
      return { success: true, courses, sampleXml };
    }

    if (!payload.fileName || !payload.base64Content) {
      return { success: false, error: "No export file provided." };
    }

    const buffer = Buffer.from(payload.base64Content, "base64");
    const lowerName = payload.fileName.toLowerCase();

    if (lowerName.endsWith(".zip")) {
      const scormEntries = extractZipEntries(buffer, {
        filter: (name) => /imsmanifest\.xml$|tincan\.xml$/i.test(name),
      });
      if (scormEntries.length > 0) {
        const pkgId = `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const extractDir = path.join(process.cwd(), "public", "uploads", "scorm", pkgId);
        const courses = parseScormPackageBuffer(buffer, {
          extractDir,
          publicBaseUrl: `/api/uploads/scorm/${pkgId}`,
          fileName: payload.fileName,
        });
        return { success: true, courses };
      }

      const courses = parseLearnDashZip(buffer);
      return { success: true, courses };
    }

    const textContent = buffer.toString("utf8");
    if (lowerName.endsWith(".json")) {
      const courses = parseLearnDashJson(textContent);
      return { success: true, courses };
    }

    if (isScormManifestXml(textContent)) {
      const courses = parseScormPackageBuffer(buffer, { fileName: payload.fileName });
      return { success: true, courses };
    }

    if (lowerName.endsWith(".xml") || textContent.trim().startsWith("<")) {
      const courses = parseLearnDashWxrXml(textContent);
      return { success: true, courses };
    }

    return {
      success: false,
      error: "Unsupported file type. Please upload a LearnDash (.xml, .json, .zip) or SCORM (.zip, imsmanifest.xml) export.",
    };
  } catch (err: any) {
    console.error("Course package parse error:", err);
    return {
      success: false,
      error: err.message || "Could not parse the uploaded course package.",
    };
  }
}

/**
 * Imports a previewed LearnDash course (along with its modules, learning objectives, and quizzes)
 * directly into the AWIEF LMS database.
 *
 * @param {ParsedLearnDashCourse} course - Reviewed course structure from LearnDash import wizard.
 * @param {object} options - Override pricing, author, and publish settings.
 * @returns {Promise<{ success: boolean; courseId?: string; quizCount?: number; error?: string }>}
 */
export async function importLearnDashCourseAction(
  course: ParsedLearnDashCourse,
  options: {
    title: string;
    category: string;
    authorName: string;
    authorRole: string;
    authorEmail?: string;
    isFree: boolean;
    priceZar: number;
    priceUsd: number;
    royaltyRate: number;
    isPublished: boolean;
  }
): Promise<{ success: boolean; courseId?: string; quizCount?: number; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const baseId =
      (options.title || course.slug || "imported-course")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 44) || "imported-course";

    // Ensure course ID does not overwrite an existing unrelated course
    let courseId = baseId;
    const existingById = await prisma.course.findUnique({ where: { id: courseId } });
    if (existingById) {
      courseId = `${baseId}-${Date.now().toString().slice(-4)}`;
    }

    const uniqueSlug = await ensureUniqueCourseSlug(course.slug || options.title || courseId, courseId);

    // Prepare inline quizzes & map them to modules
    const inlineQuizzes: InlineQuizInput[] = (course.quizzes || []).map((q, qIdx) => {
      const attachedModIdx = course.modules.findIndex(
        (m) => m.attachedQuizIndex === qIdx
      );
      return {
        moduleIndex: attachedModIdx >= 0 ? attachedModIdx : undefined,
        name: q.name,
        intro: q.intro,
        questions: q.questions.map((qu, qIdx) => ({
          name: qu.name || `Question ${qIdx + 1}`,
          questiontext: qu.questiontext,
          answers: qu.answers,
        })),
      };
    });

    const modulesPayload = course.modules.map((m) => ({
      id: m.id,
      title: m.title,
      duration: m.duration,
      summary: m.summary,
      videoUrl: m.videoUrl,
      caseStudy: m.caseStudy,
      keyTakeaways: m.keyTakeaways,
      templateName: m.templateName,
      templateUrl: m.templateUrl,
      topics: m.topics,
    }));

    let finalModulesJson = JSON.stringify(modulesPayload);
    let syncedQuizCount = 0;

    if (inlineQuizzes.length > 0) {
      const moduleToQuizKey = await syncInlineQuizzesForCourse(courseId, inlineQuizzes);
      syncedQuizCount = inlineQuizzes.length;

      const parsedMods = JSON.parse(finalModulesJson);
      parsedMods.forEach((m: any, idx: number) => {
        if (moduleToQuizKey[idx]) {
          m.quizId = moduleToQuizKey[idx];
        }
      });
      finalModulesJson = JSON.stringify(parsedMods);
    }

    await prisma.course.create({
      data: {
        id: courseId,
        title: options.title.trim() || course.title,
        slug: uniqueSlug,
        category: options.category.trim() || course.category || "Masterclass",
        duration: course.duration || `${course.modules.length} Modules`,
        shortDescription: course.shortDescription,
        description: course.description,
        targetAudience: course.targetAudience,
        thumbnailUrl: course.thumbnailUrl || "/images/investment-readiness.png",
        learningObjectives: JSON.stringify(course.learningObjectives || []),
        modulesJson: finalModulesJson,
        authorName: options.authorName.trim() || course.authorName || "AWIEF Faculty",
        authorRole: options.authorRole.trim() || course.authorRole || "Course Author",
        authorEmail: options.authorEmail?.trim() || course.authorEmail || null,
        instructor: options.authorName.trim() || course.authorName || "AWIEF Faculty",
        instructorRole: options.authorRole.trim() || course.authorRole || "Course Author",
        isFree: options.isFree,
        priceZar: options.isFree ? 0 : options.priceZar,
        priceUsd: options.isFree ? 0 : options.priceUsd,
        royaltyRate: options.royaltyRate,
        learndashSourceId: course.learndashSourceId,
        scormPath: course.scormPath || null,
        isNative: course.isNative ?? true,
        isPublished: options.isPublished,
      },
    });

    return { success: true, courseId, quizCount: syncedQuizCount };
  } catch (err: any) {
    console.error("Error importing LearnDash course:", err);
    return { success: false, error: err.message || "Failed to import LearnDash course." };
  }
}

export async function deleteAdminCourse(courseId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return { success: false, error: "Unauthorized." };
  }

  try {
    await prisma.quiz.deleteMany({
      where: { courseId },
    });
    await prisma.reviewComment.deleteMany({
      where: { courseId },
    });
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

