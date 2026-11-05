"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function checkUserEligibility(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    return { success: false, message: "No account found with that email." };
  }

  // Check if they are still using the default password 'changeme123'
  // If not, they shouldn't be using the First Time Setup
  const isDefaultPassword = await bcrypt.compare("changeme123", user.password);
  
  if (!isDefaultPassword) {
    return { success: false, message: "You have already set up your account. Please log in normally." };
  }

  return { success: true, message: "Account found." };
}

export async function setupInitialPassword(email: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) throw new Error("User not found.");

  const isDefaultPassword = await bcrypt.compare("changeme123", user.password);
  
  if (!isDefaultPassword) {
    throw new Error("You have already set up your account. Please log in normally.");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword }
  });

  return { success: true };
}

export async function resetUserPassword(email: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    return { success: false, message: "No registered account found with that email address." };
  }

  if (newPassword.length < 8) {
    return { success: false, message: "Password must be at least 8 characters long." };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword }
  });

  return { success: true, message: "Password updated successfully." };
}

