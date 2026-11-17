"use server";

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

/**
 * Checks whether an invited account still holds its initial temporary password
 * and is eligible for first-time activation.
 */
export async function checkUserEligibility(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) {
    return { success: false, message: "No account found with that email." };
  }

  const isDefaultPassword = await bcrypt.compare("changeme123", user.password);
  if (!isDefaultPassword) {
    return {
      success: false,
      message: "You have already set up your account. Please log in normally.",
    };
  }

  return { success: true, message: "Account found." };
}

/**
 * Completes initial password setup for an invited user holding a temporary password.
 */
export async function setupInitialPassword(email: string, newPassword: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!newPassword || newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) throw new Error("User not found.");

  const isDefaultPassword = await bcrypt.compare("changeme123", user.password);
  if (!isDefaultPassword) {
    throw new Error("You have already set up your account. Please log in normally.");
  }

  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { email: normalizedEmail },
    data: {
      password: hashedPassword,
      tokenVersion: { increment: 1 },
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  await logAuditEvent({
    actorId: user.id,
    actorEmail: user.email,
    action: "ACCOUNT_ACTIVATED",
    targetType: "User",
    targetId: user.id,
  });

  return { success: true };
}

/**
 * TODO [P0 BEFORE PUBLIC LAUNCH - SMTP]:
 * Replace this direct password update with a signed, expiring one-time email reset token
 * delivered via configured SMTP before allowing public self-service users onto the platform.
 */
export async function resetUserPassword(email: string, newPassword: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) {
    return {
      success: false,
      message: "No registered account found with that email address.",
    };
  }

  if (!newPassword || newPassword.length < 8) {
    return {
      success: false,
      message: "Password must be at least 8 characters long.",
    };
  }

  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { email: normalizedEmail },
    data: {
      password: hashedPassword,
      tokenVersion: { increment: 1 },
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  await logAuditEvent({
    actorId: user.id,
    actorEmail: user.email,
    action: "PASSWORD_RESET_DEMO_FLOW",
    targetType: "User",
    targetId: user.id,
  });

  return { success: true, message: "Password updated successfully." };
}

/**
 * Server-gated 1-Click Demo Login lookup.
 * Strictly returns null unless ENABLE_DEMO_LOGIN="true" in server environment variables,
 * keeping demo credentials completely out of client JS bundles in production.
 */
export async function getDemoAccountCredentials(
  accountType: "LEARNER" | "ADMIN" | "REVIEWER"
): Promise<{ email: string; password: string } | null> {
  if (process.env.ENABLE_DEMO_LOGIN !== "true") {
    return null;
  }

  if (accountType === "ADMIN") {
    return {
      email: "admin@awieforum.org",
      password: process.env.DEMO_ADMIN_PASSWORD || "AwiefAdmin2026!",
    };
  }
  if (accountType === "REVIEWER") {
    return {
      email: "author@awieforum.org",
      password: process.env.DEMO_AUTHOR_PASSWORD || "AwiefAuthor2026!",
    };
  }
  return {
    email: "learner@awieforum.org",
    password: process.env.DEMO_LEARNER_PASSWORD || "AwiefDemo2026!",
  };
}
