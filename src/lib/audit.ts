import { prisma } from "@/lib/prisma";

/**
 * Standard safe Prisma User `select` projection that guarantees
 * password hashes, lockouts, and tokenVersion internals are never returned to callers.
 */
export const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  lastActiveDate: true,
  currentStreak: true,
  country: true,
  showOnLeaderboard: true,
  organization: true,
  profession: true,
  businessStage: true,
  sector: true,
  awiefProgram: true,
  yearsInBusiness: true,
  isAwiefAlumni: true,
  headline: true,
  bio: true,
  city: true,
  website: true,
  linkedinUrl: true,
  twitterUrl: true,
  skills: true,
  education: true,
  goals: true,
  consentAcceptedAt: true,
} as const;

/**
 * Records an immutable security or POPIA/GDPR data-access audit log entry.
 * Never throws so auditing failures never disrupt user requests.
 */
export async function logAuditEvent(entry: {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  details?: string | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        actorEmail: entry.actorEmail ?? null,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        details: entry.details ?? null,
      },
    });
  } catch (err) {
    console.error("Audit logging warning:", err);
  }
}
