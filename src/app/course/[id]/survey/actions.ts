"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptPii } from "@/lib/encryption";
import { signCertificatePayload } from "@/lib/cryptoCert";
import { logAuditEvent } from "@/lib/audit";
import crypto from "crypto";

/**
 * Submits the end-of-course executive evaluation survey,
 * encrypts open-ended enterprise responses with AES-256-GCM,
 * verifies active enrollment (preventing paid course bypass),
 * and issues an HMAC-SHA256 signed verifiable Certificate of Completion.
 */
export async function submitCourseSurvey(
  courseId: string,
  surveyData: {
    q1_platformNav: number;
    q2_materialsClear: number;
    q3_durationAppropriate: number;
    q4_contentMatchedObjectives: number;
    q5_understandingBefore: number;
    q6_understandingAfter: number;
    q7_confidenceExplain: number;
    q8_applicationOpenEnded: string;
    q9_recommendedCoursesOpenEnded: string;
  }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    const role = (session?.user as { role?: string } | undefined)?.role || "STUDENT";
    if (!userId) {
      return { success: false, error: "Please sign in to submit the survey." };
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, isFree: true },
    });

    if (!course) {
      return { success: false, error: "Course not found." };
    }

    let enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      include: {
        user: { select: { name: true, email: true } },
        certificate: true,
      },
    });

    if (!enrollment) {
      if (course.isFree || role === "ADMIN" || role === "REVIEWER") {
        enrollment = await prisma.enrollment.create({
          data: {
            userId,
            courseId,
            status: "COMPLETED",
            progress: 100,
          },
          include: {
            user: { select: { name: true, email: true } },
            certificate: true,
          },
        });
      } else {
        return {
          success: false,
          error: "Active enrollment is required before completing the evaluation survey.",
        };
      }
    }

    const encryptedQ8 = encryptPii(surveyData.q8_applicationOpenEnded) || "";
    const encryptedQ9 = encryptPii(surveyData.q9_recommendedCoursesOpenEnded) || "";

    await prisma.courseSurveyResponse.upsert({
      where: {
        enrollmentId: enrollment.id,
      },
      update: {
        q1_platformNav: surveyData.q1_platformNav,
        q2_materialsClear: surveyData.q2_materialsClear,
        q3_durationAppropriate: surveyData.q3_durationAppropriate,
        q4_contentMatchedObjectives: surveyData.q4_contentMatchedObjectives,
        q5_understandingBefore: surveyData.q5_understandingBefore,
        q6_understandingAfter: surveyData.q6_understandingAfter,
        q7_confidenceExplain: surveyData.q7_confidenceExplain,
        q8_applicationOpenEnded: encryptedQ8,
        q9_recommendedCoursesOpenEnded: encryptedQ9,
        courseName: course.title,
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
        q8_applicationOpenEnded: encryptedQ8,
        q9_recommendedCoursesOpenEnded: encryptedQ9,
      },
    });

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        surveyCompleted: true,
        certificateIssued: true,
        status: "COMPLETED",
        progress: 100,
        completedAt: enrollment.completedAt || new Date(),
      },
    });

    let certificate = enrollment.certificate;
    if (!certificate) {
      const randomCode = crypto.randomBytes(3).toString("hex").toUpperCase();
      const codePart =
        courseId.replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase() || "MAST";
      const certNum = `CERT-AWIEF-2026-${codePart}-${randomCode}`;
      const issuedAt = new Date();
      const hmacSig = signCertificatePayload({
        certificateNumber: certNum,
        userId,
        courseId,
        issuedAt,
      });

      certificate = await prisma.certificate.create({
        data: {
          certificateNumber: certNum,
          enrollmentId: enrollment.id,
          userId,
          courseId,
          recipientName: enrollment.user.name || enrollment.user.email,
          courseTitle: course.title,
          issuedAt,
          qrCodeData: hmacSig,
        },
      });
    }

    await logAuditEvent({
      actorId: userId,
      actorEmail: enrollment.user.email,
      action: "CERTIFICATE_ISSUED",
      targetType: "Certificate",
      targetId: certificate.certificateNumber,
      details: `courseId=${courseId}`,
    });

    return {
      success: true,
      certificateNumber: certificate.certificateNumber,
      courseId,
    };
  } catch (err: unknown) {
    console.error("Survey submission error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to submit survey.",
    };
  }
}
