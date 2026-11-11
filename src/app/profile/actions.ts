"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

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
 * Changes authenticated user password with verification of existing password.
 *
 * @param {string} currentPassword - Existing plaintext password.
 * @param {string} newPassword - New desired plaintext password.
 * @returns {Promise<boolean>} Success indicator.
 */
export async function changePassword(currentPassword: string, newPassword: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const userId = (session.user as any).id;
  
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.password) throw new Error("User not found");

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) {
    throw new Error("Incorrect current password.");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  });

  return true;
}

/**
 * Fetches the complete LinkedIn-style founder profile for the authenticated learner,
 * including enterprise metadata, competencies, enrolled courses, and verified certificates.
 *
 * @returns {Promise<any>} The rich user profile.
 */
export async function getUserProfile() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  
  const user = await prisma.user.findUnique({ 
    where: { id: (session.user as any).id },
    include: {
      certificates: {
        orderBy: { issuedAt: "desc" }
      },
      enrollments: {
        include: {
          course: {
            select: { id: true, title: true, category: true, duration: true }
          }
        }
      }
    }
  });
  
  return user;
}

/**
 * Updates the comprehensive LinkedIn-style profile for an AWIEF entrepreneur.
 *
 * @param {FounderProfileUpdatePayload} data - Updated demographic and enterprise parameters.
 * @returns {Promise<{ success: boolean; error?: string }>} Execution result.
 */
export async function updateProfile(data: FounderProfileUpdatePayload) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  try {
    await prisma.user.update({
      where: { id: (session.user as any).id },
      data: {
        name: data.name,
        headline: data.headline || null,
        bio: data.bio || null,
        country: data.country || null,
        city: data.city || null,
        organization: data.organization || null,
        profession: data.profession || null,
        businessStage: data.businessStage || null,
        sector: data.sector || null,
        awiefProgram: data.awiefProgram || null,
        yearsInBusiness: data.yearsInBusiness || null,
        website: data.website || null,
        linkedinUrl: data.linkedinUrl || null,
        twitterUrl: data.twitterUrl || null,
        skills: data.skills || null,
        education: data.education || null,
        showOnLeaderboard: data.showOnLeaderboard ?? true,
      }
    });

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    revalidatePath("/admin");

    return { success: true };
  } catch (error: any) {
    console.error("Error updating founder profile:", error);
    return { success: false, error: error.message || "Failed to update profile." };
  }
}
