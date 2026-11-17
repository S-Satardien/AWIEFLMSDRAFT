"use server";

import { prisma } from "@/lib/prisma";
import { encryptUserPiiFields } from "@/lib/encryption";
import { logAuditEvent } from "@/lib/audit";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  country: string;
  organization: string;
  profession?: string;
  businessStage?: string;
  sector?: string;
  awiefProgram?: string;
  yearsInBusiness?: string;
  isAwiefAlumni?: boolean;
  goals?: string;
  courseId?: string;
}

/**
 * Registers an African woman entrepreneur or enterprise leader on the AWIEF Academy.
 * Enforces bcrypt-12 password hashing, encrypts sensitive PII fields with AES-256-GCM,
 * records explicit POPIA/GDPR consent timestamp, defaults leaderboard visibility to opt-in,
 * and auto-enrolls only into verified free courses (preventing paid course bypass).
 */
export async function registerUser(formData: RegisterFormData) {
  try {
    const {
      name,
      email,
      password,
      country,
      organization,
      profession,
      businessStage,
      sector,
      awiefProgram,
      yearsInBusiness,
      isAwiefAlumni,
      goals,
      courseId,
    } = formData;

    if (!email || !email.includes("@")) {
      return {
        success: false,
        error: "Please provide a valid business email address.",
      };
    }

    if (!password || password.length < 8) {
      return {
        success: false,
        error: "Password must be at least 8 characters long.",
      };
    }

    if (!name || !name.trim()) {
      return {
        success: false,
        error: "Please provide your full legal name for certificate issuance.",
      };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      return {
        success: false,
        error:
          "An account with this email address already exists. Please sign in instead.",
      };
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const encryptedFields = encryptUserPiiFields({
      organization: organization ? organization.trim() : null,
      goals: goals ? goals.trim() : null,
    });

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        password: hashedPassword,
        country: country || "ZA",
        organization: encryptedFields.organization as string | null,
        profession: profession ? profession.trim() : "Founder / CEO",
        businessStage: businessStage || "Growth / Scale-up",
        sector: sector || "Agribusiness & Agritech",
        awiefProgram: awiefProgram || "AWIEF Growth Accelerator",
        yearsInBusiness: yearsInBusiness || "1-3 years",
        isAwiefAlumni: Boolean(isAwiefAlumni),
        goals: encryptedFields.goals as string | null,
        role: "STUDENT",
        showOnLeaderboard: false,
        consentAcceptedAt: new Date(),
      },
    });

    if (courseId) {
      const targetCourse = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, isFree: true, isPublished: true },
      });

      if (targetCourse && targetCourse.isPublished && targetCourse.isFree) {
        await prisma.enrollment.create({
          data: {
            userId: user.id,
            courseId: targetCourse.id,
            status: "IN_PROGRESS",
          },
        });
      }
    }

    await logAuditEvent({
      actorId: user.id,
      actorEmail: user.email,
      action: "USER_REGISTERED",
      targetType: "User",
      targetId: user.id,
    });

    return {
      success: true,
      userId: user.id,
    };
  } catch (err: unknown) {
    console.error("User registration error:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during registration.",
    };
  }
}
