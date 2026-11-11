/**
 * @file milestones.ts
 * @description Comprehensive Gamification, Founder Ranks & 5-Tier Milestone Engine
 * for the AWIEF Digital Learning Academy.
 * Computes progressive founder levels, 12 competency badges, real-time unlock percentages,
 * and highlights the "Next Milestone to Chase" so entrepreneurs always have a clear goal ahead.
 */

export interface FounderBadge {
  id: string;
  name: string;
  tier: "FOUNDATION" | "MOMENTUM" | "DOMAIN_MASTERY" | "CREDENTIALED" | "FELLOWSHIP";
  tierLabel: string;
  description: string;
  requirementText: string;
  unlocked: boolean;
  progressPercent: number; // 0 to 100
  xpReward: number;
  ctaUrl: string;
  ctaLabel: string;
  iconName: string;
}

export interface FounderRank {
  rankNumber: number;
  title: string;
  minPoints: number;
  maxPoints: number;
  badgeTag: string;
  description: string;
}

export const FOUNDER_RANKS: FounderRank[] = [
  {
    rankNumber: 1,
    title: "Emerging Pan-African Founder",
    minPoints: 0,
    maxPoints: 499,
    badgeTag: "LEVEL 1",
    description: "Beginning foundational executive training and capacity building."
  },
  {
    rankNumber: 2,
    title: "Seed Venture Strategist",
    minPoints: 500,
    maxPoints: 1199,
    badgeTag: "LEVEL 2",
    description: "Mastering unit economics, cashflow modeling, and early traction."
  },
  {
    rankNumber: 3,
    title: "AfCFTA Market Expander",
    minPoints: 1200,
    maxPoints: 2199,
    badgeTag: "LEVEL 3",
    description: "Executing cross-border supply chain, regulatory, and trade strategies."
  },
  {
    rankNumber: 4,
    title: "Investment-Ready Executive",
    minPoints: 2200,
    maxPoints: 3499,
    badgeTag: "LEVEL 4",
    description: "Institutional due diligence, data rooms, and term sheet defensibility."
  },
  {
    rankNumber: 5,
    title: "AWIEF Pan-African Fellow",
    minPoints: 3500,
    maxPoints: 10000,
    badgeTag: "FELLOW",
    description: "Highest academic honor recognizing end-to-end commercial mastery."
  }
];

export interface FounderTelemetry {
  totalPoints: number;
  currentStreak: number;
  totalCourses: number;
  completedCourses: number;
  totalCertificates: number;
  avgProgress: number;
  quizzesPassedCount: number;
  enrolledCourses: Array<{
    id: string;
    title: string;
    progress: number;
    isComplete: boolean;
    certificateNumber?: string | null;
  }>;
}

/**
 * Computes current rank, progress toward the next rank, and all 12 progressive badges.
 *
 * @param {FounderTelemetry} telemetry - Learner's live progress metrics.
 * @returns {object} Calculated gamification dossier.
 */
export function calculateFounderMilestones(telemetry: FounderTelemetry) {
  const points = telemetry.totalPoints || 0;

  // Determine current rank
  let currentRank = FOUNDER_RANKS[0];
  let nextRank: FounderRank | null = FOUNDER_RANKS[1];

  for (let i = 0; i < FOUNDER_RANKS.length; i++) {
    if (points >= FOUNDER_RANKS[i].minPoints) {
      currentRank = FOUNDER_RANKS[i];
      nextRank = FOUNDER_RANKS[i + 1] || null;
    }
  }

  // Calculate rank progression percentage
  let rankProgress = 100;
  let pointsToNextRank = 0;
  if (nextRank) {
    const rankSpan = nextRank.minPoints - currentRank.minPoints;
    const progressInRank = points - currentRank.minPoints;
    rankProgress = Math.min(100, Math.max(0, Math.round((progressInRank / rankSpan) * 100)));
    pointsToNextRank = nextRank.minPoints - points;
  }

  // Course helpers
  const invCourse = telemetry.enrolledCourses.find(c => c.id.includes("investment"));
  const tradeCourse = telemetry.enrolledCourses.find(c => c.id.includes("export") || c.id.includes("trade"));
  const finCourse = telemetry.enrolledCourses.find(c => c.id.includes("financial") || c.id.includes("cashflow"));
  const pitchCourse = telemetry.enrolledCourses.find(c => c.id.includes("pitch"));

  const invProgress = invCourse ? invCourse.progress : 0;
  const tradeProgress = tradeCourse ? tradeCourse.progress : 0;
  const finProgress = finCourse ? finCourse.progress : 0;
  const pitchProgress = pitchCourse ? pitchCourse.progress : 0;

  // 12 Progressive Badges across 5 Tiers
  const badges: FounderBadge[] = [
    // TIER 1: FOUNDATION
    {
      id: "pioneer",
      name: "AWIEF Pioneer",
      tier: "FOUNDATION",
      tierLabel: "Tier 1: Foundation",
      description: "Registered and active executive member on the AWIEF Digital Learning Academy.",
      requirementText: "Complete onboarding and establish your Pan-African Founder Profile.",
      unlocked: true,
      progressPercent: 100,
      xpReward: 100,
      ctaUrl: "/profile",
      ctaLabel: "View Founder Profile",
      iconName: "Sparkles"
    },
    {
      id: "first_module",
      name: "First Module Breakthrough",
      tier: "FOUNDATION",
      tierLabel: "Tier 1: Foundation",
      description: "Successfully finalized your first bite-sized module and practical business exercise.",
      requirementText: "Complete at least 1 module across any enrolled masterclass (reach 20%+ progress).",
      unlocked: telemetry.avgProgress >= 20 || telemetry.enrolledCourses.some(c => c.progress >= 20),
      progressPercent: Math.min(100, Math.round((Math.max(...telemetry.enrolledCourses.map(c => c.progress), 0) / 20) * 100)),
      xpReward: 150,
      ctaUrl: telemetry.enrolledCourses[0] ? `/course/${telemetry.enrolledCourses[0].id}` : "/catalog",
      ctaLabel: "Resume Masterclass",
      iconName: "Zap"
    },

    // TIER 2: MOMENTUM
    {
      id: "streak_builder",
      name: "Consistent Builder (3-Day Streak)",
      tier: "MOMENTUM",
      tierLabel: "Tier 2: Momentum",
      description: "Maintained continuous daily engagement across 3 consecutive days of study.",
      requirementText: "Log in and complete learning activities 3 days in a row.",
      unlocked: telemetry.currentStreak >= 3,
      progressPercent: Math.min(100, Math.round((telemetry.currentStreak / 3) * 100)),
      xpReward: 200,
      ctaUrl: "/dashboard",
      ctaLabel: "Maintain Streak",
      iconName: "TrendingUp"
    },
    {
      id: "assessment_scholar",
      name: "Assessment Scholar",
      tier: "MOMENTUM",
      tierLabel: "Tier 2: Momentum",
      description: "Passed your first executive scenario-based competency quiz with a score of 80% or higher.",
      requirementText: "Pass 1 module knowledge check or competency assessment.",
      unlocked: telemetry.quizzesPassedCount >= 1,
      progressPercent: Math.min(100, telemetry.quizzesPassedCount >= 1 ? 100 : 0),
      xpReward: 200,
      ctaUrl: telemetry.enrolledCourses[0] ? `/course/${telemetry.enrolledCourses[0].id}` : "/catalog",
      ctaLabel: "Take Assessment",
      iconName: "CheckCircle2"
    },

    // TIER 3: DOMAIN MASTERY
    {
      id: "capital_strategist",
      name: "Capital Raising Strategist",
      tier: "DOMAIN_MASTERY",
      tierLabel: "Tier 3: Domain Mastery",
      description: "Achieved 50%+ curriculum progress in Investment Readiness & Capital Raising.",
      requirementText: "Complete at least 3 modules in the Investment Readiness Masterclass.",
      unlocked: invProgress >= 50,
      progressPercent: Math.min(100, Math.round((invProgress / 50) * 100)),
      xpReward: 300,
      ctaUrl: "/course/investment-readiness",
      ctaLabel: "Open Investment Course",
      iconName: "CircleDollarSign"
    },
    {
      id: "deal_room_ready",
      name: "Deal Room Ready",
      tier: "DOMAIN_MASTERY",
      tierLabel: "Tier 3: Domain Mastery",
      description: "Completed 100% of the Investment Readiness Masterclass with institutional data room setup.",
      requirementText: "Reach 100% progress in Investment Readiness & Capital Raising.",
      unlocked: invProgress >= 100,
      progressPercent: Math.min(100, invProgress),
      xpReward: 500,
      ctaUrl: "/course/investment-readiness",
      ctaLabel: "Complete Investment Course",
      iconName: "ShieldCheck"
    },
    {
      id: "afcfta_navigator",
      name: "AfCFTA Trade Navigator",
      tier: "DOMAIN_MASTERY",
      tierLabel: "Tier 3: Domain Mastery",
      description: "Mastered Rules of Origin, tariff schedules, and cross-border customs documentation.",
      requirementText: "Reach 100% completion in AfCFTA Export Readiness & Cross-Border Trade.",
      unlocked: tradeProgress >= 100,
      progressPercent: Math.min(100, tradeProgress),
      xpReward: 500,
      ctaUrl: "/course/export-readiness",
      ctaLabel: "Open Trade Course",
      iconName: "Globe"
    },
    {
      id: "cfo_governance",
      name: "CFO Governance Architect",
      tier: "DOMAIN_MASTERY",
      tierLabel: "Tier 3: Domain Mastery",
      description: "Instituted rolling 13-week cash projections, SKU margins, and corporate tax compliance.",
      requirementText: "Reach 100% completion in Financial Management, Cashflow & Tax Compliance.",
      unlocked: finProgress >= 100,
      progressPercent: Math.min(100, finProgress),
      xpReward: 500,
      ctaUrl: "/course/financial-management",
      ctaLabel: "Open Finance Course",
      iconName: "FileText"
    },
    {
      id: "executive_storyteller",
      name: "Executive Storyteller",
      tier: "DOMAIN_MASTERY",
      tierLabel: "Tier 3: Domain Mastery",
      description: "Synthesized a compelling 12-slide investor deck and conversational commerce funnel.",
      requirementText: "Reach 100% completion in Pitch 'n Grow: Executive Storytelling & AI Tools.",
      unlocked: pitchProgress >= 100,
      progressPercent: Math.min(100, pitchProgress),
      xpReward: 500,
      ctaUrl: "/course/pitch-n-grow",
      ctaLabel: "Open Pitch Course",
      iconName: "Mic"
    },

    // TIER 4: CREDENTIALED
    {
      id: "certified_founder",
      name: "Certified AWIEF Founder",
      tier: "CREDENTIALED",
      tierLabel: "Tier 4: Credentialed",
      description: "Earned your official, verifiable Certificate of Completion with live QR validation.",
      requirementText: "Complete any masterclass, pass the evaluation survey, and unlock your certificate.",
      unlocked: telemetry.totalCertificates >= 1,
      progressPercent: telemetry.totalCertificates >= 1 ? 100 : Math.min(100, telemetry.avgProgress),
      xpReward: 600,
      ctaUrl: telemetry.totalCertificates >= 1 ? `/certificate/${telemetry.enrolledCourses[0]?.id || "investment-readiness"}` : "/dashboard/courses",
      ctaLabel: telemetry.totalCertificates >= 1 ? "View QR Credential" : "Earn First Certificate",
      iconName: "Award"
    },
    {
      id: "multi_track",
      name: "Multi-Track Specialist",
      tier: "CREDENTIALED",
      tierLabel: "Tier 4: Credentialed",
      description: "Successfully completed and certified in 2 or more distinct executive masterclasses.",
      requirementText: "Earn 2 or more verifiable certificates across different subject areas.",
      unlocked: telemetry.totalCertificates >= 2,
      progressPercent: Math.min(100, Math.round((telemetry.totalCertificates / 2) * 100)),
      xpReward: 800,
      ctaUrl: "/catalog",
      ctaLabel: "Enroll in Second Track",
      iconName: "Layers"
    },

    // TIER 5: FELLOWSHIP
    {
      id: "pan_african_fellow",
      name: "AWIEF Pan-African Fellow",
      tier: "FELLOWSHIP",
      tierLabel: "Tier 5: Fellowship",
      description: "Completed the full executive curriculum across all 4 flagship masterclasses.",
      requirementText: "Complete all 4 commercial masterclasses with 100% curriculum progress.",
      unlocked: telemetry.completedCourses >= 4,
      progressPercent: Math.min(100, Math.round((telemetry.completedCourses / 4) * 100)),
      xpReward: 1500,
      ctaUrl: "/catalog",
      ctaLabel: "View Academy Curriculum",
      iconName: "GraduationCap"
    }
  ];

  // Find the single "Next Milestone to Chase" (the locked badge with highest progressPercent < 100)
  const lockedBadges = badges.filter(b => !b.unlocked);
  let nextToChase: FounderBadge | null = null;
  if (lockedBadges.length > 0) {
    // Sort by highest progressPercent descending, then by lowest xpReward (easiest to close first)
    lockedBadges.sort((a, b) => b.progressPercent - a.progressPercent || a.xpReward - b.xpReward);
    nextToChase = lockedBadges[0];
  }

  const unlockedCount = badges.filter(b => b.unlocked).length;

  return {
    currentRank,
    nextRank,
    rankProgress,
    pointsToNextRank,
    badges,
    unlockedCount,
    totalBadges: badges.length,
    nextToChase
  };
}
