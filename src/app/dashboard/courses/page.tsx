import Link from "next/link";
import { getDashboardData, getMyCoursesList } from "../actions";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { Award } from "@/components/Icons";

export const dynamic = "force-dynamic";

/**
 * Enrolled Masterclasses and Practical Assessment Hub.
 * Renders active course modules, progress meters, and entrepreneur competency quizzes.
 *
 * @returns {Promise<JSX.Element>} The rendered page component.
 */
export default async function CoursesPage() {
  const [data, courses] = await Promise.all([
    getDashboardData(),
    getMyCoursesList()
  ]);
  
  if (!data) {
    return <div className="p-8 text-center text-xs text-gray-500">Please sign in to view your courses.</div>;
  }

  // Load quizzes from database first (Vercel-safe), falling back to JSON
  let quizzesData: any[] = [];
  try {
    const dbQuizzes = await prisma.quiz.findMany();
    if (dbQuizzes.length > 0) {
      quizzesData = dbQuizzes.map((q) => {
        let questions: any[] = [];
        try {
          questions = JSON.parse(q.questionsJson);
        } catch {
          questions = [];
        }
        return {
          id: q.quizKey,
          name: q.name,
          intro: q.intro,
          questions,
        };
      });
    } else {
      const quizzesPath = path.join(process.cwd(), "public", "moodle_quizzes.json");
      if (fs.existsSync(quizzesPath)) {
        quizzesData = JSON.parse(fs.readFileSync(quizzesPath, "utf-8"));
      }
    }
  } catch {
    quizzesData = [];
  }

  return (
    <div className="space-y-10 pb-12 selection:bg-[#7F3D59] selection:text-white">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-extrabold text-[#1D0B14] tracking-tight">
            My Masterclasses &amp; Learning Plan
          </h1>
          <p className="mt-1 text-gray-600 text-sm">
            Track your progress across enrolled executive masterclasses, complete evaluations, and access official verifiable credentials.
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

      {/* SECTION 1: Course Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {courses.map((course) => {
          const isComplete = course.progress >= 100;

          return (
            <div
              key={course.id}
              className="bg-white rounded-3xl shadow-md border border-[#EAD7E0] overflow-hidden hover:shadow-xl transition-all flex flex-col justify-between relative group"
            >
              {/* Top Banner */}
              <div className="h-36 bg-[#1D0B14] relative overflow-hidden flex items-center px-8 shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-[#1D0B14]/95 via-[#3E1A29]/90 to-[#7F3D59]/40"></div>
                <div className="relative z-10 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-[#7F3D59] text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                      {course.category || "Masterclass"}
                    </span>
                    <span className="px-2.5 py-0.5 bg-white/20 text-[#D4AF37] text-[10px] font-medium rounded-full">
                      {course.duration || "Self-Paced"}
                    </span>
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
                  <p className="text-xs text-gray-500 font-medium">
                    Faculty: <strong className="text-gray-800">{course.instructor || "AWIEF Faculty"}</strong>
                  </p>
                </div>

                {/* Progress Bar & Actions */}
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

      {/* SECTION 2: Interactive Competency Quizzes */}
      {quizzesData.length > 0 && (
        <div className="space-y-6 pt-6 border-t border-[#EAD7E0]">
          <div>
            <h2 className="text-2xl font-serif font-bold text-[#1D0B14]">
              Executive Competency Assessments
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Reinforce core investment, AfCFTA trade, and financial modeling principles through scenario evaluations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzesData.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-white rounded-2xl p-6 border border-[#EAD7E0] hover:border-[#7F3D59]/50 transition-all shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7F3D59] bg-[#FDF8F9] px-2.5 py-0.5 rounded-full border border-[#7F3D59]/20">
                    {quiz.questions?.length || 5} Questions
                  </span>
                  <h3 className="text-base font-serif font-bold text-gray-900 leading-snug">
                    {quiz.name}
                  </h3>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {quiz.intro || "Scenario-based executive assessment testing practical decision-making."}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-medium">Passing score: 80%</span>
                  <Link
                    href={`/quiz/${quiz.id}`}
                    className="px-4 py-2 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Start Assessment →
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
