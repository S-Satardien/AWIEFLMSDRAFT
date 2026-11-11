"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  getStudentFullProfile,
  adminEnrollUserInCourse,
  adminUpdateEnrollmentProgress,
  adminUnenrollUser,
  updateUserRole,
  resetUserPassword
} from "./actions";
import {
  X,
  Award,
  Globe,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  BookOpen,
  Check,
  CircleDollarSign,
  Plus,
  RefreshCw,
  Lock,
  Sparkles
} from "@/components/Icons";

interface StudentProfileDrawerProps {
  userId: string;
  allCourses: any[];
  onClose: () => void;
  onRefreshParent?: () => void;
}

/**
 * Single Student 360° Profile Dossier component for AWIEF Administrators.
 * Inspects an individual founder's LinkedIn-style executive identity,
 * all enrolled masterclasses, completion rates, quiz attempts, and certificates,
 * with real-time enrollment and progress management controls.
 *
 * @param {StudentProfileDrawerProps} props - Component properties.
 * @returns {JSX.Element} The rendered 360° dossier slide-over.
 */
export default function StudentProfileDrawer({
  userId,
  allCourses,
  onClose,
  onRefreshParent
}: StudentProfileDrawerProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedCourseToEnroll, setSelectedCourseToEnroll] = useState("");
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getStudentFullProfile(userId);
      setProfile(data);
    } catch (e: any) {
      setFeedback({ text: e.message || "Failed to load student profile.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const handleEnrollCourse = async () => {
    if (!selectedCourseToEnroll) return;
    setActionLoading(true);
    try {
      const res = await adminEnrollUserInCourse(userId, selectedCourseToEnroll);
      if (res.success) {
        setFeedback({ text: "Student successfully enrolled!", type: "success" });
        setSelectedCourseToEnroll("");
        await loadData();
        if (onRefreshParent) onRefreshParent();
      } else {
        setFeedback({ text: res.error || "Failed to enroll student.", type: "error" });
      }
    } catch (e: any) {
      setFeedback({ text: e.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetProgress = async (enrollmentId: string, pct: number) => {
    setActionLoading(true);
    try {
      const res = await adminUpdateEnrollmentProgress(enrollmentId, pct);
      if (res.success) {
        setFeedback({ text: `Progress updated to ${pct}%`, type: "success" });
        await loadData();
        if (onRefreshParent) onRefreshParent();
      }
    } catch (e: any) {
      setFeedback({ text: e.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnenroll = async (enrollmentId: string, courseTitle: string) => {
    if (!confirm(`Are you sure you want to unenroll this student from "${courseTitle}"?`)) return;
    setActionLoading(true);
    try {
      const res = await adminUnenrollUser(enrollmentId);
      if (res.success) {
        setFeedback({ text: "Student unenrolled successfully.", type: "success" });
        await loadData();
        if (onRefreshParent) onRefreshParent();
      }
    } catch (e: any) {
      setFeedback({ text: e.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleChange = async (newRole: string) => {
    try {
      const res = await updateUserRole(userId, newRole);
      if (res.success) {
        setFeedback({ text: `Role updated to ${newRole}`, type: "success" });
        await loadData();
        if (onRefreshParent) onRefreshParent();
      }
    } catch (e: any) {
      setFeedback({ text: e.message, type: "error" });
    }
  };

  const handleResetPassword = async () => {
    if (!confirm("Reset this user's password to 'changeme123'?")) return;
    try {
      const res = await resetUserPassword(userId);
      if (res.success) {
        alert("Password reset successfully. Default password is 'changeme123'");
      }
    } catch (e: any) {
      alert("Failed to reset password: " + e.message);
    }
  };

  // Courses not yet enrolled
  const unenrolledCourses = allCourses.filter(
    (c) => !profile?.enrollments?.some((e: any) => e.courseId === c.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col overflow-hidden text-xs selection:bg-[#7F3D59] selection:text-white"
      >
        {/* Top Header */}
        <div className="p-6 bg-[#1D0B14] text-white flex items-center justify-between shrink-0 border-b border-[#3E1A29]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#7F3D59] text-white flex items-center justify-center font-bold font-serif text-sm border border-[#D4AF37]">
              {profile?.name ? profile.name.slice(0, 2).toUpperCase() : "360"}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] block">
                Single Student 360° Profile Dossier
              </span>
              <h2 className="text-lg font-serif font-bold text-white leading-tight">
                {profile?.name || "Loading Student..."}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 text-xs font-semibold shrink-0 ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-b border-emerald-200"
                : "bg-red-50 text-red-800 border-b border-red-200"
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* Main Body */}
        {loading || !profile ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#7F3D59]"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
            
            {/* 1. LINKEDIN-STYLE IDENTITY & DEMOGRAPHICS CARD */}
            <div className="p-6 rounded-3xl bg-[#FDF8F9] border border-[#EAD7E0] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-serif font-bold text-gray-900">{profile.name}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#7F3D59]/10 text-[#7F3D59] border border-[#7F3D59]/20 uppercase">
                      {profile.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono">{profile.email}</p>
                  <p className="text-xs font-medium text-gray-800 pt-1">
                    {profile.headline || `${profile.profession || "Founder"} at ${profile.organization || "Pan-African Enterprise"}`}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <select
                    value={profile.role}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-700"
                  >
                    <option value="STUDENT">Student</option>
                    <option value="REVIEWER">Reviewer</option>
                    <option value="ADMIN">Admin</option>
                  </select>

                  <button
                    onClick={handleResetPassword}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold border border-red-200"
                    title="Reset password to 'changeme123'"
                  >
                    Reset Password
                  </button>
                </div>
              </div>

              {/* Demographics Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                <div className="bg-white p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Venture</span>
                  <span className="font-bold text-gray-800 truncate block">{profile.organization || "—"}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Location</span>
                  <span className="font-bold text-gray-800 truncate block">
                    {profile.city ? `${profile.city}, ` : ""}[{profile.country || "ZA"}]
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Stage</span>
                  <span className="font-bold text-[#7F3D59] truncate block">{profile.businessStage || "Growth"}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Industry</span>
                  <span className="font-bold text-gray-800 truncate block">{profile.sector || "Enterprise"}</span>
                </div>
              </div>

              {/* Bio & Skills */}
              {profile.bio && (
                <div className="pt-2 text-xs text-gray-600 leading-relaxed bg-white p-3.5 rounded-xl border border-gray-100">
                  <strong className="text-gray-800 block mb-1">Founder Executive Bio:</strong>
                  {profile.bio}
                </div>
              )}

              {profile.skills && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {profile.skills.split(",").map((s: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-white border border-[#EAD7E0] rounded-lg text-[10px] font-semibold text-gray-700"
                    >
                      {s.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 2. ENROLLED MASTERCLASSES & COMPLETION CONTROLS */}
            <div className="bg-white rounded-3xl p-6 border border-[#EAD7E0] shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-base font-serif font-bold text-gray-900">
                    Enrolled Masterclasses &amp; Completion Rates ({profile.enrollments?.length || 0})
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Manage student enrollment, inspect completion meters, and adjust progress.
                  </p>
                </div>

                {/* Quick Enroll Picker */}
                {unenrolledCourses.length > 0 && (
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedCourseToEnroll}
                      onChange={(e) => setSelectedCourseToEnroll(e.target.value)}
                      className="px-2.5 py-1.5 bg-[#FDF8F9] border border-gray-300 rounded-xl text-xs font-bold"
                    >
                      <option value="">Select course to enroll...</option>
                      {unenrolledCourses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!selectedCourseToEnroll || actionLoading}
                      onClick={handleEnrollCourse}
                      className="px-3 py-1.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Enroll</span>
                    </button>
                  </div>
                )}
              </div>

              {profile.enrollments?.length === 0 ? (
                <p className="text-xs text-gray-500 py-4 italic text-center">
                  This user is not enrolled in any masterclasses yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {profile.enrollments.map((e: any) => (
                    <div
                      key={e.enrollmentId}
                      className="p-4 rounded-2xl bg-[#FDF8F9] border border-[#EAD7E0] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 max-w-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-bold text-gray-900 text-xs truncate">
                            {e.courseTitle}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              e.progress >= 100
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {e.progress}% Complete
                          </span>
                        </div>
                        <div className="w-48 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-1.5 bg-[#7F3D59] rounded-full"
                            style={{ width: `${e.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] text-gray-500 block">
                          Last active: {new Date(e.lastAccess).toLocaleDateString()}
                          {e.certificateNumber && ` • Credential: ${e.certificateNumber}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleSetProgress(e.enrollmentId, 100)}
                          disabled={actionLoading || e.progress >= 100}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold disabled:opacity-40"
                        >
                          Mark 100%
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetProgress(e.enrollmentId, 0)}
                          disabled={actionLoading || e.progress === 0}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] font-bold disabled:opacity-40"
                        >
                          Reset 0%
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUnenroll(e.enrollmentId, e.courseTitle)}
                          disabled={actionLoading}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[10px] font-bold"
                        >
                          Unenroll
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. ASSESSMENTS & QUIZ PERFORMANCE LOG */}
            <div className="bg-white rounded-3xl p-6 border border-[#EAD7E0] shadow-sm space-y-3">
              <h3 className="text-base font-serif font-bold text-gray-900 border-b border-gray-100 pb-3">
                Graded Assessment History ({profile.quizAttempts?.length || 0})
              </h3>

              {profile.quizAttempts?.length === 0 ? (
                <p className="text-xs text-gray-500 py-3 italic">No assessments attempted yet.</p>
              ) : (
                <div className="space-y-2">
                  {profile.quizAttempts.map((attempt: any) => (
                    <div
                      key={attempt.id}
                      className="p-3 rounded-xl bg-[#FDF8F9] border border-gray-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-gray-800">Quiz Key #{attempt.quizId}</span>
                        <span className="text-gray-400 text-[10px] ml-2 font-mono">
                          {new Date(attempt.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-700">
                          {attempt.score} / {attempt.maxScore} (
                          {Math.round((attempt.score / attempt.maxScore) * 100)}%)
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            attempt.passed
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {attempt.passed ? "Passed" : "Failed"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. VERIFIABLE CERTIFICATES */}
            <div className="bg-white rounded-3xl p-6 border border-[#EAD7E0] shadow-sm space-y-3">
              <h3 className="text-base font-serif font-bold text-gray-900 border-b border-gray-100 pb-3">
                Issued Verifiable Credentials ({profile.certificates?.length || 0})
              </h3>

              {profile.certificates?.length === 0 ? (
                <p className="text-xs text-gray-500 py-3 italic">No certificates issued yet.</p>
              ) : (
                <div className="space-y-2">
                  {profile.certificates.map((cert: any) => (
                    <div
                      key={cert.id}
                      className="p-3 rounded-xl bg-[#FDF8F9] border border-[#EAD7E0] flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-serif font-bold text-gray-900 block">{cert.courseTitle}</span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          ID: {cert.certificateNumber} • Issued: {new Date(cert.issuedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <Link
                        href={`/verify/${cert.certificateNumber}`}
                        target="_blank"
                        className="px-3 py-1 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-lg text-[10px] font-bold"
                      >
                        Verify Credential →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </motion.div>
    </div>
  );
}
