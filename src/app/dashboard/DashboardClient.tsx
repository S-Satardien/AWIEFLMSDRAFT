"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Confetti from "react-confetti";
import { getDashboardData, getLeaderboard } from "./actions";
import { COUNTRIES } from "@/lib/countries";

/**
 * Learner dashboard client component for the AWIEF Digital Learning Academy.
 * Displays enrolled masterclasses with progress bars, Pan-African Founders Leaderboard,
 * entrepreneurial competency badges, and quick links to verifiable certificates.
 *
 * @returns {JSX.Element} The rendered dashboard client component.
 */
export default function DashboardClient() {
  const [data, setData] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

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

  if (!data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7F3D59]"></div>
      </div>
    );
  }

  // Dynamic Badges across courses
  const invCourse = data.enrolledCourses.find((c: any) => c.id.includes("investment"));
  const tradeCourse = data.enrolledCourses.find((c: any) => c.id.includes("export") || c.id.includes("afcfta"));

  const badges = [
    {
      id: "pioneer",
      name: "AWIEF Pioneer",
      description: "Registered and active on the AWIEF Digital Learning Academy.",
      tag: "PIONEER",
      unlocked: true,
    },
    {
      id: "investment_ready",
      name: "Investment Ready",
      description: "Reached 50%+ progress in Investment Readiness & Capital Raising.",
      tag: "INVESTMENT",
      unlocked: Boolean(invCourse && invCourse.progress >= 50),
    },
    {
      id: "afcfta_exporter",
      name: "AfCFTA Exporter",
      description: "Completed AfCFTA Cross-Border Trade & Compliance Mastery.",
      tag: "TRADE",
      unlocked: Boolean(tradeCourse && tradeCourse.isComplete),
    },
    {
      id: "certified_founder",
      name: "Certified Founder",
      description: "Completed masterclass, passed assessment, and earned verifiable QR certificate.",
      tag: "CERTIFIED",
      unlocked: data.totalCertificates > 0,
    },
  ];

  return (
    <div className="space-y-8 relative selection:bg-[#7F3D59] selection:text-white">
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
            <span>★ Pan-African Founder Workspace</span>
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
              <svg className="w-4 h-4 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
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
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Founder Points</p>
            <div className="text-2xl font-serif font-extrabold text-[#5E2C41] mt-1">
              {data.totalPoints}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Enrolled Courses & Trophy Case */}
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
                          className="px-4 py-2 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-xs font-bold transition-all shadow-sm text-center w-full sm:w-auto"
                        >
                          ★ View QR Certificate
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trophy Case */}
          <div className="bg-white rounded-3xl shadow-sm border border-[#EAD7E0] p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-serif font-bold text-gray-900">Founder Milestones &amp; Badges</h2>
              <p className="text-xs text-gray-500 mt-0.5">Commercial capabilities unlocked across your executive journey</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {badges.map((b) => (
                <div
                  key={b.id}
                  className={`flex flex-col items-center text-center p-5 rounded-2xl border transition-all ${
                    b.unlocked
                      ? "border-[#D4AF37]/50 bg-amber-50/40 shadow-sm"
                      : "border-dashed border-gray-200 bg-gray-50 opacity-50"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#7F3D59] text-white flex items-center justify-center font-bold text-[10px] mb-3">
                    {b.tag}
                  </div>
                  <h4 className={`font-serif font-bold text-xs ${b.unlocked ? "text-gray-900" : "text-gray-500"}`}>
                    {b.name}
                  </h4>
                  <p className="text-[10px] text-gray-500 mt-1 leading-tight">{b.description}</p>
                  <div className="mt-3">
                    {b.unlocked ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Unlocked
                      </span>
                    ) : (
                      <span className="bg-gray-200 text-gray-600 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Locked
                      </span>
                    )}
                  </div>
                </div>
              ))}
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
                          <img
                            src={`https://flagcdn.com/w40/${user.displayCountry.toLowerCase()}.png`}
                            alt={user.displayCountry}
                            title={user.displayCountry}
                            className="w-4 h-auto rounded-[2px]"
                          />
                        )}
                        <span
                          className={`font-bold text-xs ${
                            idx === 0 ? "text-[#D4AF37]" : "text-white"
                          }`}
                        >
                          {user.displayName}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-white font-mono">
                        {user.points.toLocaleString()} pts
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-gray-800 text-center">
              <p className="text-[11px] text-gray-400">
                Points = Module Progress + Quizzes + Surveys + Certificates
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
