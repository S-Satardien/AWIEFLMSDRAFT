"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Confetti from "react-confetti";
import { getDashboardData, getLeaderboard } from "./actions";
import { calculateFounderMilestones, FounderBadge } from "@/lib/milestones";
import {
  Sparkles,
  Award,
  Zap,
  TrendingUp,
  CheckCircle2,
  CircleDollarSign,
  ShieldCheck,
  Globe,
  FileText,
  Mic,
  Layers,
  GraduationCap,
  ArrowRight,
  BookOpen
} from "@/components/Icons";

const ICON_MAP: Record<string, any> = {
  Sparkles,
  Zap,
  TrendingUp,
  CheckCircle2,
  CircleDollarSign,
  ShieldCheck,
  Globe,
  FileText,
  Mic,
  Award,
  Layers,
  GraduationCap
};

/**
 * Learner dashboard client component for the AWIEF Digital Learning Academy.
 * Displays enrolled masterclasses, Pan-African Founders Leaderboard,
 * 5-tier progressive milestones with "Next to Chase" spotlight, and verifiable QR credentials.
 *
 * @returns {JSX.Element} The rendered dashboard client component.
 */
export default function DashboardClient() {
  const [data, setData] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [milestoneFilter, setMilestoneFilter] = useState<"ALL" | "UNLOCKED" | "LOCKED">("ALL");

  useEffect(() => {
    async function fetchData() {
      const dbData = await getDashboardData();
      const lbData = await getLeaderboard();
      setData(dbData);
      setLeaderboard(lbData);

      if (dbData && dbData.completedCourses > 0 && dbData.totalCertificates > 0) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 6000);
      }
    }
    fetchData();
  }, []);

  const milestones = useMemo(() => {
    if (!data) return null;
    return calculateFounderMilestones({
      totalPoints: data.totalPoints || 0,
      currentStreak: data.currentStreak || 1,
      totalCourses: data.totalCourses || 0,
      completedCourses: data.completedCourses || 0,
      totalCertificates: data.totalCertificates || 0,
      avgProgress: data.avgProgress || 0,
      quizzesPassedCount: data.quizzesPassedCount || 0,
      enrolledCourses: data.enrolledCourses || []
    });
  }, [data]);

  const filteredBadges = useMemo(() => {
    if (!milestones) return [];
    if (milestoneFilter === "UNLOCKED") return milestones.badges.filter((b) => b.unlocked);
    if (milestoneFilter === "LOCKED") return milestones.badges.filter((b) => !b.unlocked);
    return milestones.badges;
  }, [milestones, milestoneFilter]);

  if (!data || !milestones) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7F3D59]"></div>
      </div>
    );
  }

  const { currentRank, nextRank, rankProgress, pointsToNextRank, nextToChase } = milestones;

  return (
    <div className="space-y-8 relative selection:bg-[#7F3D59] selection:text-white pb-12">
      {showConfetti && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <Confetti
            width={typeof window !== "undefined" ? window.innerWidth : 1000}
            height={typeof window !== "undefined" ? window.innerHeight : 1000}
            colors={['#7F3D59', '#D4AF37', '#5E2C41', '#EAD7E0', '#1D0B14']}
          />
        </div>
      )}

      {/* Top Banner with Multi-Course Overview */}
      <div className="bg-white rounded-3xl shadow-sm p-8 border border-[#EAD7E0] flex flex-col md:flex-row items-center justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#7F3D59]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#7F3D59]/10 border border-[#7F3D59]/20 rounded-full text-[#7F3D59] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#7F3D59]" />
            <span>Pan-African Founder Workspace</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-extrabold text-[#1D0B14] tracking-tight">
            Welcome back, {data.userName}
          </h1>
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed font-light">
            Track your masterclass progress, download executive business templates, complete peer assessments, and access your verifiable QR-coded digital credentials.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/catalog"
              className="px-5 py-2.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-xs font-bold transition-all shadow-md inline-flex items-center gap-2"
            >
              <span>Explore Masterclass Catalogue</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
            </Link>
            <Link
              href="/dashboard/courses"
              className="px-5 py-2.5 bg-[#FDF8F9] hover:bg-[#F7EEF2] text-gray-800 border border-[#EAD7E0] rounded-xl text-xs font-bold transition-colors"
            >
              My Enrolled Masterclasses ({data.totalCourses})
            </Link>
          </div>
        </div>

        {/* Overview Metric Widgets */}
        <div className="mt-6 md:mt-0 grid grid-cols-2 gap-3 z-10 shrink-0">
          <div className="bg-[#FDF8F9] p-4 rounded-2xl border border-[#EAD7E0] text-center min-w-[120px]">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Active Streak</p>
            <div className="text-2xl font-serif font-extrabold text-[#7F3D59] mt-1">
              {data.currentStreak} <span className="text-xs font-sans font-medium text-gray-400">days</span>
            </div>
          </div>

          <div className="bg-[#FDF8F9] p-4 rounded-2xl border border-[#EAD7E0] text-center min-w-[120px]">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Credentials</p>
            <div className="text-2xl font-serif font-extrabold text-[#D4AF37] mt-1">
              {data.totalCertificates} <span className="text-xs font-sans font-medium text-gray-400">earned</span>
            </div>
          </div>

          <div className="bg-[#FDF8F9] p-4 rounded-2xl border border-[#EAD7E0] text-center min-w-[120px]">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Avg. Progress</p>
            <div className="text-2xl font-serif font-extrabold text-[#1D0B14] mt-1">
              {data.avgProgress}%
            </div>
          </div>

          <div className="bg-[#FDF8F9] p-4 rounded-2xl border border-[#EAD7E0] text-center min-w-[120px]">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Founder XP</p>
            <div className="text-2xl font-serif font-extrabold text-[#5E2C41] mt-1">
              {data.totalPoints}
            </div>
          </div>
        </div>
      </div>

      {/* FOUNDER RANK PROGRESSION STRIP */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EAD7E0] shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-[#7F3D59] text-white text-xs font-bold rounded-xl uppercase tracking-wider">
              {currentRank.badgeTag}
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-bold text-gray-900">
                {currentRank.title}
              </h2>
              <p className="text-xs text-gray-500">{currentRank.description}</p>
            </div>
          </div>

          {nextRank ? (
            <div className="text-xs text-gray-600 sm:text-right">
              Next Rank: <strong className="text-[#7F3D59]">{nextRank.title}</strong>
              <div className="text-[11px] text-gray-400 font-mono">
                {pointsToNextRank} XP remaining to unlock
              </div>
            </div>
          ) : (
            <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
              Maximum Academic Level Achieved
            </span>
          )}
        </div>

        {/* Level Progression Bar */}
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 bg-gradient-to-r from-[#7F3D59] to-[#D4AF37] rounded-full transition-all duration-1000"
            style={{ width: `${rankProgress}%` }}
          ></div>
        </div>
      </div>

      {/* "NEXT MILESTONE TO CHASE" SPOTLIGHT CARD */}
      {nextToChase && (
        <div className="bg-gradient-to-r from-[#1D0B14] via-[#3E1A29] to-[#7F3D59] rounded-3xl p-6 sm:p-8 text-white shadow-lg border border-[#D4AF37]/40 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="space-y-2 max-w-2xl relative z-10">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 bg-[#D4AF37] text-[#1D0B14] text-[10px] font-bold rounded-full uppercase tracking-wider font-serif">
                Next Milestone to Chase
              </span>
              <span className="px-2.5 py-0.5 bg-white/10 text-gray-200 text-[10px] font-medium rounded-full">
                {nextToChase.tierLabel}
              </span>
              <span className="text-xs text-[#D4AF37] font-bold">+{nextToChase.xpReward} XP</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-serif font-bold text-white flex items-center gap-2">
              <span>{nextToChase.name}</span>
            </h3>

            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-light">
              {nextToChase.description}
            </p>

            <div className="pt-2 space-y-1.5 max-w-lg">
              <div className="flex justify-between text-xs font-semibold text-gray-300">
                <span>Requirement: {nextToChase.requirementText}</span>
                <span className="text-[#D4AF37] font-bold">{nextToChase.progressPercent}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 bg-[#D4AF37] rounded-full transition-all duration-700"
                  style={{ width: `${nextToChase.progressPercent}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="relative z-10 shrink-0 self-stretch md:self-auto flex items-center">
            <Link
              href={nextToChase.ctaUrl}
              className="w-full md:w-auto px-6 py-3 bg-[#D4AF37] hover:bg-[#B89628] text-[#1D0B14] font-serif font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>{nextToChase.ctaLabel}</span>
              <ArrowRight className="w-4 h-4 text-[#1D0B14]" />
            </Link>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Enrolled Courses & 5-Tier Trophy Case */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Enrolled Courses Summary */}
          <div className="bg-white rounded-3xl shadow-sm border border-[#EAD7E0] p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-serif font-bold text-gray-900">Enrolled Masterclasses</h2>
                <p className="text-xs text-gray-500 mt-0.5">Your active capacity building programs and verifiable credentials</p>
              </div>
              <Link
                href="/catalog"
                className="text-xs font-bold text-[#7F3D59] hover:underline"
              >
                + Browse More Courses
              </Link>
            </div>

            {data.enrolledCourses.length === 0 ? (
              <div className="text-center py-10 bg-[#FDF8F9] rounded-2xl border border-dashed border-[#EAD7E0] p-6 space-y-3">
                <p className="text-sm font-semibold text-gray-700">You are not enrolled in any masterclasses yet.</p>
                <Link
                  href="/catalog"
                  className="px-5 py-2.5 bg-[#7F3D59] text-white text-xs font-bold rounded-xl shadow-sm inline-block"
                >
                  Explore Catalogue to Enroll
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {data.enrolledCourses.map((course: any) => (
                  <div
                    key={course.id}
                    className="p-5 rounded-2xl border border-[#EAD7E0] hover:border-[#7F3D59]/40 transition-all bg-[#FDF8F9]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 max-w-md">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-[#7F3D59]/10 text-[#7F3D59] text-[10px] font-bold rounded-full uppercase">
                          {course.category}
                        </span>
                        <span className="text-[11px] text-gray-500 font-medium">
                          {course.duration}
                        </span>
                        {course.receipt && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                            Paid via {course.receipt.gateway}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-serif font-bold text-gray-900 leading-snug">
                        {course.title}
                      </h3>

                      {/* Progress Bar */}
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                          <span>Curriculum Progress</span>
                          <span className="text-[#7F3D59]">{course.progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#7F3D59] rounded-full transition-all duration-700"
                            style={{ width: `${course.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap sm:flex-col items-end gap-2 shrink-0">
                      <Link
                        href={`/course/${course.id}`}
                        className="px-4 py-2 bg-[#1D0B14] hover:bg-[#3E1A29] text-white rounded-xl text-xs font-bold transition-all shadow-sm text-center w-full sm:w-auto"
                      >
                        {course.progress > 0 ? "Resume Module →" : "Start Masterclass →"}
                      </Link>

                      {course.progress >= 100 && !course.surveyCompleted && (
                        <Link
                          href={`/course/${course.id}/survey`}
                          className="px-4 py-2 bg-[#D4AF37] hover:bg-[#B89628] text-[#1D0B14] rounded-xl text-xs font-bold transition-all shadow-sm text-center w-full sm:w-auto font-serif"
                        >
                          Complete Survey →
                        </Link>
                      )}

                      {course.certificateNumber && (
                        <Link
                          href={`/certificate/${course.id}`}
                          className="px-4 py-2 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-xs font-bold transition-all shadow-sm text-center w-full sm:w-auto inline-flex items-center justify-center gap-1.5"
                        >
                          <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>View QR Certificate</span>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5-TIER FOUNDER TROPHY CASE */}
          <div className="bg-white rounded-3xl shadow-sm border border-[#EAD7E0] p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-serif font-bold text-gray-900">
                  Founder Milestones &amp; Badges ({milestones.unlockedCount}/{milestones.totalBadges})
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  12 progressive competencies across 5 tiers rewarding your commercial and leadership growth.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-[#FDF8F9] p-1 rounded-xl border border-[#EAD7E0] text-xs font-bold self-start sm:self-auto">
                <button
                  onClick={() => setMilestoneFilter("ALL")}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    milestoneFilter === "ALL"
                      ? "bg-[#7F3D59] text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  All ({milestones.totalBadges})
                </button>
                <button
                  onClick={() => setMilestoneFilter("UNLOCKED")}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    milestoneFilter === "UNLOCKED"
                      ? "bg-[#7F3D59] text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Unlocked ({milestones.unlockedCount})
                </button>
                <button
                  onClick={() => setMilestoneFilter("LOCKED")}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    milestoneFilter === "LOCKED"
                      ? "bg-[#7F3D59] text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Next Up ({milestones.totalBadges - milestones.unlockedCount})
                </button>
              </div>
            </div>

            {/* Badges Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBadges.map((badge: FounderBadge) => {
                const IconComponent = ICON_MAP[badge.iconName] || Award;

                return (
                  <div
                    key={badge.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                      badge.unlocked
                        ? "border-[#D4AF37]/50 bg-amber-50/30 shadow-xs hover:border-[#D4AF37]"
                        : "border-gray-200 bg-gray-50/60 opacity-75 hover:opacity-100"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                            badge.unlocked
                              ? "bg-[#7F3D59] text-[#D4AF37] shadow-xs"
                              : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-[#7F3D59] font-mono">
                          +{badge.xpReward} XP
                        </span>
                      </div>

                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                        {badge.tierLabel}
                      </span>
                      <h4
                        className={`font-serif font-bold text-sm ${
                          badge.unlocked ? "text-gray-900" : "text-gray-700"
                        }`}
                      >
                        {badge.name}
                      </h4>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                        {badge.description}
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      <div className="flex justify-between items-center text-[11px] font-medium text-gray-500">
                        <span>{badge.unlocked ? "Status: Unlocked" : "Progress"}</span>
                        <span className="font-bold text-gray-700">{badge.progressPercent}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${
                            badge.unlocked ? "bg-emerald-600" : "bg-[#7F3D59]"
                          }`}
                          style={{ width: `${badge.progressPercent}%` }}
                        ></div>
                      </div>

                      <div className="pt-1">
                        {badge.unlocked ? (
                          <span className="w-full py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-lg text-center block uppercase tracking-wider">
                            Badge Unlocked
                          </span>
                        ) : (
                          <Link
                            href={badge.ctaUrl}
                            className="w-full py-1 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 text-[10px] font-bold rounded-lg text-center block transition-colors"
                          >
                            {badge.ctaLabel} →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
        </div>

        {/* Right Column: Multi-Course Leaderboard */}
        <div className="space-y-8">
          <div className="bg-[#1D0B14] rounded-3xl shadow-lg border border-[#3E1A29] p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#7F3D59]/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="pb-4 border-b border-gray-800 relative z-10 space-y-1">
              <h2 className="text-xl font-serif font-bold tracking-tight text-white">
                Pan-African Founders Leaderboard
              </h2>
              <p className="text-gray-400 text-xs">Top ranking women founders across 54 nations</p>
            </div>

            <div className="py-4 space-y-2 relative z-10">
              {leaderboard.map((user, idx) => {
                return (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-3 rounded-xl ${
                      idx === 0
                        ? "bg-white/10 border border-[#D4AF37]/50"
                        : "bg-white/5 hover:bg-white/10 transition-colors"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                          idx === 0
                            ? "bg-[#D4AF37] text-[#1D0B14]"
                            : idx === 1
                            ? "bg-gray-300 text-gray-800"
                            : idx === 2
                            ? "bg-amber-600 text-white"
                            : "bg-white/10 text-white"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex items-center gap-2">
                        {user.displayCountry && (
                          <span className="font-mono text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white">
                            [{user.displayCountry}]
                          </span>
                        )}
                        <div>
                          <span
                            className={`font-bold text-xs block ${
                              idx === 0 ? "text-[#D4AF37]" : "text-white"
                            }`}
                          >
                            {user.displayName}
                          </span>
                          {user.displayOrg && (
                            <span className="text-[10px] text-gray-400 block truncate max-w-[140px]">
                              {user.displayOrg}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-white font-mono">
                        {user.points.toLocaleString()} XP
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-gray-800 text-center">
              <p className="text-[11px] text-gray-400">
                XP = Module Progress + Quizzes + Surveys + Certificates
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
