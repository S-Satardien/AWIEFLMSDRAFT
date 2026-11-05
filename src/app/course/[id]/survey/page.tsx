"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { submitCourseSurvey } from "./actions";
import { getCourseDetails } from "../actions";
import Confetti from "react-confetti";
import { motion } from "framer-motion";

/**
 * End-of-Course Evaluation Survey for the AWIEF Digital Learning Academy.
 * Evaluates pedagogical clarity, bite-sized module pacing, commercial applicability,
 * and unlocks the official verifiable Certificate of Completion.
 *
 * @returns {JSX.Element} The rendered survey form.
 */
export default function CourseSurveyPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [course, setCourse] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [surveyData, setSurveyData] = useState({
    q1_platformNav: 5,
    q2_materialsClear: 5,
    q3_durationAppropriate: 5,
    q4_contentMatchedObjectives: 5,
    q5_understandingBefore: 3,
    q6_understandingAfter: 5,
    q7_confidenceExplain: 5,
    q8_applicationOpenEnded: "",
    q9_recommendedCoursesOpenEnded: ""
  });

  useEffect(() => {
    async function load() {
      if (courseId) {
        const c = await getCourseDetails(courseId);
        setCourse(c);
      }
    }
    load();
  }, [courseId]);

  const likertAgreement = [
    { value: 1, label: "Strongly Disagree" },
    { value: 2, label: "Disagree" },
    { value: 3, label: "Neutral" },
    { value: 4, label: "Agree" },
    { value: 5, label: "Strongly Agree" }
  ];

  const likertUnderstanding = [
    { value: 1, label: "1 - Beginner" },
    { value: 2, label: "2 - Developing" },
    { value: 3, label: "3 - Competent" },
    { value: 4, label: "4 - Advanced" },
    { value: 5, label: "5 - Master" }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!surveyData.q8_applicationOpenEnded.trim()) {
      setErrorMsg("Please provide a short response on how you will apply these frameworks in your enterprise.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await submitCourseSurvey(courseId, surveyData);
      if (res.success) {
        setShowConfetti(true);
        setTimeout(() => {
          router.push(`/certificate/${courseId}`);
        }, 1500);
      } else {
        setErrorMsg(res.error || "Failed to submit survey.");
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  const courseTitle = course?.title || "AWIEF Executive Masterclass";

  return (
    <div className="min-h-screen bg-[#FDF8F9] flex flex-col py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-[#7F3D59] selection:text-white">
      {showConfetti && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <Confetti
            width={typeof window !== "undefined" ? window.innerWidth : 1000}
            height={typeof window !== "undefined" ? window.innerHeight : 1000}
            colors={['#7F3D59', '#D4AF37', '#5E2C41', '#EAD7E0', '#1D0B14']}
          />
        </div>
      )}

      {/* Nav back */}
      <div className="max-w-3xl mx-auto w-full mb-6">
        <Link
          href={`/course/${courseId}`}
          className="text-xs font-semibold text-[#7F3D59] hover:underline flex items-center gap-1"
        >
          <span>← Back to Masterclass Player</span>
        </Link>
      </div>

      <div className="max-w-3xl mx-auto w-full bg-white rounded-3xl shadow-xl border border-[#EAD7E0] p-8 sm:p-12 relative z-10 space-y-8">
        {/* Header */}
        <div className="border-b border-[#EAD7E0] pb-6 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7F3D59]/10 text-[#7F3D59] text-xs font-bold uppercase tracking-wider">
            <span>AWIEF Quality Assurance &amp; Feedback</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1D0B14]">
            Executive Course Evaluation Survey
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed font-light">
            Congratulations on completing <strong>{courseTitle}</strong>! Your rigorous evaluation helps AWIEF maintain institutional pedagogical standards across Africa and immediately unlocks your verifiable Certificate of Completion.
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Platform & Structure */}
          <div className="space-y-6">
            <h3 className="text-base font-serif font-bold text-[#7F3D59] border-b border-gray-100 pb-2">
              Section 1: Pedagogy, Pacing &amp; Digital Delivery
            </h3>

            {/* Q1 */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-800">
                1. The learning platform, video playback, and low-bandwidth toggles were intuitive and responsive:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {likertAgreement.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setSurveyData({ ...surveyData, q1_platformNav: item.value })}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-medium border transition-all ${
                      surveyData.q1_platformNav === item.value
                        ? "bg-[#7F3D59] text-white border-[#7F3D59] font-bold shadow-sm"
                        : "bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Q2 */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-800">
                2. The masterclass case studies, investor models, and downloadable business templates were practical and clear:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {likertAgreement.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setSurveyData({ ...surveyData, q2_materialsClear: item.value })}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-medium border transition-all ${
                      surveyData.q2_materialsClear === item.value
                        ? "bg-[#7F3D59] text-white border-[#7F3D59] font-bold shadow-sm"
                        : "bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Q3 */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-800">
                3. The 20–30 minute bite-sized module duration was well-suited to my busy executive schedule:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {likertAgreement.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setSurveyData({ ...surveyData, q3_durationAppropriate: item.value })}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-medium border transition-all ${
                      surveyData.q3_durationAppropriate === item.value
                        ? "bg-[#7F3D59] text-white border-[#7F3D59] font-bold shadow-sm"
                        : "bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Q4 */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-800">
                4. The course content comprehensively fulfilled the stated commercial learning objectives:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {likertAgreement.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setSurveyData({ ...surveyData, q4_contentMatchedObjectives: item.value })}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-medium border transition-all ${
                      surveyData.q4_contentMatchedObjectives === item.value
                        ? "bg-[#7F3D59] text-white border-[#7F3D59] font-bold shadow-sm"
                        : "bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Competency Acquisition */}
          <div className="space-y-6">
            <h3 className="text-base font-serif font-bold text-[#7F3D59] border-b border-gray-100 pb-2">
              Section 2: Entrepreneurial Competency Acquisition
            </h3>

            {/* Q5 */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-800">
                5. Rate your level of competency in this subject matter BEFORE taking the masterclass:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {likertUnderstanding.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setSurveyData({ ...surveyData, q5_understandingBefore: item.value })}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-medium border transition-all ${
                      surveyData.q5_understandingBefore === item.value
                        ? "bg-[#5E2C41] text-white border-[#5E2C41] font-bold shadow-sm"
                        : "bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Q6 */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-800">
                6. Rate your level of competency in this subject matter AFTER completing the masterclass:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {likertUnderstanding.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setSurveyData({ ...surveyData, q6_understandingAfter: item.value })}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-medium border transition-all ${
                      surveyData.q6_understandingAfter === item.value
                        ? "bg-[#D4AF37] text-[#1D0B14] border-[#D4AF37] font-bold shadow-sm"
                        : "bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Q7 */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-800">
                7. Confidence to pitch to investors, execute trade agreements, or defend financial models:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {likertAgreement.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setSurveyData({ ...surveyData, q7_confidenceExplain: item.value })}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-medium border transition-all ${
                      surveyData.q7_confidenceExplain === item.value
                        ? "bg-[#7F3D59] text-white border-[#7F3D59] font-bold shadow-sm"
                        : "bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Action Plan & Future Learning */}
          <div className="space-y-6">
            <h3 className="text-base font-serif font-bold text-[#7F3D59] border-b border-gray-100 pb-2">
              Section 3: 30-Day Enterprise Implementation Plan
            </h3>

            {/* Q8 */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-800">
                8. Describe at least 2 specific operational actions or frameworks you will implement in your business in the next 30 days: <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={surveyData.q8_applicationOpenEnded}
                onChange={(e) => setSurveyData({ ...surveyData, q8_applicationOpenEnded: e.target.value })}
                placeholder="e.g. 1) Restructure our data room into the 4 standard folders for due diligence; 2) Recalculate our working capital cash runway using the 13-week template..."
                className="w-full p-4 border border-gray-300 rounded-2xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7F3D59] bg-[#FDF8F9]"
              />
            </div>

            {/* Q9 */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-800">
                9. What additional masterclasses or master mentors would you like AWIEF to introduce next?
              </label>
              <textarea
                rows={2}
                value={surveyData.q9_recommendedCoursesOpenEnded}
                onChange={(e) => setSurveyData({ ...surveyData, q9_recommendedCoursesOpenEnded: e.target.value })}
                placeholder="e.g. Supply chain AI automation, ESG reporting for African exporters, Angel syndicate negotiation..."
                className="w-full p-4 border border-gray-300 rounded-2xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7F3D59] bg-[#FDF8F9]"
              />
            </div>
          </div>

          {/* Submission Button */}
          <div className="pt-4 border-t border-[#EAD7E0]">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-[#7F3D59] hover:bg-[#5E2C41] text-white font-bold rounded-2xl shadow-xl transition-all disabled:opacity-50 text-base font-serif flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Generating Verifiable Credential...</span>
              ) : (
                <span>Submit Evaluation &amp; Issue Verifiable Certificate →</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
