import Link from "next/link";
import { getDashboardData, getMyCoursesList } from "../actions";
import { Award, BookOpen, CheckCircle2, ShieldCheck, Zap } from "@/components/Icons";

export const dynamic = "force-dynamic";

/**
 * Enrolled Masterclasses and Curriculum Workspace.
 * Displays enrolled executive courses with progress bars, embedded module quiz status,
 * payment receipts, and available courses to unlock.
 * (Quizzes and assessments live strictly inside each respective course).
 *
 * @returns {Promise<JSX.Element>} The rendered page component.
 */
export default async function CoursesPage() {
  const [data, coursesData] = await Promise.all([
    getDashboardData(),
    getMyCoursesList()
  ]);
  
  if (!data) {
    return <div className="p-8 text-center text-xs text-gray-500">Please sign in to view your courses.</div>;
  }

  const { enrolled = [], available = [] } = coursesData;

  return (
    <div className="space-y-10 pb-16 selection:bg-[#7F3D59] selection:text-white">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-extrabold text-[#1D0B14] tracking-tight">
            My Enrolled Masterclasses &amp; Learning Plan
          </h1>
          <p className="mt-1 text-gray-600 text-sm">
            Track your progress across enrolled executive masterclasses. All learning objectives, business toolkits, and graded module assessments are embedded directly within each course.
          </p>
        </div>
        <Link
          href="/catalog"
          className="self-start sm:self-auto px-5 py-2.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
        >
          <span>Explore All Masterclasses</span>
          <span>→</span>
        </Link>
      </div>

      {/* SECTION 1: Enrolled Masterclasses */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#7F3D59]/10 text-[#7F3D59] rounded-lg">
              <BookOpen className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-serif font-bold text-gray-900">
              Active Enrolled Masterclasses ({enrolled.length})
            </h2>
          </div>
          <span className="text-xs text-gray-500">
            Auto-enrolled upon purchase or scholarship grant
          </span>
        </div>

        {enrolled.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-[#EAD7E0] p-8 space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-[#7F3D59]/10 text-[#7F3D59] flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-serif font-bold text-gray-900">You are not enrolled in any masterclasses yet</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Explore our commercial and sponsored masterclass catalogue to begin your executive learning journey.
              </p>
            </div>
            <Link
              href="/catalog"
              className="px-6 py-2.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white text-xs font-bold rounded-xl shadow-sm inline-block"
            >
              Browse Masterclasses
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {enrolled.map((course: any) => {
              const isComplete = course.progress >= 100;

              return (
                <div
                  key={course.id}
                  className="bg-white rounded-3xl shadow-md border border-[#EAD7E0] overflow-hidden hover:shadow-xl transition-all flex flex-col justify-between relative group"
                >
                  {/* Top Banner */}
                  <div className="h-36 bg-[#1D0B14] relative overflow-hidden flex items-center px-8 shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#1D0B14]/95 via-[#3E1A29]/90 to-[#7F3D59]/40"></div>
                    <div className="relative z-10 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-[#7F3D59] text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                          {course.category || "Masterclass"}
                        </span>
                        <span className="px-2.5 py-0.5 bg-white/20 text-[#D4AF37] text-[10px] font-medium rounded-full">
                          {course.duration || "Self-Paced"}
                        </span>
                        {course.receipt && (
                          <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold rounded-full">
                            Paid via {course.receipt.gateway}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl sm:text-2xl font-serif font-bold text-white leading-tight">
                        {course.title}
                      </h3>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
                    <div className="space-y-3">
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {course.shortDescription}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-1">
                        <span>
                          Faculty: <strong className="text-gray-800">{course.instructor}</strong>
                        </span>
                        <span>
                          Curriculum: <strong>{course.moduleCount} Bite-Sized Modules</strong>
                        </span>
                      </div>
                    </div>

                    {/* Module Progress & Quizzes Metric Strip */}
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-gray-500 uppercase tracking-wider">Curriculum Progress</span>
                          <span className="text-[#7F3D59]">{course.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div 
                            className={`h-3 rounded-full transition-all duration-1000 ${
                              isComplete ? "bg-emerald-600" : "bg-[#7F3D59]"
                            }`}
                            style={{ width: `${course.progress}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Course Quizzes summary */}
                      <div className="flex items-center justify-between text-xs bg-[#FDF8F9] p-3 rounded-xl border border-[#EAD7E0]">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#7F3D59]" />
                          <span className="font-semibold text-gray-700">Course Assessments:</span>
                          <span className="font-bold text-[#7F3D59]">
                            {course.passedQuizzes} of {course.totalQuizzes} Passed
                          </span>
                        </div>
                        <Link
                          href={`/course/${course.id}?tab=grades`}
                          className="text-[#7F3D59] hover:underline font-bold text-[11px]"
                        >
                          View Grades &rarr;
                        </Link>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <Link
                          href={`/course/${course.id}`}
                          className="px-5 py-2.5 bg-[#1D0B14] hover:bg-[#3E1A29] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          {course.progress > 0 ? "Resume Module →" : "Launch Masterclass →"}
                        </Link>

                        {isComplete && !course.surveyCompleted && (
                          <Link
                            href={`/course/${course.id}/survey`}
                            className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#B89628] text-[#1D0B14] rounded-xl text-xs font-bold transition-all shadow-sm font-serif"
                          >
                            Submit Evaluation →
                          </Link>
                        )}

                        {course.certificateNumber && (
                          <Link
                            href={`/certificate/${course.id}`}
                            className="px-5 py-2.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 font-serif"
                          >
                            <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span>View Certificate</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: Available Masterclasses to Unlock */}
      {available.length > 0 && (
        <div className="space-y-6 pt-6 border-t border-[#EAD7E0]">
          <div>
            <h2 className="text-xl font-serif font-bold text-gray-900">
              Available Masterclasses to Unlock ({available.length})
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Expand your founder competencies across venture debt, AfCFTA trade, and financial modeling.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {available.map((course: any) => (
              <div
                key={course.id}
                className="bg-white rounded-2xl p-6 border border-[#EAD7E0] hover:border-[#7F3D59]/50 transition-all shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#7F3D59] bg-[#FDF8F9] px-2.5 py-0.5 rounded-full border border-[#7F3D59]/20">
                      {course.category}
                    </span>
                    <span className="text-xs font-bold text-gray-900 font-mono">
                      {course.isFree ? "Free Sponsored" : `R${course.priceZar.toLocaleString()} / $${course.priceUsd}`}
                    </span>
                  </div>
                  <h3 className="text-base font-serif font-bold text-gray-900 leading-snug">
                    {course.title}
                  </h3>
                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                    {course.shortDescription}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-gray-500 font-medium">{course.duration}</span>
                  <Link
                    href={`/courses/${course.id}`}
                    className="px-4 py-2 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Enroll / Unlock &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
