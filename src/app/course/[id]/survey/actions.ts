"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * Submits the end-of-course executive evaluation survey,
 * marks the enrollment as complete, and generates the official verifiable AWIEF certificate.
 *
 * @param {string} courseId - The course identifier.
 * @param {object} surveyData - The 9-question survey payload.
 * @returns {Promise<{ success: boolean; certificateNumber?: string; courseId?: string; error?: string }>}
 */
export async function submitCourseSurvey(courseId: string, surveyData: {
  q1_platformNav: number;
  q2_materialsClear: number;
  q3_durationAppropriate: number;
  q4_contentMatchedObjectives: number;
  q5_understandingBefore: number;
  q6_understandingAfter: number;
  q7_confidenceExplain: number;
  q8_applicationOpenEnded: string;
  q9_recommendedCoursesOpenEnded: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "Please sign in to submit the survey." };
    }

    const userId = (session.user as any).id;

    // Get course
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return { success: false, error: "Course not found." };
    }

    // Get or create enrollment
    let enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      },
      include: {
        user: true,
        certificate: true
      }
    });

    if (!enrollment) {
      enrollment = await prisma.enrollment.create({
        data: {
          userId,
          courseId,
          status: "COMPLETED",
          progress: 100
        },
        include: {
          user: true,
          certificate: true
        }
      });
    }

    // Upsert survey response
    await prisma.courseSurveyResponse.upsert({
      where: {
        enrollmentId: enrollment.id
      },
      update: {
        q1_platformNav: surveyData.q1_platformNav,
        q2_materialsClear: surveyData.q2_materialsClear,
        q3_durationAppropriate: surveyData.q3_durationAppropriate,
        q4_contentMatchedObjectives: surveyData.q4_contentMatchedObjectives,
        q5_understandingBefore: surveyData.q5_understandingBefore,
        q6_understandingAfter: surveyData.q6_understandingAfter,
        q7_confidenceExplain: surveyData.q7_confidenceExplain,
        q8_applicationOpenEnded: surveyData.q8_applicationOpenEnded,
        q9_recommendedCoursesOpenEnded: surveyData.q9_recommendedCoursesOpenEnded,
        courseName: course.title
      },
      create: {
        enrollmentId: enrollment.id,
        userId,
        courseId,
        courseName: course.title,
        q1_platformNav: surveyData.q1_platformNav,
        q2_materialsClear: surveyData.q2_materialsClear,
        q3_durationAppropriate: surveyData.q3_durationAppropriate,
        q4_contentMatchedObjectives: surveyData.q4_contentMatchedObjectives,
        q5_understandingBefore: surveyData.q5_understandingBefore,
        q6_understandingAfter: surveyData.q6_understandingAfter,
        q7_confidenceExplain: surveyData.q7_confidenceExplain,
        q8_applicationOpenEnded: surveyData.q8_applicationOpenEnded,
        q9_recommendedCoursesOpenEnded: surveyData.q9_recommendedCoursesOpenEnded
      }
    });

    // Mark enrollment survey as completed & certificate issued
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        surveyCompleted: true,
        certificateIssued: true,
        status: "COMPLETED",
        progress: 100,
        completedAt: enrollment.completedAt || new Date()
      }
    });

    // Generate Certificate if not existing
    let certificate = enrollment.certificate;
    if (!certificate) {
      const randomCode = crypto.randomBytes(3).toString("hex").toUpperCase();
      const codePart = courseId.replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase() || "MAST";
      const certNum = `CERT-AWIEF-2026-${codePart}-${randomCode}`;

      certificate = await prisma.certificate.create({
        data: {
          certificateNumber: certNum,
          enrollmentId: enrollment.id,
          userId,
          courseId,
          recipientName: enrollment.user.name || enrollment.user.email,
          courseTitle: course.title,
          qrCodeData: `/verify/${certNum}`
        }
      });
    }

    return {
      success: true,
      certificateNumber: certificate.certificateNumber,
      courseId
    };
  } catch (err: any) {
    console.error("Survey submission error:", err);
    return {
      success: false,
      error: err.message || "Failed to submit survey."
    };
  }
}
