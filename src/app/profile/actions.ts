"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

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

export async function getUserProfile() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  
  const user = await prisma.user.findUnique({ 
    where: { id: (session.user as any).id },
    select: { name: true, email: true, role: true, country: true, showOnLeaderboard: true }
  });
  
  return user;
}

export async function updateProfile(name: string, country: string | null, showOnLeaderboard: boolean) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.user.update({
    where: { id: (session.user as any).id },
    data: { name, country, showOnLeaderboard }
  });
  
  return true;
}
