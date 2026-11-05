import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import DashboardNav from "@/app/dashboard/Nav";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

/**
 * Enterprise Course Catalogue page for the AWIEF Digital Learning Academy.
 * Displays commercial masterclasses with dual ZAR / USD pricing, author royalty attribution,
 * delivery format indicators (Native Bite-Sized Modules vs SCORM Packages),
 * and enrollment state detection.
 *
 * @returns {Promise<JSX.Element>} The rendered course catalogue component.
 */
export default async function CatalogPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  const courses = await prisma.course.findMany({
    orderBy: { createdAt: "asc" },
  });

  let enrolledCourseIds = new Set<string>();
  if (userId) {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      select: { courseId: true },
    });
    enrollments.forEach((e) => enrolledCourseIds.add(e.courseId));
  }

  return (
    <div className="min-h-screen bg-[#FDF8F9] flex flex-col selection:bg-[#7F3D59] selection:text-white">
      {session ? <DashboardNav /> : <Navbar />}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full space-y-10">
        {/* Header */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-[#EAD7E0] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#7F3D59]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

          <div className="max-w-3xl relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#7F3D59]/10 border border-[#7F3D59]/25 rounded-full text-[#7F3D59] text-xs font-bold uppercase tracking-wider">
              <span>★ Pan-African Enterprise Curriculum</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-extrabold text-[#1D0B14] tracking-tight">
              Masterclasses &amp; Enterprise Programmes
            </h1>
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed font-light">
              Designed by leading African business practitioners, angel syndicate principals, and trade experts. Master the critical growth competencies required to attract institutional capital, scale cross-border under AfCFTA, and protect operational cashflow.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-xs text-gray-600">
              <span className="bg-[#FDF8F9] px-3 py-1 rounded-full border border-gray-200">
                💳 PayFast (ZAR Cards &amp; Instant EFT)
              </span>
              <span className="bg-[#FDF8F9] px-3 py-1 rounded-full border border-gray-200">
                🌍 PayPal (USD)
              </span>
              <span className="bg-[#FDF8F9] px-3 py-1 rounded-full border border-gray-200">
                📱 Paystack &amp; M-Pesa / Mobile Money
              </span>
            </div>
          </div>
        </div>

        {/* Course Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {courses.map((course) => {
            const isEnrolled = enrolledCourseIds.has(course.id);
            const priceDisplay = course.isFree 
              ? "Free Sponsored" 
              : `R${course.priceZar.toLocaleString()} / $${course.priceUsd}`;

            let objectives: string[] = [];
            try {
              if (course.learningObjectives) {
                objectives = JSON.parse(course.learningObjectives);
              }
            } catch {
              objectives = course.learningObjectives ? [course.learningObjectives] : [];
            }

            return (
              <div
                key={course.id}
                className="bg-white rounded-3xl shadow-sm border border-[#EAD7E0] hover:shadow-xl hover:border-[#7F3D59]/40 transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Top / Header */}
                <div className="p-8 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="px-3 py-1 bg-[#7F3D59] text-white text-xs font-bold rounded-full uppercase tracking-wider">
                      {course.category || "Masterclass"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#7F3D59] bg-[#FDF8F9] border border-[#7F3D59]/20 px-3 py-1 rounded-full">
                        {priceDisplay}
                      </span>
                      <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        {course.duration || "Self-Paced"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-serif font-bold text-[#1D0B14] group-hover:text-[#7F3D59] transition-colors leading-tight">
                      {course.title}
                    </h2>
                    <p className="text-sm text-gray-600 leading-relaxed font-light">
                      {course.shortDescription || course.description}
                    </p>
                  </div>

                  {/* Format & Mode */}
                  <div className="flex items-center gap-3 text-xs">
                    {course.isNative ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                        <span>⚡ Native Bite-Sized Modules (20-30m each)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-purple-800 border border-purple-200 font-medium">
                        <span>📦 SCORM 1.2 / 2004 Interactive E-Learning</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-gray-500">
                      <span>📶 Low-Bandwidth Mode</span>
                    </span>
                  </div>

                  {/* Faculty & Author */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#7F3D59]/10 border border-[#7F3D59]/20 flex items-center justify-center font-bold text-[#7F3D59]">
                        {(course.authorName || course.instructor || "AW").substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{course.authorName || course.instructor || "AWIEF Faculty"}</p>
                        <p className="text-[11px] text-gray-500">{course.authorRole || course.instructorRole || "Practitioner Expert"}</p>
                      </div>
                    </div>
                    {course.royaltyRate ? (
                      <span className="text-[11px] font-semibold text-[#7F3D59] bg-[#FDF8F9] px-2 py-0.5 rounded border border-[#7F3D59]/20">
                        {course.royaltyRate}% Faculty Royalty
                      </span>
                    ) : null}
                  </div>

                  {/* Competency Highlights */}
                  {objectives.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Core Competencies:</p>
                      <ul className="space-y-1.5 text-xs text-gray-600">
                        {objectives.slice(0, 3).map((obj, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-[#D4AF37] font-bold">✓</span>
                            <span className="line-clamp-1">{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="p-6 bg-[#FDF8F9] border-t border-[#EAD7E0] flex items-center justify-between gap-4">
                  <Link
                    href={`/courses/${course.id}`}
                    className="text-xs font-bold text-gray-700 hover:text-[#7F3D59] transition-colors"
                  >
                    View Syllabus &amp; Overview →
                  </Link>

                  {isEnrolled ? (
                    <Link
                      href={`/course/${course.id}`}
                      className="px-5 py-2.5 bg-[#1D0B14] hover:bg-[#3E1A29] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      Resume Course →
                    </Link>
                  ) : (
                    <Link
                      href={`/courses/${course.id}?checkout=true`}
                      className="px-5 py-2.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      {course.isFree ? "Enroll Free" : `Buy Now (${priceDisplay})`}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
