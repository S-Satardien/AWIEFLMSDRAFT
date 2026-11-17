"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  decryptPii,
  decryptUserPiiFields,
  encryptUserPiiFields,
} from "@/lib/encryption";
import { logAuditEvent, SAFE_USER_SELECT } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

const BCRYPT_ROUNDS = 12;

export interface FounderProfileUpdatePayload {
  name: string;
  headline?: string;
  bio?: string;
  country?: string;
  city?: string;
  organization?: string;
  profession?: string;
  businessStage?: string;
  sector?: string;
  awiefProgram?: string;
  yearsInBusiness?: string;
  website?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  skills?: string;
  education?: string;
  showOnLeaderboard: boolean;
}

/**
 * Changes authenticated user password after verifying current credentials.
 * Increments `tokenVersion` so older JWT sessions are invalidated.
 */
export async function changePassword(currentPassword: string, newPassword: string) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) throw new Error("Unauthorized");

  if (!newPassword || newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters long.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.password) throw new Error("User not found");

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) {
    await logAuditEvent({
      actorId: userId,
      actorEmail: user.email,
      action: "PASSWORD_CHANGE_FAILED",
      targetType: "User",
      targetId: userId,
    });
    throw new Error("Incorrect current password.");
  }

  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
      tokenVersion: { increment: 1 },
    },
  });

  await logAuditEvent({
    actorId: userId,
    actorEmail: user.email,
    action: "PASSWORD_CHANGED",
    targetType: "User",
    targetId: userId,
  });

  return true;
}

/**
 * Fetches the sanitized and decrypted LinkedIn-style founder profile
 * for the authenticated learner (explicitly excluding password hashes).
 */
export async function getUserProfile() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...SAFE_USER_SELECT,
      certificates: {
        orderBy: { issuedAt: "desc" },
      },
      enrollments: {
        include: {
          course: {
            select: { id: true, title: true, category: true, duration: true },
          },
        },
      },
    },
  });

  return decryptUserPiiFields(user);
}

/**
 * Updates the founder profile while encrypting sensitive PII attributes with AES-256-GCM.
 */
export async function updateProfile(data: FounderProfileUpdatePayload) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) throw new Error("Unauthorized");

  try {
    const encrypted = encryptUserPiiFields({
      headline: data.headline || null,
      bio: data.bio || null,
      city: data.city || null,
      organization: data.organization || null,
      website: data.website || null,
      linkedinUrl: data.linkedinUrl || null,
      twitterUrl: data.twitterUrl || null,
      skills: data.skills || null,
      education: data.education || null,
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        headline: encrypted.headline as string | null,
        bio: encrypted.bio as string | null,
        country: data.country || null,
        city: encrypted.city as string | null,
        organization: encrypted.organization as string | null,
        profession: data.profession || null,
        businessStage: data.businessStage || null,
        sector: data.sector || null,
        awiefProgram: data.awiefProgram || null,
        yearsInBusiness: data.yearsInBusiness || null,
        website: encrypted.website as string | null,
        linkedinUrl: encrypted.linkedinUrl as string | null,
        twitterUrl: encrypted.twitterUrl as string | null,
        skills: encrypted.skills as string | null,
        education: encrypted.education as string | null,
        showOnLeaderboard: data.showOnLeaderboard ?? false,
      },
    });

    await logAuditEvent({
      actorId: userId,
      actorEmail: session?.user?.email || null,
      action: "PROFILE_UPDATED",
      targetType: "User",
      targetId: userId,
    });

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    revalidatePath("/admin");

    return { success: true };
  } catch (error: unknown) {
    console.error("Error updating founder profile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update profile.",
    };
  }
}

/**
 * POPIA / GDPR Right of Access: exports all decrypted personal records belonging
 * exclusively to the signed-in user.
 */
export async function exportMyPersonalData() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...SAFE_USER_SELECT,
      enrollments: {
        include: {
          course: { select: { id: true, title: true } },
          certificate: true,
          surveyResponse: true,
        },
      },
      transactions: {
        select: {
          reference: true,
          courseId: true,
          gateway: true,
          currency: true,
          amountOriginal: true,
          amountZar: true,
          status: true,
          createdAt: true,
        },
      },
      courseReviews: true,
      quizAttempts: {
        select: {
          id: true,
          quizId: true,
          score: true,
          maxScore: true,
          passed: true,
          createdAt: true,
        },
      },
    },
  });

  if (!user) throw new Error("User not found");

  const decryptedUser = decryptUserPiiFields({
    ...user,
    enrollments: user.enrollments.map((e) => ({
      ...e,
      surveyResponse: e.surveyResponse
        ? {
            ...e.surveyResponse,
            q8_applicationOpenEnded:
              decryptPii(e.surveyResponse.q8_applicationOpenEnded) || "",
            q9_recommendedCoursesOpenEnded:
              decryptPii(e.surveyResponse.q9_recommendedCoursesOpenEnded) || "",
          }
        : null,
    })),
  });

  await logAuditEvent({
    actorId: userId,
    actorEmail: user.email,
    action: "USER_DATA_EXPORT_POPIA",
    targetType: "User",
    targetId: userId,
  });

  return {
    exportedAt: new Date().toISOString(),
    complianceFramework: "POPIA / NDPA / Kenya DPA / GDPR Right of Access",
    account: decryptedUser,
  };
}

/**
 * POPIA / GDPR Right to Erasure: permanently deletes the authenticated user's account
 * and cascading personal telemetry after verifying typed email confirmation.
 */
export async function deleteMyAccount(confirmEmail: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const userEmail = session?.user?.email?.trim().toLowerCase() || "";
  const role = (session?.user as { role?: string } | undefined)?.role || "STUDENT";

  if (!userId) {
    return { success: false, error: "Unauthorized." };
  }

  if (role === "ADMIN") {
    return {
      success: false,
      error: "Administrator accounts cannot self-delete. Transfer admin privileges first.",
    };
  }

  if (confirmEmail.trim().toLowerCase() !== userEmail) {
    return {
      success: false,
      error: "Confirmation email does not match your signed-in account.",
    };
  }

  await logAuditEvent({
    actorId: userId,
    actorEmail: userEmail,
    action: "USER_ACCOUNT_ERASED_POPIA",
    targetType: "User",
    targetId: userId,
  });

  await prisma.user.delete({ where: { id: userId } });
  return { success: true };
}
