import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptPii } from "@/lib/encryption";
import Navbar from "@/components/Navbar";
import DashboardNav from "@/app/dashboard/Nav";
import Footer from "@/components/Footer";
import CourseOverviewClient from "./CourseOverviewClient";

export const dynamic = "force-dynamic";

/**
 * Course overview and pre-enrollment Coursera-style experience description page.
 * Loads course metadata, verified 100%-completion graduate reviews, assessment counts,
 * and active learner enrollment progress.
 *
 * @param props - Dynamic route parameters.
 * @returns The rendered course overview page.
 */
export default async function CourseOverviewPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);

  const [course, rawReviews, quizCount] = await Promise.all([
    prisma.course.findUnique({ where: { id } }),
    prisma.courseReview.findMany({
      where: { courseId: id },
      include: {
        user: {
          select: {
            name: true,
            profession: true,
            organization: true,
            country: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.quiz.count({ where: { courseId: id } }),
  ]);

  if (!course) {
    notFound();
  }

  let isEnrolled = false;
  let userProgress = 0;
  let canReview = false;
  let currentUserReviewId: string | null = null;

  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (userId) {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: id,
        },
      },
    });
    if (enrollment) {
      isEnrolled = true;
      userProgress = enrollment.progress ?? 0;
      canReview = userProgress >= 100 || enrollment.status === "COMPLETED";
    }
    const ownReview = rawReviews.find((r) => r.userId === userId);
    if (ownReview) {
      currentUserReviewId = ownReview.id;
    }
  }

  const serializedReviews = rawReviews.map((r) => ({
    id: r.id,
    userId: r.userId,
    courseId: r.courseId,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    isVerified: r.isVerified,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    user: r.user
      ? {
          ...r.user,
          organization: decryptPii(r.user.organization),
        }
      : null,
  }));

  const currentUserReview = currentUserReviewId
    ? serializedReviews.find((r) => r.id === currentUserReviewId) || null
    : null;

  return (
    <div className="min-h-screen bg-[#FDF8F9] flex flex-col selection:bg-[#7F3D59] selection:text-white">
      {session ? <DashboardNav /> : <Navbar />}

      <main className="flex-1 w-full">
        <CourseOverviewClient
          course={course}
          isLoggedIn={Boolean(userId)}
          isEnrolled={isEnrolled}
          userProgress={userProgress}
          canReview={canReview}
          quizCount={quizCount}
          reviews={serializedReviews}
          currentUserReview={currentUserReview}
        />
      </main>

      <Footer />
    </div>
  );
}
