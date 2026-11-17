import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripQuizAnswersForClient } from "@/lib/quizGrader";
import fs from "fs";
import path from "path";
import QuizClient from "./QuizClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * Quiz and Knowledge Check page.
 * Loads quiz definition from the database Quiz model (Vercel serverless safe),
 * falling back to local JSON if not yet seeded, and presents the interactive assessment.
 *
 * @param {object} props - Dynamic route parameters.
 * @returns {Promise<JSX.Element>} The rendered quiz assessment page.
 */
export default async function QuizPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const reviewMode = searchParams.mode === "review";

  let quiz: any = null;

  // 1. Try fetching from Prisma Quiz model
  try {
    const numericId = parseInt(id, 10);
    const dbQuiz = await prisma.quiz.findFirst({
      where: {
        OR: [
          { quizKey: id },
          ...(!isNaN(numericId) ? [{ id: numericId }] : [])
        ]
      }
    });

    if (dbQuiz) {
      let questions: any[] = [];
      try {
        questions = JSON.parse(dbQuiz.questionsJson);
      } catch {
        questions = [];
      }
      quiz = {
        id: dbQuiz.quizKey,
        name: dbQuiz.name,
        intro: dbQuiz.intro,
        questions: stripQuizAnswersForClient(questions),
      };
    }
  } catch (e) {
    console.error("Failed to fetch quiz from DB:", e);
  }

  // 2. Fallback to moodle_quizzes.json if not found in DB
  if (!quiz) {
    try {
      const quizzesPath = path.join(process.cwd(), "public", "moodle_quizzes.json");
      if (fs.existsSync(quizzesPath)) {
        const quizzesData = JSON.parse(fs.readFileSync(quizzesPath, "utf-8"));
        const rawQuiz = quizzesData.find((q: any) => q.id.toString() === id);
        if (rawQuiz) {
          quiz = {
            ...rawQuiz,
            questions: stripQuizAnswersForClient(rawQuiz.questions || []),
          };
        }
      }
    } catch (e) {
      console.error("Failed to read quizzes JSON file:", e);
    }
  }

  if (!quiz) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#FDF8F9] selection:bg-[#7F3D59] selection:text-white">
      {/* Header */}
      <div className="h-16 bg-[#1D0B14] flex items-center px-4 shadow-md sm:px-6 lg:px-8 border-b border-[#3E1A29]">
        <div className="flex items-center justify-between text-white max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xs text-gray-400 hover:text-white transition-colors">
              ← Dashboard
            </Link>
            <div className="h-4 w-px bg-gray-700"></div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-serif font-bold text-[#D4AF37]">AWIEF Academy</span>
              <span className="text-xs text-gray-400 hidden sm:inline">|</span>
              <span className="text-xs text-gray-200 truncate max-w-xs sm:max-w-md font-medium">
                {quiz.name}
              </span>
            </div>
            {reviewMode && (
              <span className="ml-2 bg-[#7F3D59] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                REVIEW MODE
              </span>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <QuizClient
          quiz={quiz}
          userId={(session.user as any).id}
          role={(session.user as any).role}
          reviewMode={reviewMode}
        />
      </main>
    </div>
  );
}
