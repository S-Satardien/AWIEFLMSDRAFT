"use server";

import { prisma } from "@/lib/prisma";

/**
 * Fetches course metadata by ID.
 *
 * @param {string} courseId - The course identifier.
 * @returns {Promise<any>} The course record.
 */
export async function getCourseDetails(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId }
  });
  return course;
}

/**
 * Retrieves all SCORM CMI state key-value pairs for an enrollment.
 *
 * @param {string} enrollmentId - The enrollment ID.
 * @returns {Promise<Record<string, string>>} Key-value map of SCORM states.
 */
export async function getScormState(enrollmentId: string) {
  const states = await prisma.scormState.findMany({
    where: { enrollmentId }
  });
  
  const stateMap: Record<string, string> = {};
  for (const s of states) {
    stateMap[s.cmiKey] = s.cmiValue;
  }
  return stateMap;
}

/**
 * Sets a SCORM state key and synchronizes overall enrollment progress and completion status.
 *
 * @param {string} enrollmentId - The enrollment ID.
 * @param {string} key - SCORM CMI key.
 * @param {string} value - SCORM value.
 * @returns {Promise<boolean>} Success indicator.
 */
export async function setScormState(enrollmentId: string, key: string, value: string) {
  await prisma.scormState.upsert({
    where: {
      enrollmentId_cmiKey: {
        enrollmentId,
        cmiKey: key
      }
    },
    update: {
      cmiValue: value
    },
    create: {
      enrollmentId,
      cmiKey: key,
      cmiValue: value
    }
  });

  // Track real-time progress percentages in Enrollment
  if (key === 'cmi.progress_measure') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      const pVal = Math.min(100, Math.max(0, Math.round(parsed <= 1.0 ? parsed * 100 : parsed)));
      await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          progress: pVal,
          status: pVal >= 100 ? 'COMPLETED' : 'IN_PROGRESS',
          completedAt: pVal >= 100 ? new Date() : undefined,
          lastAccess: new Date(),
        }
      });
    }
  }

  // If completion status is set
  if (
    (key === 'cmi.completion_status' && value === 'completed') ||
    (key === 'cmi.core.lesson_status' && (value === 'completed' || value === 'passed'))
  ) {
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        completedAt: new Date(),
        lastAccess: new Date(),
      }
    });
  }

  return true;
}

/**
 * Updates progress for native modular courses.
 * Calculates completion percentage across the bite-sized module list,
 * updates Enrollment progress and ScormState ('cmi.progress_measure'),
 * and unlocks course completion when all modules are finished.
 *
 * @param {string} enrollmentId - The enrollment ID.
 * @param {string[]} completedModuleIds - List of completed module identifiers.
 * @param {number} totalModules - Total number of modules in the curriculum.
 * @returns {Promise<{ success: boolean; progress: number }>} Updated progress status.
 */
export async function updateNativeModuleProgress(
  enrollmentId: string,
  completedModuleIds: string[],
  totalModules: number
) {
  const percent = totalModules > 0
    ? Math.min(100, Math.round((completedModuleIds.length / totalModules) * 100))
    : 0;

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      progress: percent,
      status: percent >= 100 ? 'COMPLETED' : 'IN_PROGRESS',
      completedAt: percent >= 100 ? new Date() : undefined,
      lastAccess: new Date(),
    }
  });

  // Store completed module IDs in scormState as well for cross-compatibility
  await prisma.scormState.upsert({
    where: {
      enrollmentId_cmiKey: {
        enrollmentId,
        cmiKey: 'awief.native.completed_modules'
      }
    },
    update: { cmiValue: JSON.stringify(completedModuleIds) },
    create: { enrollmentId, cmiKey: 'awief.native.completed_modules', cmiValue: JSON.stringify(completedModuleIds) }
  });

  await prisma.scormState.upsert({
    where: {
      enrollmentId_cmiKey: {
        enrollmentId,
        cmiKey: 'cmi.progress_measure'
      }
    },
    update: { cmiValue: (percent / 100).toFixed(2) },
    create: { enrollmentId, cmiKey: 'cmi.progress_measure', cmiValue: (percent / 100).toFixed(2) }
  });

  if (percent >= 100) {
    await prisma.scormState.upsert({
      where: {
        enrollmentId_cmiKey: {
          enrollmentId,
          cmiKey: 'cmi.completion_status'
        }
      },
      update: { cmiValue: 'completed' },
      create: { enrollmentId, cmiKey: 'cmi.completion_status', cmiValue: 'completed' }
    });
  }

  return { success: true, progress: percent };
}

/**
 * Retrieves the enrollment ID for a user and course, creating it if requested.
 *
 * @param {string} userId - User ID.
 * @param {string} courseId - Course ID.
 * @param {boolean} createIfMissing - Whether to auto-create if missing.
 * @returns {Promise<string | null>} The enrollment ID.
 */
export async function getEnrollmentId(userId: string, courseId: string, createIfMissing: boolean = false) {
  let enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId
      }
    }
  });

  if (!enrollment && createIfMissing) {
    enrollment = await prisma.enrollment.create({
      data: {
        userId,
        courseId,
        status: 'IN_PROGRESS'
      }
    });
  }

  return enrollment?.id || null;
}

/**
 * Retrieves the comprehensive course enrollment status including survey and certificate records.
 *
 * @param {string} userId - User ID.
 * @param {string} courseId - Course ID.
 * @returns {Promise<any>} Enrollment record.
 */
export async function getCourseEnrollmentStatus(userId: string, courseId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId
      }
    },
    include: {
      certificate: true,
      surveyResponse: true
    }
  });

  return enrollment;
}
