import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import DashboardNav from "@/app/dashboard/Nav";
import Footer from "@/components/Footer";
import CourseOverviewClient from "./CourseOverviewClient";

export const dynamic = "force-dynamic";

/**
 * Course overview and registration page.
 * Loads course details, verifies active learner enrollment,
 * and renders the interactive syllabus and checkout modal.
 *
 * @param {object} props - Dynamic route parameters.
 * @returns {Promise<JSX.Element>} The rendered course overview page.
 */
export default async function CourseOverviewPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);

  const course = await prisma.course.findUnique({
    where: { id },
  });

  if (!course) {
    notFound();
  }

  let isEnrolled = false;
  if (session?.user) {
    const userId = (session.user as any).id;
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
    }
  }

  return (
    <div className="min-h-screen bg-[#FDF8F9] flex flex-col selection:bg-[#7F3D59] selection:text-white">
      {session ? <DashboardNav /> : <Navbar />}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-6">
          <Link href="/" className="hover:text-[#7F3D59] transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/catalog" className="hover:text-[#7F3D59] transition-colors">
            Masterclass Catalogue
          </Link>
          <span>/</span>
          <span className="text-gray-800 truncate max-w-xs sm:max-w-md font-medium">
            {course.title}
          </span>
        </nav>

        <CourseOverviewClient
          course={course}
          isLoggedIn={!!session?.user}
          isEnrolled={isEnrolled}
        />
      </main>

      <Footer />
    </div>
  );
}
