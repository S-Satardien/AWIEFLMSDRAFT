"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import CheckoutModal from "./CheckoutModal";
import CourseReviewsSection, {
  StarRatingDisplay,
} from "@/components/CourseReviewsSection";
import {
  extractCourseSkills,
  summarizeCourseReviews,
  type CourseReviewRecord,
} from "@/lib/courseReviews";
import {
  Award,
  Check,
  CheckCircle2,
  BookOpen,
  Download,
  Clock,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ShieldCheck,
  Wifi,
  Zap,
  Package,
  Star,
  ArrowRight,
  Layers,
} from "@/components/Icons";

interface ModuleData {
  id: string;
  title: string;
  duration: string;
  videoUrl?: string;
  summary: string;
  topics?: (string | { id?: string; title: string })[];
  keyTakeaways?: string[];
  caseStudy?:
    | string
    | {
        title: string;
        founder?: string;
        country?: string;
        summary?: string;
      };
  templateName?: string;
  practicalTemplate?: {
    title: string;
    format: string;
    downloadUrl?: string;
  };
  quiz?: {
    title: string;
    questionCount: number;
  };
}

interface CourseOverviewData {
  id: string;
  title: string;
  description?: string | null;
  shortDescription?: string | null;
  instructor?: string | null;
  instructorRole?: string | null;
  authorName?: string | null;
  authorRole?: string | null;
  authorBio?: string | null;
  thumbnailUrl?: string | null;
  duration?: string | null;
  category?: string | null;
  learningObjectives?: string | null;
  targetAudience?: string | null;
  priceZar: number;
  priceUsd: number;
  isFree: boolean;
  royaltyRate: number;
  isNative: boolean;
  modulesJson?: string | null;
}

/**
 * Coursera-inspired Pre-Enrollment Course Overview page styled with the AWIEF
 * editorial visual identity (deep plum #7F3D59, berry #1D0B14, gold #D4AF37,
 * Playfair Display + Outfit). Features a full-bleed hero summary band, sticky
 * section anchor bar, outcomes & skills cloud, interactive module accordion,
 * enrollment sidebar, and 100%-completion gated graduate review system.
 *
 * @param props - Serialized course, enrollment progress, and review records.
 * @returns The rendered course overview experience.
 */
export default function CourseOverviewClient({
  course,
  isLoggedIn,
  isEnrolled,
  userProgress,
  canReview,
  quizCount,
  reviews,
  currentUserReview,
}: {
  course: CourseOverviewData;
  isLoggedIn: boolean;
  isEnrolled: boolean;
  userProgress: number;
  canReview: boolean;
  quizCount: number;
  reviews: CourseReviewRecord[];
  currentUserReview: CourseReviewRecord | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantsCheckout = searchParams.get("checkout") === "true" && !isEnrolled;
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(
    Boolean(wantsCheckout && isLoggedIn)
  );

  // Redirect unauthenticated checkout requests to login
  useEffect(() => {
    if (wantsCheckout && !isLoggedIn) {
      router.push(`/login?callbackUrl=/courses/${course.id}?checkout=true`);
    }
  }, [wantsCheckout, isLoggedIn, course.id, router]);

  const objectives = useMemo<string[]>(() => {
    try {
      if (course.learningObjectives) {
        const parsed = JSON.parse(course.learningObjectives);
        return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
      }
    } catch {
      if (course.learningObjectives) return [String(course.learningObjectives)];
    }
    return [];
  }, [course.learningObjectives]);

  const parsedModules = useMemo<ModuleData[]>(() => {
    if (!course.modulesJson) return [];
    try {
      const parsed = JSON.parse(course.modulesJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [course.modulesJson]);

  const [expandedModules, setExpandedModules] = useState<Record<number, boolean>>({
    0: true,
  });

  const skills = useMemo(
    () => extractCourseSkills(course, parsedModules),
    [course, parsedModules]
  );

  const reviewSummary = useMemo(() => summarizeCourseReviews(reviews), [reviews]);

  const templatesCount = useMemo(
    () =>
      parsedModules.filter((m) => Boolean(m.practicalTemplate || m.templateName)).length,
    [parsedModules]
  );

  const allExpanded =
    parsedModules.length > 0 &&
    parsedModules.every((_, idx) => Boolean(expandedModules[idx]));

  const toggleAllModules = () => {
    const nextState: Record<number, boolean> = {};
    parsedModules.forEach((_, idx) => {
      nextState[idx] = !allExpanded;
    });
    setExpandedModules(nextState);
  };

  const priceDisplay = course.isFree
    ? "Free Sponsored"
    : `R${course.priceZar.toLocaleString()} / $${course.priceUsd}`;

  const handleActionClick = () => {
    if (isEnrolled) {
      router.push(`/course/${course.id}`);
      return;
    }
    if (!isLoggedIn) {
      router.push(`/login?callbackUrl=/courses/${course.id}?checkout=true`);
      return;
    }
    setIsCheckoutOpen(true);
  };

  const facultyName = course.authorName || course.instructor || "AWIEF Lead Faculty";
  const facultyRole =
    course.authorRole || course.instructorRole || "Lead SME Practitioner & Syndicate Advisor";

  return (
    <div className="w-full">
      <CheckoutModal
        course={{
          id: course.id,
          title: course.title,
          priceZar: course.priceZar,
          priceUsd: course.priceUsd,
          isFree: course.isFree,
          royaltyRate: course.royaltyRate,
          authorName: facultyName,
        }}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
      />

      {/* BAND 1: FULL-BLEED COURSERA-STYLE HERO WITH AWIEF IDENTITY */}
      <section className="relative bg-gradient-to-br from-[#1D0B14] via-[#3A1627] to-[#5E2C41] text-white border-b-4 border-[#D4AF37]">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#D4AF37 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 relative z-10 space-y-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs font-semibold text-gray-300">
            <Link href="/" className="hover:text-[#D4AF37] transition-colors">
              Home
            </Link>
            <span className="text-gray-500">/</span>
            <Link href="/catalog" className="hover:text-[#D4AF37] transition-colors">
              Masterclass Catalogue
            </Link>
            <span className="text-gray-500">/</span>
            <span className="text-white truncate max-w-xs sm:max-w-md font-medium">
              {course.title}
            </span>
          </nav>

          {/* Hero Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-8 space-y-5">
              {/* Publisher Lockup */}
              <div className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-xs">
                <img
                  src="/images/awief-logo.jpg"
                  alt="AWIEF Logo"
                  className="h-6 w-auto rounded bg-white p-0.5 object-contain"
                />
                <span className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                  AWIEF Digital Learning Academy
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-xs font-semibold text-gray-200">
                  {course.category || "Executive Masterclass"}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-extrabold tracking-tight leading-[1.15] text-white">
                {course.title}
              </h1>

              <p className="text-base sm:text-lg text-gray-200 leading-relaxed max-w-3xl font-light">
                {course.shortDescription || course.description}
              </p>

              {/* Faculty Credit */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-200 pt-1">
                <div className="w-9 h-9 rounded-full bg-[#D4AF37] text-[#1D0B14] flex items-center justify-center font-extrabold text-xs shrink-0">
                  {facultyName.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <span className="text-xs text-gray-300">Taught by </span>
                  <span className="font-bold text-white">{facultyName}</span>
                  <span className="text-xs text-gray-300"> — {facultyRole}</span>
                </div>
              </div>

              {/* Hero Primary CTA Strip */}
              <div className="pt-3 flex flex-col sm:flex-row sm:items-center gap-4">
                {isEnrolled ? (
                  <Link
                    href={`/course/${course.id}`}
                    className="px-8 py-4 bg-[#D4AF37] hover:bg-[#C29B28] text-[#1D0B14] rounded-xl text-sm font-extrabold transition-all shadow-lg inline-flex items-center justify-center gap-2"
                  >
                    <span>
                      {userProgress >= 100
                        ? "Review Masterclass Curriculum"
                        : `Continue Masterclass (${Math.round(userProgress)}%)`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={handleActionClick}
                    className="px-8 py-4 bg-[#D4AF37] hover:bg-[#C29B28] text-[#1D0B14] rounded-xl text-sm font-extrabold transition-all shadow-lg inline-flex items-center justify-center gap-2"
                  >
                    <span>
                      {course.isFree
                        ? "Enroll Free Today"
                        : `Enroll Now — ${priceDisplay}`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                <a
                  href="#syllabus"
                  className="px-6 py-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-sm font-bold transition-colors text-center"
                >
                  Explore {parsedModules.length || 4}-Module Syllabus
                </a>
              </div>

              <p className="text-xs text-gray-300">
                {isEnrolled
                  ? "Full access unlocked • Progress and assessments auto-saved across devices"
                  : "Supports PayFast (ZAR Cards & EFT), PayPal (USD), Paystack, M-Pesa, MoMo, or Sponsor Voucher (AWIEF-JNJ-DEMO)."}
              </p>
            </div>

            {/* Right Visual Card */}
            <div className="lg:col-span-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 shadow-2xl">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-[#1D0B14]">
                  <img
                    src={course.thumbnailUrl || "/images/courses/investment-readiness.png"}
                    alt={course.title}
                    className="w-full h-full object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex items-end p-4">
                    <div className="flex items-center justify-between w-full text-xs">
                      <span className="px-2.5 py-1 rounded-md bg-[#7F3D59] text-white font-bold uppercase tracking-wider text-[10px]">
                        {course.isNative ? "Bite-Sized Native" : "SCORM Interactive"}
                      </span>
                      <span className="text-[#D4AF37] font-bold">
                        QR Credential Included
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BAND 1B: COURSERA 4-COLUMN METRICS SUMMARY STRIP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white text-[#1D0B14] rounded-2xl p-5 shadow-xl border border-[#EAD7E0]">
            <div className="flex items-start gap-3 sm:border-r sm:border-gray-200 sm:pr-4">
              <div className="w-9 h-9 rounded-lg bg-[#FDF8F9] border border-[#EAD7E0] flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4 text-[#7F3D59]" />
              </div>
              <div>
                <p className="text-sm font-serif font-extrabold text-[#1D0B14]">
                  {parsedModules.length > 0
                    ? `${parsedModules.length} Structured Modules`
                    : "Comprehensive Series"}
                </p>
                <p className="text-xs text-gray-500">
                  {course.isNative
                    ? "Bite-sized 20–30 min lessons"
                    : "SCORM interactive simulation"}
                </p>
              </div>
            </div>

            <a
              href="#reviews"
              className="flex items-start gap-3 lg:border-r lg:border-gray-200 lg:pr-4 group"
            >
              <div className="w-9 h-9 rounded-lg bg-[#FDF8F9] border border-[#EAD7E0] flex items-center justify-center shrink-0">
                <Star className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" />
              </div>
              <div>
                <p className="text-sm font-serif font-extrabold text-[#1D0B14] group-hover:text-[#7F3D59] transition-colors">
                  {reviewSummary.totalReviews > 0
                    ? `${reviewSummary.averageRating.toFixed(1)} / 5.0 Graduate Rating`
                    : "Verified Graduate Reviews"}
                </p>
                <p className="text-xs text-gray-500">
                  {reviewSummary.totalReviews > 0
                    ? `${reviewSummary.totalReviews} verified 100%-completion ${
                        reviewSummary.totalReviews === 1 ? "review" : "reviews"
                      }`
                    : "Unlocked at 100% course completion"}
                </p>
              </div>
            </a>

            <div className="flex items-start gap-3 sm:border-r sm:border-gray-200 sm:pr-4">
              <div className="w-9 h-9 rounded-lg bg-[#FDF8F9] border border-[#EAD7E0] flex items-center justify-center shrink-0">
                <Award className="w-4 h-4 text-[#7F3D59]" />
              </div>
              <div>
                <p className="text-sm font-serif font-extrabold text-[#1D0B14]">
                  Founder &amp; SME Level
                </p>
                <p className="text-xs text-gray-500">
                  Practical templates &amp; case studies
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#FDF8F9] border border-[#EAD7E0] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-[#7F3D59]" />
              </div>
              <div>
                <p className="text-sm font-serif font-extrabold text-[#1D0B14]">
                  {course.duration || "Self-Paced Schedule"}
                </p>
                <p className="text-xs text-gray-500">
                  Flexible online pace • Low-data ready
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BAND 2: STICKY COURSERA ANCHOR NAVIGATION BAR */}
      <div className="sticky top-20 z-30 bg-white/95 backdrop-blur-md border-b border-[#EAD7E0] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-6 sm:gap-8 overflow-x-auto text-xs sm:text-sm font-bold text-gray-600 h-14">
            <a
              href="#about"
              className="whitespace-nowrap py-4 border-b-2 border-transparent hover:border-[#7F3D59] hover:text-[#7F3D59] transition-colors"
            >
              About &amp; Outcomes
            </a>
            <a
              href="#skills"
              className="whitespace-nowrap py-4 border-b-2 border-transparent hover:border-[#7F3D59] hover:text-[#7F3D59] transition-colors"
            >
              Skills You&apos;ll Gain
            </a>
            <a
              href="#syllabus"
              className="whitespace-nowrap py-4 border-b-2 border-transparent hover:border-[#7F3D59] hover:text-[#7F3D59] transition-colors"
            >
              Modules ({parsedModules.length || 1})
            </a>
            <a
              href="#details"
              className="whitespace-nowrap py-4 border-b-2 border-transparent hover:border-[#7F3D59] hover:text-[#7F3D59] transition-colors"
            >
              Certificate &amp; Faculty
            </a>
            <a
              href="#reviews"
              className="whitespace-nowrap py-4 border-b-2 border-transparent hover:border-[#7F3D59] hover:text-[#7F3D59] transition-colors inline-flex items-center gap-1.5"
            >
              <span>Reviews</span>
              {reviewSummary.totalReviews > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#FDF8F9] border border-[#EAD7E0] text-[11px] text-[#7F3D59]">
                  {reviewSummary.averageRating.toFixed(1)} ({reviewSummary.totalReviews})
                </span>
              )}
            </a>
          </nav>
        </div>
      </div>

      {/* BAND 3: ASYMMETRIC COURSERA CONTENT + ENROLLMENT SIDEBAR */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* LEFT MAIN COLUMN (8/12) */}
          <div className="lg:col-span-8 space-y-10">
            {/* WHAT YOU'LL LEARN */}
            <section
              id="about"
              className="bg-white rounded-2xl p-8 shadow-xs border border-[#EAD7E0] space-y-6 scroll-mt-36"
            >
              <div className="space-y-2">
                <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#7F3D59]">
                  Learning Outcomes
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1D0B14]">
                  What you&apos;ll learn
                </h2>
              </div>

              {objectives.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {objectives.map((obj, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-4 rounded-xl bg-[#FDF8F9] border border-[#EAD7E0]"
                    >
                      <CheckCircle2 className="w-5 h-5 text-[#7F3D59] shrink-0 mt-0.5" />
                      <p className="text-xs sm:text-sm text-gray-800 leading-relaxed font-medium">
                        {obj}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600 leading-relaxed">
                  {course.description}
                </p>
              )}

              {/* SKILLS YOU'LL GAIN */}
              {skills.length > 0 && (
                <div id="skills" className="pt-6 border-t border-gray-100 space-y-3 scroll-mt-36">
                  <h3 className="text-lg font-serif font-bold text-[#1D0B14]">
                    Skills you&apos;ll gain
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-3.5 py-1.5 rounded-lg bg-[#FDF8F9] border border-[#EAD7E0] text-xs font-bold text-[#5E2C41]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* DETAILS TO KNOW (COURSERA 4-TILE LOGISTICS STRIP) */}
            <section className="bg-white rounded-2xl p-8 shadow-xs border border-[#EAD7E0] space-y-6">
              <div className="space-y-1">
                <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#7F3D59]">
                  Programme Format
                </span>
                <h2 className="text-2xl font-serif font-bold text-[#1D0B14]">
                  Details to know
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-[#FDF8F9] border border-[#EAD7E0] space-y-2">
                  <Award className="w-5 h-5 text-[#7F3D59]" />
                  <h4 className="text-xs font-extrabold text-[#1D0B14] uppercase tracking-wide">
                    Shareable Certificate
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Verifiable QR credential ready for LinkedIn, DFIs, and grant applications.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#FDF8F9] border border-[#EAD7E0] space-y-2">
                  <Download className="w-5 h-5 text-[#7F3D59]" />
                  <h4 className="text-xs font-extrabold text-[#1D0B14] uppercase tracking-wide">
                    Applied Toolkits
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {templatesCount > 0
                      ? `${templatesCount} practical business templates & models included.`
                      : "Downloadable institutional checklists and templates included."}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#FDF8F9] border border-[#EAD7E0] space-y-2">
                  <HelpCircle className="w-5 h-5 text-[#7F3D59]" />
                  <h4 className="text-xs font-extrabold text-[#1D0B14] uppercase tracking-wide">
                    Assessments
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {quizCount > 0
                      ? `${quizCount} graded competency ${
                          quizCount === 1 ? "assessment" : "assessments"
                        } (80% passing score).`
                      : "Interactive knowledge checks & practical evaluation."}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#FDF8F9] border border-[#EAD7E0] space-y-2">
                  <Wifi className="w-5 h-5 text-[#7F3D59]" />
                  <h4 className="text-xs font-extrabold text-[#1D0B14] uppercase tracking-wide">
                    Taught in English
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Includes Low-Bandwidth Data Saver mode built for African mobile networks.
                  </p>
                </div>
              </div>
            </section>

            {/* SYLLABUS ACCORDION ("THERE ARE X MODULES IN THIS MASTERCLASS") */}
            <section
              id="syllabus"
              className="bg-white rounded-2xl p-8 shadow-xs border border-[#EAD7E0] space-y-6 scroll-mt-36"
            >
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-gray-100 pb-5">
                <div className="space-y-1">
                  <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#7F3D59]">
                    Curriculum Breakdown
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1D0B14]">
                    {parsedModules.length > 0
                      ? `There are ${parsedModules.length} modules in this masterclass`
                      : "Masterclass Curriculum"}
                  </h2>
                  <p className="text-xs text-gray-600">
                    Click any module below to inspect lesson topics, applied African case studies, and downloadable toolkits.
                  </p>
                </div>

                {parsedModules.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAllModules}
                    className="px-4 py-2 rounded-xl border border-[#EAD7E0] bg-[#FDF8F9] hover:bg-white text-xs font-bold text-[#7F3D59] transition-colors shrink-0 self-start sm:self-auto"
                  >
                    {allExpanded ? "Collapse All Modules" : "Expand All Modules"}
                  </button>
                )}
              </div>

              {parsedModules.length > 0 ? (
                <div className="divide-y divide-[#EAD7E0] border border-[#EAD7E0] rounded-2xl overflow-hidden">
                  {parsedModules.map((mod, idx) => {
                    const isOpen = Boolean(expandedModules[idx]);
                    const subObjectives = mod.keyTakeaways || [];
                    const topicsList = mod.topics || [];
                    return (
                      <div key={mod.id || idx} className="bg-white">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedModules((prev) => ({
                              ...prev,
                              [idx]: !isOpen,
                            }))
                          }
                          aria-expanded={isOpen}
                          className="w-full p-5 sm:p-6 text-left flex items-start justify-between gap-4 hover:bg-[#FDF8F9]/80 transition-colors"
                        >
                          <div className="flex items-start gap-4">
                            <span className="w-8 h-8 rounded-lg bg-[#7F3D59] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#7F3D59]">
                                <span>Module {idx + 1}</span>
                                <span className="text-gray-300">·</span>
                                <span className="inline-flex items-center gap-1 text-gray-500 normal-case font-semibold">
                                  <Clock className="w-3 h-3" />
                                  {mod.duration}
                                </span>
                                {topicsList.length > 0 && (
                                  <>
                                    <span className="text-gray-300">·</span>
                                    <span className="text-gray-500 normal-case font-semibold">
                                      {topicsList.length} sub-lessons
                                    </span>
                                  </>
                                )}
                              </div>
                              <h3 className="text-base sm:text-lg font-serif font-bold text-[#1D0B14]">
                                {mod.title}
                              </h3>
                            </div>
                          </div>

                          <span className="text-gray-500 pt-1 shrink-0">
                            {isOpen ? (
                              <ChevronUp className="w-5 h-5 text-[#7F3D59]" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </span>
                        </button>

                        {isOpen && (
                          <div className="px-5 sm:px-6 pb-6 pt-2 bg-[#FDF8F9]/60 border-t border-gray-100 space-y-4">
                            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                              {mod.summary}
                            </p>

                            {subObjectives.length > 0 && (
                              <div className="space-y-1.5">
                                <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700">
                                  What you will accomplish
                                </p>
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
                                  {subObjectives.map((item, sIdx) => (
                                    <li key={sIdx} className="flex items-start gap-2">
                                      <Check className="w-3.5 h-3.5 text-[#7F3D59] shrink-0 mt-0.5" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {topicsList.length > 0 && (
                              <div className="space-y-1.5">
                                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#7F3D59]">
                                  Lessons &amp; Topics Covered
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {topicsList.map((topic, tIdx) => (
                                    <div
                                      key={tIdx}
                                      className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs text-gray-700 font-medium"
                                    >
                                      {tIdx + 1}.{" "}
                                      {typeof topic === "string" ? topic : topic.title}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {(mod.caseStudy || mod.practicalTemplate || mod.templateName) && (
                              <div className="pt-3 border-t border-gray-200/70 flex flex-wrap gap-4 text-xs">
                                {mod.caseStudy && (
                                  <span className="text-[#7F3D59] font-medium inline-flex items-center gap-1.5">
                                    <BookOpen className="w-3.5 h-3.5 text-[#7F3D59] shrink-0" />
                                    <span className="font-semibold">
                                      Case Study:{" "}
                                      {typeof mod.caseStudy === "string"
                                        ? mod.caseStudy
                                        : mod.caseStudy.title}
                                    </span>
                                  </span>
                                )}
                                {(mod.practicalTemplate || mod.templateName) && (
                                  <span className="text-emerald-700 font-medium inline-flex items-center gap-1.5">
                                    <Download className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                    <span className="font-semibold">
                                      Toolkit:{" "}
                                      {mod.practicalTemplate
                                        ? `${mod.practicalTemplate.title} (${mod.practicalTemplate.format})`
                                        : mod.templateName}
                                    </span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-600 leading-relaxed">
                  {course.description}
                </p>
              )}
            </section>

            {/* TARGET AUDIENCE & FACULTY */}
            <section
              id="details"
              className="grid grid-cols-1 md:grid-cols-2 gap-6 scroll-mt-36"
            >
              <div className="bg-white rounded-2xl p-7 shadow-xs border border-[#EAD7E0] space-y-3">
                <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#7F3D59]">
                  Recommended Experience
                </span>
                <h3 className="text-xl font-serif font-bold text-[#1D0B14]">
                  Who This Masterclass Is Built For
                </h3>
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                  {course.targetAudience ||
                    "African women founders, MSME managing directors, executive managers, and aspiring entrepreneurs across the 54 African countries seeking to accelerate growth, structure investor-ready balance sheets, and access continental export markets."}
                </p>
              </div>

              <div className="bg-white rounded-2xl p-7 shadow-xs border border-[#EAD7E0] space-y-4">
                <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#7F3D59]">
                  Lead Instructor
                </span>
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-xl bg-[#7F3D59] text-white flex items-center justify-center text-base font-bold shrink-0 font-serif">
                    {facultyName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-serif font-extrabold text-[#1D0B14] text-lg">
                      {facultyName}
                    </h3>
                    <p className="text-xs text-[#7F3D59] font-bold">{facultyRole}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {course.authorBio ||
                    "A distinguished African finance and enterprise development practitioner with over a decade of hands-on experience guiding growth-stage women founders through angel funding, venture debt, and institutional scale across Sub-Saharan Africa."}
                </p>
                {course.royaltyRate ? (
                  <div className="px-3 py-2 bg-[#FDF8F9] rounded-xl border border-[#EAD7E0] text-[11px] text-[#7F3D59] font-semibold flex items-center justify-between">
                    <span>AWIEF Author Royalty Model:</span>
                    <span className="font-bold">{course.royaltyRate}% Net Revenue Split</span>
                  </div>
                ) : null}
              </div>
            </section>
          </div>

          {/* RIGHT STICKY ENROLLMENT & CERTIFICATE SIDEBAR (4/12) */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-36">
            <div className="bg-white rounded-2xl p-7 shadow-md border border-[#EAD7E0] space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#7F3D59]">
                  Masterclass Enrollment
                </span>
                {course.isNative ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-800">
                    <Zap className="w-3 h-3 text-amber-600" />
                    Native Modules
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-[10px] font-bold text-purple-800">
                    <Package className="w-3 h-3 text-purple-600" />
                    SCORM 1.2 / 2004
                  </span>
                )}
              </div>

              {isEnrolled ? (
                <div className="space-y-4">
                  <div className="px-4 py-2.5 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      Active Enrollment
                    </span>
                    <span className="font-mono">{Math.round(userProgress)}% Done</span>
                  </div>
                  <Link
                    href={`/course/${course.id}`}
                    className="w-full py-3.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white font-bold rounded-xl shadow-sm transition-all text-sm flex items-center justify-center gap-2"
                  >
                    <span>Launch Course Player</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-3xl font-serif font-extrabold text-[#1D0B14]">
                      {priceDisplay}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Full lifetime cohort access across all 54 African countries
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleActionClick}
                    className="w-full py-3.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white font-bold rounded-xl shadow-sm hover:shadow-md transition-all text-sm flex items-center justify-center gap-2"
                  >
                    <span>
                      {course.isFree ? "Enroll Free in Masterclass" : "Purchase & Enroll Now"}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 space-y-2.5 text-xs text-gray-700">
                <p className="font-bold text-[#1D0B14] uppercase tracking-wider text-[11px]">
                  This masterclass includes:
                </p>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#7F3D59] shrink-0" />
                  <span>{parsedModules.length || 4} modular video &amp; workshop units</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#7F3D59] shrink-0" />
                  <span>Downloadable templates &amp; financial toolkits</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#7F3D59] shrink-0" />
                  <span>Verifiable QR digital credential upon 100% completion</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#7F3D59] shrink-0" />
                  <span>Low-bandwidth data saver audio &amp; summary mode</span>
                </div>
              </div>

              {!isEnrolled && (
                <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-500 space-y-1">
                  <p>Gateways: PayFast (ZAR), PayPal (USD), Paystack, M-Pesa &amp; MoMo</p>
                  <p className="font-mono text-[#7F3D59]">
                    Demo Grant Voucher: AWIEF-JNJ-DEMO
                  </p>
                </div>
              )}
            </div>

            {/* Verifiable Credential Card */}
            <div className="bg-gradient-to-br from-[#1D0B14] to-[#3E1A29] text-white rounded-2xl p-7 shadow-md border-t-4 border-[#D4AF37] space-y-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-base font-serif font-bold text-white">
                  Earn a Career Certificate
                </h3>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                Complete 100% of all modules and submit the evaluation survey to earn an official AWIEF certificate co-signed by <strong>Irene Ochem</strong> and <strong>Ekene Ochem</strong>, verifiable by DFIs and commercial banks.
              </p>
              <div className="pt-1 flex items-center justify-between text-[11px] text-[#D4AF37] font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <StarRatingDisplay rating={reviewSummary.averageRating || 5} sizeClass="w-3 h-3" />
                  <span>
                    {reviewSummary.totalReviews > 0
                      ? `${reviewSummary.averageRating.toFixed(1)} rating`
                      : "UN ECOSOC Accredited"}
                  </span>
                </span>
              </div>
            </div>
          </aside>
        </div>

        {/* BAND 4: VERIFIED GRADUATE REVIEWS SYSTEM */}
        <CourseReviewsSection
          courseId={course.id}
          courseTitle={course.title}
          reviews={reviews}
          isLoggedIn={isLoggedIn}
          isEnrolled={isEnrolled}
          userProgress={userProgress}
          canReview={canReview}
          currentUserReview={currentUserReview}
        />
      </div>
    </div>
  );
}
