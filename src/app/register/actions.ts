"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  country: string;
  organization: string; // Business or Enterprise Name
  profession?: string;  // Founder, CEO, Managing Director
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
 * Auto-hashes passwords, creates the User record with Pan-African demographic data,
 * and activates their primary masterclass enrollment.
 *
 * @param {RegisterFormData} formData - Registration parameters.
 * @returns {Promise<{ success: boolean; error?: string; userId?: string }>} Registration outcome.
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
      courseId
    } = formData;

    if (!email || !email.includes("@")) {
      return { success: false, error: "Please provide a valid business email address." };
    }

    if (!password || password.length < 8) {
      return { success: false, error: "Password must be at least 8 characters long." };
    }

    if (!name || !name.trim()) {
      return { success: false, error: "Please provide your full legal name for certificate issuance." };
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return {
        success: false,
        error: "An account with this email address already exists. Please sign in instead."
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        password: hashedPassword,
        country: country || "ZA",
        organization: organization ? organization.trim() : null,
        profession: profession ? profession.trim() : "Founder / CEO",
        businessStage: businessStage || "Growth / Scale-up",
        sector: sector || "Agribusiness & Agritech",
        awiefProgram: awiefProgram || "AWIEF Growth Accelerator",
        yearsInBusiness: yearsInBusiness || "1-3 years",
        isAwiefAlumni: Boolean(isAwiefAlumni),
        goals: goals ? goals.trim() : null,
        role: "STUDENT",
        showOnLeaderboard: true
      }
    });

    // Auto-enroll in requested course or default featured course
    const targetCourseId = courseId || "investment-readiness";
    
    // Check if course exists
    const courseExists = await prisma.course.findUnique({
      where: { id: targetCourseId }
    });

    if (courseExists) {
      await prisma.enrollment.create({
        data: {
          userId: user.id,
          courseId: targetCourseId,
          status: "IN_PROGRESS"
        }
      });
    }

    return {
      success: true,
      userId: user.id
    };
  } catch (err: any) {
    console.error("User registration error:", err);
    return {
      success: false,
      error: err.message || "An unexpected error occurred during registration."
    };
  }
}
