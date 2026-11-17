import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import crypto from "crypto";
import QRCode from "qrcode";
import { signCertificatePayload } from "@/lib/cryptoCert";
import CertificateActions from "./CertificateActions";
import DashboardNav from "@/app/dashboard/Nav";
import Footer from "@/components/Footer";
import { CourseReviewComposer } from "@/components/CourseReviewsSection";
import { Award, Check } from "@/components/Icons";

export const dynamic = "force-dynamic";

/**
 * Verifiable Executive Certificate of Completion page.
 * Formats the official digital credential with AWIEF plum & gold filigree styling,
 * UN ECOSOC Consultative Status seal, co-signatures of Irene Ochem & Ekene Ochem,
 * and an encrypted live QR Code linking to the public verification portal.
 *
 * @param {object} props - Dynamic route parameters.
 * @returns {Promise<JSX.Element>} The rendered certificate page.
 */
export default async function CertificatePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = await props.params;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect(`/login?callbackUrl=/certificate/${courseId}`);
  }

  const userId = (session.user as any).id;

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    include: {
      user: true,
      course: true,
      certificate: true,
      surveyResponse: true,
    },
  });

  if (!enrollment) {
    redirect(`/courses/${courseId}`);
  }

  const isCourseComplete = enrollment.status === "COMPLETED" || enrollment.progress >= 100;
  const isSurveyComplete = Boolean(enrollment.surveyCompleted || enrollment.surveyResponse);

  // If prerequisites are not met, render the pending status guide
  if (!isCourseComplete || !isSurveyComplete) {
    return (
      <div className="min-h-screen bg-[#FDF8F9] flex flex-col selection:bg-[#7F3D59] selection:text-white">
        <DashboardNav />

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1 w-full">
          <div className="bg-white rounded-3xl shadow-xl border border-[#EAD7E0] p-8 sm:p-12 text-center space-y-8">
            <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-[#D4AF37] rounded-2xl flex items-center justify-center mx-auto">
              <Award className="w-8 h-8 text-[#D4AF37]" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-[#1D0B14]">
                Certificate Prerequisites Pending
              </h1>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Official certificates of completion are issued once all masterclass modules, case studies, and the executive evaluation survey are fulfilled.
              </p>
            </div>

            {/* Checklist */}
            <div className="bg-[#FDF8F9] rounded-2xl p-6 border border-[#EAD7E0] text-left space-y-4 max-w-md mx-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isCourseComplete ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"}`}>
                    {isCourseComplete ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : "1"}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Bite-Sized Modules (100%)</p>
                    <p className="text-xs text-gray-500">Current progress: {enrollment.progress}%</p>
                  </div>
                </div>
                <span className={`text-xs font-bold ${isCourseComplete ? "text-emerald-700" : "text-amber-600"}`}>
                  {isCourseComplete ? "Completed" : "In Progress"}
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isSurveyComplete ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"}`}>
                    {isSurveyComplete ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : "2"}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Executive Evaluation Survey</p>
                    <p className="text-xs text-gray-500">9-question pedagogical review</p>
                  </div>
                </div>
                <span className={`text-xs font-bold ${isSurveyComplete ? "text-emerald-700" : "text-gray-400"}`}>
                  {isSurveyComplete ? "Submitted" : "Pending"}
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row justify-center gap-4">
              {!isCourseComplete ? (
                <Link
                  href={`/course/${courseId}`}
                  className="px-6 py-3 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  Resume Masterclass Modules →
                </Link>
              ) : (
                <Link
                  href={`/course/${courseId}/survey`}
                  className="px-6 py-3 bg-[#D4AF37] hover:bg-[#B89628] text-[#1D0B14] rounded-xl text-xs font-bold transition-all shadow-md font-serif"
                >
                  Complete Evaluation Survey →
                </Link>
              )}
              <Link
                href="/dashboard/courses"
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all"
              >
                Back to My Academy
              </Link>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // Get or create cryptographically signed certificate record
  let certificate = enrollment.certificate;
  if (!certificate) {
    const randomCode = crypto.randomBytes(3).toString("hex").toUpperCase();
    const codePart = courseId.replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase() || "MAST";
    const certNum = `CERT-AWIEF-2026-${codePart}-${randomCode}`;
    const issuedAt = new Date();
    const hmacSig = signCertificatePayload({
      certificateNumber: certNum,
      userId,
      courseId,
      issuedAt,
    });

    certificate = await prisma.certificate.create({
      data: {
        certificateNumber: certNum,
        enrollmentId: enrollment.id,
        userId,
        courseId,
        recipientName: enrollment.user.name || enrollment.user.email,
        courseTitle: enrollment.course.title,
        issuedAt,
        qrCodeData: hmacSig,
      },
    });
  }

  const issueDateFormatted = new Date(certificate.issuedAt).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  const verificationUrl = `${(process.env.NEXTAUTH_URL || 'https://awieflmsdraft.vercel.app').replace(/\/$/, "")}/verify/${certificate.certificateNumber}`;
  const qrCodeImageUrl = await QRCode.toDataURL(verificationUrl, {
    width: 220,
    margin: 1,
    color: {
      dark: "#1D0B14",
      light: "#FFFFFF",
    },
  });

  const existingReview = await prisma.courseReview.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
  });

  return (
    <div className="min-h-screen bg-[#F7EEF2] py-10 px-4 sm:px-6 flex flex-col items-center justify-center selection:bg-[#7F3D59] selection:text-white">
      {/* Client Action Header Bar */}
      <CertificateActions
        certificateNumber={certificate.certificateNumber}
        courseId={courseId}
      />

      {/* Certificate Document Container */}
      <div 
        id="certificate-print-area"
        className="w-full max-w-5xl aspect-[1.414/1] bg-white rounded-2xl shadow-2xl p-8 sm:p-14 relative flex flex-col justify-between border-8 border-[#7F3D59] overflow-hidden text-gray-900"
        style={{
          boxShadow: "0 25px 50px -12px rgba(127, 61, 89, 0.25)",
        }}
      >
        {/* Inner Gold Filigree Border */}
        <div className="absolute inset-3 border-2 border-[#D4AF37] pointer-events-none rounded-lg"></div>
        <div className="absolute inset-5 border border-[#D4AF37]/40 pointer-events-none rounded"></div>

        {/* Subtle Watermark Logo */}
        <div 
          className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none"
        >
          <img src="/images/awief-logo.jpg" alt="Watermark" className="w-[500px] h-auto object-contain" />
        </div>

        {/* Certificate Header */}
        <div className="relative z-10 text-center space-y-3">
          <div className="flex items-center justify-center gap-4 mb-2">
            <img 
              src="/images/awief-logo.jpg" 
              alt="AWIEF Logo" 
              className="h-16 w-auto object-contain" 
            />
          </div>

          <div className="space-y-0.5">
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-[0.22em] text-[#7F3D59]">
              Africa Women Innovation &amp; Entrepreneurship Forum (AWIEF)
            </h3>
            <p className="text-[11px] sm:text-xs font-semibold text-[#D4AF37] uppercase tracking-widest flex items-center justify-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Special Consultative Status with the United Nations ECOSOC</span>
            </p>
          </div>

          <div className="pt-2">
            <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-widest text-[#1D0B14] uppercase">
              Executive Certificate of Completion
            </h1>
            <div className="w-24 h-1 bg-[#D4AF37] mx-auto mt-2 rounded-full"></div>
          </div>
        </div>

        {/* Certificate Body */}
        <div className="relative z-10 text-center my-4 space-y-4">
          <p className="text-xs sm:text-sm font-serif italic text-gray-600 tracking-wide">
            This is to officially certify that
          </p>

          <div className="py-1">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#7F3D59] underline decoration-1 underline-offset-8 decoration-[#D4AF37]">
              {certificate.recipientName}
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-gray-700 max-w-2xl mx-auto leading-relaxed font-light">
            has successfully fulfilled all instructional modules, applied Pan-African case studies, and practical executive assessments for the masterclass:
          </p>

          <div className="py-1">
            <h3 className="text-lg sm:text-xl font-serif font-bold text-gray-900 max-w-3xl mx-auto leading-snug">
              {certificate.courseTitle}
            </h3>
          </div>
        </div>

        {/* Certificate Footer / Dual Signatures & Live Verifiable QR Code */}
        <div className="relative z-10 pt-4 border-t border-[#D4AF37]/50 grid grid-cols-3 items-end gap-4">
          
          {/* Signatory 1: Irene Ochem */}
          <div className="text-left space-y-1">
            <div className="h-10 flex items-center font-serif text-xl italic text-gray-800 border-b border-gray-400 pl-1 font-bold">
              Irene Ochem
            </div>
            <p className="text-xs font-bold text-gray-900 leading-tight pt-1">
              Irene Ochem
            </p>
            <p className="text-[10px] text-gray-500 leading-tight">
              Founder &amp; Chief Executive Officer<br />
              AWIEF NPC • Cape Town Secretariat
            </p>
          </div>

          {/* Center: Live Verifiable QR Code */}
          <div className="text-center flex flex-col items-center justify-center">
            <a
              href={`/verify/${certificate.certificateNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 bg-white border border-[#D4AF37] rounded-lg shadow-sm hover:scale-105 transition-transform block"
              title="Click or scan to verify credential"
            >
              <img
                src={qrCodeImageUrl}
                alt="Verifiable QR Code"
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
              />
            </a>
            <span className="text-[9px] uppercase tracking-wider text-gray-500 font-mono mt-1">
              Scan to Authenticate
            </span>
          </div>

          {/* Signatory 2: Ekene Ochem */}
          <div className="text-right space-y-1">
            <div className="h-10 flex items-center justify-end font-serif text-xl italic text-gray-800 border-b border-gray-400 pr-1 font-bold">
              Ekene Ochem
            </div>
            <p className="text-xs font-bold text-gray-900 leading-tight pt-1">
              Ekene Ochem
            </p>
            <p className="text-[10px] text-gray-500 leading-tight">
              Director of Programs &amp; Innovation<br />
              AWIEF NPC
            </p>
            <div className="pt-1">
              <span className="text-[9px] font-mono font-bold text-[#7F3D59]">
                {certificate.certificateNumber}
              </span>
              <p className="text-[9px] text-gray-400">Issued: {issueDateFormatted}</p>
            </div>
          </div>

        </div>

      </div>

      {/* Verified 100%-Completion Graduate Review Box */}
      <div className="max-w-5xl w-full mt-8 no-print">
        <CourseReviewComposer
          courseId={courseId}
          courseTitle={enrollment.course.title}
          existingReview={
            existingReview
              ? {
                  id: existingReview.id,
                  rating: existingReview.rating,
                  title: existingReview.title,
                  comment: existingReview.comment,
                }
              : null
          }
        />
      </div>
    </div>
  );
}
