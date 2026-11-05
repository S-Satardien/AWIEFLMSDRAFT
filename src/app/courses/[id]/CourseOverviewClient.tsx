"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import CheckoutModal from "./CheckoutModal";

interface ModuleData {
  id: string;
  title: string;
  duration: string;
  videoUrl?: string;
  summary: string;
  topics?: string[];
  caseStudy?: {
    title: string;
    founder?: string;
    country?: string;
    summary?: string;
  };
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

/**
 * Client component presenting comprehensive course overview,
 * dynamic bite-sized module syllabus from JSON, expert faculty biography,
 * and multi-gateway checkout modal integration.
 *
 * @param {object} props - The component properties.
 * @returns {JSX.Element} The rendered course overview component.
 */
export default function CourseOverviewClient({
  course,
  isLoggedIn,
  isEnrolled,
}: {
  course: any;
  isLoggedIn: boolean;
  isEnrolled: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Auto-open checkout modal if query parameter ?checkout=true is present
  useEffect(() => {
    if (searchParams.get("checkout") === "true" && !isEnrolled) {
      if (!isLoggedIn) {
        router.push(`/login?callbackUrl=/courses/${course.id}?checkout=true`);
      } else {
        setIsCheckoutOpen(true);
      }
    }
  }, [searchParams, isEnrolled, isLoggedIn, course.id, router]);

  // Parse learning objectives
  let objectives: string[] = [];
  try {
    if (course.learningObjectives) {
      objectives = JSON.parse(course.learningObjectives);
    }
  } catch {
    objectives = course.learningObjectives ? [course.learningObjectives] : [];
  }

  // Parse structured modules
  let parsedModules: ModuleData[] = [];
  if (course.modulesJson) {
    try {
      parsedModules = JSON.parse(course.modulesJson);
    } catch {
      parsedModules = [];
    }
  }

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

  return (
    <div className="space-y-12">
      {/* Checkout Modal */}
      <CheckoutModal
        course={{
          id: course.id,
          title: course.title,
          priceZar: course.priceZar,
          priceUsd: course.priceUsd,
          isFree: course.isFree,
          royaltyRate: course.royaltyRate,
          authorName: course.authorName || course.instructor,
        }}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
      />

      {/* Hero Header */}
      <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-[#EAD7E0] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#7F3D59]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-[#7F3D59] text-white text-xs font-bold rounded-full uppercase tracking-wider">
                {course.category || "Masterclass"}
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
                {course.duration || "Self-Paced"}
              </span>
              {course.isNative ? (
                <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold rounded-full">
                  ⚡ Native Bite-Sized Modules (20-30m)
                </span>
              ) : (
                <span className="px-3 py-1 bg-purple-50 text-purple-800 border border-purple-200 text-xs font-semibold rounded-full">
                  📦 SCORM 1.2 / 2004 Interactive Package
                </span>
              )}
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-full">
                ★ Verifiable QR Certificate Included
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-serif font-extrabold text-[#1D0B14] tracking-tight leading-tight">
              {course.title}
            </h1>

            <p className="text-lg text-gray-600 leading-relaxed font-light">
              {course.shortDescription || course.description}
            </p>

            <div className="flex items-center gap-3 pt-2 text-sm text-gray-600">
              <div className="w-10 h-10 rounded-full bg-[#7F3D59]/10 text-[#7F3D59] flex items-center justify-center font-bold text-xs border border-[#7F3D59]/20">
                {(course.authorName || course.instructor || "AW").substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-gray-900">{course.authorName || course.instructor || "AWIEF Faculty"}</p>
                <p className="text-xs text-gray-500">{course.authorRole || course.instructorRole || "Practitioner Expert & Syndicate Lead"}</p>
              </div>
            </div>
          </div>

          {/* Action Card */}
          <div className="lg:col-span-4 bg-[#FDF8F9] rounded-3xl p-6 border border-[#EAD7E0] text-center space-y-4">
            <p className="text-xs font-bold text-[#7F3D59] uppercase tracking-wider">Course Enrollment</p>

            {isEnrolled ? (
              <div className="space-y-3">
                <div className="px-4 py-2 bg-emerald-50 text-emerald-800 font-bold text-sm rounded-xl border border-emerald-200 inline-block">
                  ✓ Active Enrollment Confirmed
                </div>
                <Link
                  href={`/course/${course.id}`}
                  className="block w-full py-4 bg-[#7F3D59] hover:bg-[#5E2C41] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  Launch Course Player →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-3xl font-serif font-extrabold text-[#1D0B14]">
                  {priceDisplay}
                </div>
                <p className="text-xs text-gray-500">
                  Instant online access across all 54 African countries with low-bandwidth optimization.
                </p>
                <button
                  type="button"
                  onClick={handleActionClick}
                  className="w-full py-4 bg-[#7F3D59] hover:bg-[#5E2C41] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-base flex items-center justify-center gap-2"
                >
                  <span>{course.isFree ? "Enroll Free in Masterclass" : "Purchase & Enroll Now →"}</span>
                </button>
              </div>
            )}

            <div className="pt-2 border-t border-[#EAD7E0] text-[11px] text-gray-500 space-y-1">
              <p>Supported: PayFast (ZAR), PayPal (USD), M-Pesa &amp; MoMo</p>
              <p className="font-mono text-[#7F3D59]">Voucher: AWIEF-JNJ-DEMO for free review</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left 2 Columns: Objectives & Syllabus */}
        <div className="lg:col-span-2 space-y-10">
          {/* Learning Objectives */}
          {objectives.length > 0 && (
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#EAD7E0] space-y-6">
              <h3 className="text-2xl font-serif font-bold text-gray-900 flex items-center gap-2">
                <span>Learning Objectives &amp; Executive Competencies</span>
              </h3>
              <p className="text-sm text-gray-600 font-light">
                By completing this masterclass, women founders and executives will master:
              </p>
              <div className="grid grid-cols-1 gap-3.5">
                {objectives.map((obj, i) => (
                  <div key={i} className="flex items-start gap-3.5 p-4 rounded-xl bg-[#FDF8F9] border border-[#EAD7E0]">
                    <div className="w-6 h-6 rounded-full bg-[#7F3D59]/10 text-[#7F3D59] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-[#7F3D59]/20">
                      {i + 1}
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed font-medium">{obj}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Curriculum Syllabus */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#EAD7E0] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-2xl font-serif font-bold text-gray-900">
                Detailed Module Syllabus ({parsedModules.length > 0 ? `${parsedModules.length} Modules` : "Syllabus"})
              </h3>
              <span className="text-xs font-semibold text-[#7F3D59] bg-[#FDF8F9] px-3 py-1 rounded-full border border-[#7F3D59]/20 self-start">
                20–30 Mins Per Module
              </span>
            </div>

            {parsedModules.length > 0 ? (
              <div className="space-y-4">
                {parsedModules.map((mod, idx) => (
                  <div
                    key={mod.id || idx}
                    className="border border-[#EAD7E0] rounded-2xl p-6 hover:border-[#7F3D59]/60 transition-colors bg-[#FDF8F9]/40 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-[#7F3D59] text-white flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </span>
                        <h4 className="font-bold font-serif text-gray-900 text-base">{mod.title}</h4>
                      </div>
                      <span className="text-xs font-bold text-[#7F3D59] bg-white border border-[#EAD7E0] px-2.5 py-1 rounded-md self-start sm:self-auto">
                        ⏱ {mod.duration}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed">{mod.summary}</p>

                    {mod.topics && mod.topics.length > 0 && (
                      <div className="pt-2">
                        <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                          Key Topics Covered:
                        </p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-gray-600 list-disc list-inside">
                          {mod.topics.map((t, tidx) => (
                            <li key={tidx} className="leading-normal">{t}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="pt-3 border-t border-gray-200/60 flex flex-wrap gap-4 text-xs">
                      {mod.caseStudy && (
                        <span className="text-[#7F3D59] font-medium flex items-center gap-1">
                          <span>📖 Case Study:</span>
                          <span className="font-semibold">{mod.caseStudy.title}</span>
                        </span>
                      )}
                      {mod.practicalTemplate && (
                        <span className="text-emerald-700 font-medium flex items-center gap-1">
                          <span>📥 Template:</span>
                          <span className="font-semibold">{mod.practicalTemplate.title} ({mod.practicalTemplate.format})</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 leading-relaxed">
                {course.description}
              </p>
            )}
          </div>

          {/* Target Audience */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#EAD7E0] space-y-4">
            <h3 className="text-2xl font-serif font-bold text-gray-900">
              Target Audience &amp; Cohort Profile
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              {course.targetAudience ||
                "African women founders, MSME managing directors, executive managers, and aspiring entrepreneurs across the 54 African countries seeking to accelerate growth, structure investor-ready balance sheets, and access continental export markets."}
            </p>
          </div>
        </div>

        {/* Right Column: Faculty Profile & Verifiable Credentials */}
        <div className="space-y-8">
          {/* Author / Faculty Profile */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#EAD7E0] space-y-4">
            <h3 className="text-xl font-serif font-bold text-gray-900">Lead Faculty Author</h3>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#7F3D59]/10 border border-[#7F3D59]/20 flex items-center justify-center text-base font-bold text-[#7F3D59] shrink-0 font-serif">
                {(course.authorName || course.instructor || "AW").substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 className="font-serif font-extrabold text-gray-900 text-base">
                  {course.authorName || course.instructor || "AWIEF Lead Faculty"}
                </h4>
                <p className="text-xs text-[#7F3D59] font-bold mt-0.5">
                  {course.authorRole || course.instructorRole || "Lead SME Practitioner"}
                </p>
                <p className="text-xs text-gray-500">AWIEF Academy Partner</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed pt-2 border-t border-gray-100">
              {course.authorBio ||
                "A distinguished African finance and enterprise development practitioner with over a decade of hands-on experience guiding growth-stage women founders through angel funding, venture debt, and institutional scale across Sub-Saharan Africa."}
            </p>
            {course.royaltyRate ? (
              <div className="p-3 bg-[#FDF8F9] rounded-xl border border-[#7F3D59]/20 text-[11px] text-[#7F3D59] font-semibold flex items-center justify-between">
                <span>Fair Author Compensation:</span>
                <span className="font-bold">{course.royaltyRate}% Net Distributable Royalty</span>
              </div>
            ) : null}
          </div>

          {/* Verifiable QR Certificate Info */}
          <div className="bg-gradient-to-br from-[#1D0B14] to-[#3E1A29] text-white rounded-3xl p-8 shadow-md space-y-4 relative overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center text-xs font-bold mb-2">
              ★
            </div>
            <h3 className="text-xl font-serif font-bold text-white">Verifiable QR Digital Credential</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Complete 100% of all bite-sized modules, submit the end-of-course survey, and instantly earn an official Certificate of Completion co-signed by <strong>Irene Ochem</strong> (Founder &amp; CEO, AWIEF) and <strong>Ekene Ochem</strong> (Director of Programs &amp; Innovation).
            </p>
            <p className="text-[11px] text-[#D4AF37]">
              Every certificate carries an encrypted, tamper-evident QR code verifiable by commercial banks, DFIs, and institutional grantmakers on our public portal.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleActionClick}
                className="w-full py-3 bg-[#D4AF37] text-[#1D0B14] hover:bg-[#B89628] font-bold rounded-xl text-xs transition-colors shadow-sm font-serif"
              >
                {isEnrolled ? "Access Course" : "Enroll to Earn Credential →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
