"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { COUNTRIES } from "@/lib/countries";
import {
  changePassword,
  updateProfile,
  exportMyPersonalData,
  deleteMyAccount,
  FounderProfileUpdatePayload,
} from "./actions";
import {
  Sparkles,
  Lock,
  Pencil,
  Award,
  Globe,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  BookOpen,
  X,
  Check
} from "@/components/Icons";

/**
 * LinkedIn-Style Profile Builder and Executive Portfolio for AWIEF Academy Founders.
 * Features an All-Star Profile Strength meter, enterprise background, core competencies,
 * verified digital credentials, and interactive edit mode.
 *
 * @param {object} props - User profile properties.
 * @returns {JSX.Element} The rendered LinkedIn-style profile.
 */
export default function ProfileClient({ user }: { user: any }) {
  const [profile, setProfile] = useState(user);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Form State
  const [formData, setFormData] = useState<FounderProfileUpdatePayload>({
    name: profile.name || "",
    headline: profile.headline || "",
    bio: profile.bio || "",
    country: profile.country || "ZA",
    city: profile.city || "",
    organization: profile.organization || "",
    profession: profile.profession || "",
    businessStage: profile.businessStage || "Growth Stage",
    sector: profile.sector || "Agribusiness & Food Processing",
    awiefProgram: profile.awiefProgram || "Growth Accelerator",
    yearsInBusiness: profile.yearsInBusiness || "3-5 years",
    website: profile.website || "",
    linkedinUrl: profile.linkedinUrl || "",
    twitterUrl: profile.twitterUrl || "",
    skills: profile.skills || "",
    education: profile.education || "",
    showOnLeaderboard: profile.showOnLeaderboard ?? true,
  });

  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Calculate LinkedIn Profile Strength Score (0 - 100%)
  const profileStrength = useMemo(() => {
    let score = 0;
    const missing: string[] = [];

    if (profile.name) score += 10;
    if (profile.headline) score += 15; else missing.push("Add a professional headline");
    if (profile.bio) score += 15; else missing.push("Write your founder story / executive bio");
    if (profile.organization) score += 15; else missing.push("Add your enterprise or venture name");
    if (profile.profession) score += 10;
    if (profile.country && profile.city) score += 10; else missing.push("Specify your city and country");
    if (profile.skills) score += 10; else missing.push("List your core competencies / skills");
    if (profile.education) score += 5; else missing.push("Add your academic / executive education");
    if (profile.website || profile.linkedinUrl) score += 10; else missing.push("Connect your venture website or LinkedIn");

    let level = "Beginner";
    if (score >= 90) level = "All-Star";
    else if (score >= 70) level = "Advanced";
    else if (score >= 45) level = "Intermediate";

    return {
      score: Math.min(100, score),
      level,
      nextSuggestion: missing[0] || "Profile is 100% complete!"
    };
  }, [profile]);

  // Parse skills
  const skillsList = useMemo(() => {
    if (!profile.skills) return [];
    return profile.skills
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
  }, [profile.skills]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setFeedbackMsg(null);

    try {
      const res = await updateProfile(formData);
      if (res.success) {
        setProfile({ ...profile, ...formData });
        setIsEditing(false);
        setFeedbackMsg({ text: "Founder profile updated successfully!", type: "success" });
      } else {
        setFeedbackMsg({ text: res.error || "Failed to update profile.", type: "error" });
      }
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || "An unexpected error occurred.", type: "error" });
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: "New passwords do not match.", type: "error" });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ text: "Password must be at least 6 characters.", type: "error" });
      return;
    }

    setPasswordLoading(true);
    setPasswordMsg(null);

    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMsg({ text: "Password changed successfully!", type: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setIsChangingPassword(false), 2000);
    } catch (err: any) {
      setPasswordMsg({ text: err.message || "Failed to update password.", type: "error" });
    } finally {
      setPasswordLoading(false);
    }
  };

  const initials = profile.name
    ? profile.name
        .split(" ")
        .map((p: string) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  const countryObj = COUNTRIES.find((c) => c.code === profile.country);

  return (
    <div className="space-y-8 max-w-5xl mx-auto selection:bg-[#7F3D59] selection:text-white">
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold ${
            feedbackMsg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {feedbackMsg.text}
        </div>
      )}

      {/* 1. LINKEDIN-STYLE EXECUTIVE COVER & IDENTITY CARD */}
      <div className="bg-white rounded-3xl shadow-md border border-[#EAD7E0] overflow-hidden relative">
        {/* Cover Banner */}
        <div className="h-44 sm:h-56 bg-gradient-to-r from-[#1D0B14] via-[#5E2C41] to-[#7F3D59] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:16px_16px] opacity-15"></div>
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-white/90 hover:bg-white text-gray-800 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 backdrop-blur-sm"
            >
              <Pencil className="w-3.5 h-3.5 text-[#7F3D59]" />
              <span>Edit Profile</span>
            </button>
            <button
              onClick={() => setIsChangingPassword(!isChangingPassword)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-sm"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Security</span>
            </button>
          </div>
        </div>

        {/* Profile Avatar & Details Strip */}
        <div className="px-6 sm:px-10 pb-8 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 gap-4 mb-4">
            <div className="relative">
              <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-3xl bg-[#7F3D59] text-white flex items-center justify-center text-3xl sm:text-4xl font-serif font-black shadow-xl ring-4 ring-white border-2 border-[#D4AF37]">
                {initials}
              </div>
              <span
                className="absolute bottom-2 right-2 w-5 h-5 bg-emerald-500 rounded-full ring-2 ring-white"
                title="Active Pan-African Founder"
              ></span>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <span className="px-3 py-1 bg-[#7F3D59]/10 text-[#7F3D59] border border-[#7F3D59]/20 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#7F3D59]" />
                <span>
                  {profile.role === "ADMIN"
                    ? "AWIEF Director"
                    : profile.role === "REVIEWER"
                    ? "Faculty Author"
                    : "Pan-African Founder"}
                </span>
              </span>

              {profile.isAwiefAlumni && (
                <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full text-xs font-bold flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>AWIEF Fellow</span>
                </span>
              )}
            </div>
          </div>

          {/* Founder Identity & Headline */}
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-baseline gap-2">
              <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-[#1D0B14]">
                {profile.name}
              </h1>
              <span className="text-xs text-gray-500 font-mono">({profile.email})</span>
            </div>

            <p className="text-base sm:text-lg font-medium text-gray-800 leading-snug">
              {profile.headline || `${profile.profession || "Founder"} at ${profile.organization || "Pan-African Enterprise"}`}
            </p>

            {/* Location & Enterprise Badges */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-gray-600 pt-1">
              <span className="flex items-center gap-1 font-semibold text-gray-700">
                <Globe className="w-3.5 h-3.5 text-[#7F3D59]" />
                <span>
                  {profile.city ? `${profile.city}, ` : ""}
                  {countryObj ? `[${countryObj.code}] ${countryObj.name}` : profile.country || "Pan-Africa"}
                </span>
              </span>

              {profile.organization && (
                <span className="font-semibold text-gray-700">
                  Venture: <strong>{profile.organization}</strong>
                </span>
              )}

              {profile.sector && (
                <span className="px-2 py-0.5 bg-gray-100 rounded-md font-medium text-gray-600">
                  {profile.sector}
                </span>
              )}

              {profile.businessStage && (
                <span className="px-2 py-0.5 bg-[#FDF8F9] border border-[#EAD7E0] text-[#7F3D59] rounded-md font-semibold text-[11px]">
                  {profile.businessStage}
                </span>
              )}
            </div>

            {/* Social & Venture Links */}
            {(profile.website || profile.linkedinUrl || profile.twitterUrl) && (
              <div className="flex flex-wrap items-center gap-3 pt-3">
                {profile.website && (
                  <a
                    href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[#7F3D59] hover:underline flex items-center gap-1 font-bold"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Company Website</span>
                  </a>
                )}
                {profile.linkedinUrl && (
                  <a
                    href={profile.linkedinUrl.startsWith("http") ? profile.linkedinUrl : `https://${profile.linkedinUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[#0A66C2] hover:underline flex items-center gap-1 font-bold"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>LinkedIn Profile</span>
                  </a>
                )}
                {profile.twitterUrl && (
                  <a
                    href={profile.twitterUrl.startsWith("http") ? profile.twitterUrl : `https://${profile.twitterUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-gray-700 hover:underline flex items-center gap-1 font-bold"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Twitter / X</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. LINKEDIN-STYLE PROFILE STRENGTH METER GAUGE */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAD7E0] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#7F3D59]/10 rounded-xl text-[#7F3D59]">
              <Sparkles className="w-4 h-4 text-[#7F3D59]" />
            </span>
            <div>
              <h2 className="text-base font-serif font-bold text-gray-900">
                Founder Profile Strength:{" "}
                <span className="text-[#7F3D59]">{profileStrength.level}</span> ({profileStrength.score}%)
              </h2>
              <p className="text-xs text-gray-500">
                A complete profile boosts your visibility on the Pan-African Founders Directory and investor matchmaking pipelines.
              </p>
            </div>
          </div>
          <span className="text-sm font-bold text-[#7F3D59] font-mono">{profileStrength.score}%</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 rounded-full transition-all duration-700 ${
              profileStrength.score >= 90
                ? "bg-emerald-600"
                : profileStrength.score >= 60
                ? "bg-[#D4AF37]"
                : "bg-[#7F3D59]"
            }`}
            style={{ width: `${profileStrength.score}%` }}
          ></div>
        </div>

        {profileStrength.score < 100 && (
          <div className="flex items-center justify-between text-xs bg-[#FDF8F9] p-3 rounded-xl border border-[#EAD7E0]">
            <span className="text-gray-700 font-medium">
              Next recommendation: <strong>{profileStrength.nextSuggestion}</strong>
            </span>
            <button
              onClick={() => setIsEditing(true)}
              className="text-[#7F3D59] hover:underline font-bold"
            >
              Update Now →
            </button>
          </div>
        )}
      </div>

      {/* 3. ABOUT / FOUNDER STORY */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAD7E0] shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-lg font-serif font-bold text-[#1D0B14]">About the Founder</h2>
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-[#7F3D59] hover:underline font-bold flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" />
            <span>Edit About</span>
          </button>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line font-light">
          {profile.bio ||
            "No executive bio provided yet. Add your founder journey, market vision, traction milestones, and investment ambitions to establish credibility with institutional partners."}
        </p>
      </div>

      {/* 4. ENTERPRISE & EXPERIENCE CARD */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAD7E0] shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-lg font-serif font-bold text-[#1D0B14]">Enterprise &amp; Venture Experience</h2>
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-[#7F3D59] hover:underline font-bold flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" />
            <span>Edit Venture</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-[#FDF8F9] border border-[#EAD7E0] space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Commercial Venture</p>
            <h3 className="text-base font-serif font-bold text-gray-900">{profile.organization || "Venture Name Not Specified"}</h3>
            <p className="text-xs text-gray-600 font-medium">Executive Role: <strong>{profile.profession || "Founder & CEO"}</strong></p>
            <p className="text-xs text-gray-600">Operating Stage: <span className="font-semibold text-[#7F3D59]">{profile.businessStage || "Growth Stage"}</span></p>
            <p className="text-xs text-gray-600">Years in Operation: <span className="font-semibold">{profile.yearsInBusiness || "3-5 years"}</span></p>
          </div>

          <div className="p-5 rounded-2xl bg-[#FDF8F9] border border-[#EAD7E0] space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Industry &amp; AWIEF Track</p>
            <h3 className="text-base font-serif font-bold text-gray-900">{profile.sector || "Agribusiness & CleanTech"}</h3>
            <p className="text-xs text-gray-600">AWIEF Programme: <strong>{profile.awiefProgram || "Growth Accelerator"}</strong></p>
            <p className="text-xs text-gray-600">Alumni Affiliation: <span className="font-semibold text-emerald-700">{profile.isAwiefAlumni ? "Verified Alumna" : "Active Cohort"}</span></p>
            <p className="text-xs text-gray-600">
              Pan-African Leaderboard: <span className="font-semibold">{profile.showOnLeaderboard ? "Public Visible" : "Hidden"}</span>
            </p>
          </div>
        </div>
      </div>

      {/* 5. CORE COMPETENCIES & SKILLS (LINKEDIN SKILLS BLOCK) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAD7E0] shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-lg font-serif font-bold text-[#1D0B14]">Competencies &amp; Executive Skills</h2>
            <p className="text-xs text-gray-500">Core operational and financial capabilities verified across AWIEF masterclasses.</p>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-[#7F3D59] hover:underline font-bold flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" />
            <span>Manage Skills</span>
          </button>
        </div>

        {skillsList.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-2">
            {skillsList.map((skill: string, idx: number) => (
              <span
                key={idx}
                className="px-3.5 py-1.5 bg-[#FDF8F9] hover:bg-[#F7EEF2] border border-[#EAD7E0] rounded-xl text-xs font-semibold text-gray-800 transition-colors inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#7F3D59]" />
                <span>{skill}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 py-3 italic">
            No competencies listed yet. Click 'Manage Skills' to add skills like Financial Modeling, AfCFTA Rules of Origin, Seed Fundraising, etc.
          </p>
        )}
      </div>

      {/* 6. ACADEMIC BACKGROUND & EDUCATION */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAD7E0] shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-lg font-serif font-bold text-[#1D0B14]">Education &amp; Fellowships</h2>
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-[#7F3D59] hover:underline font-bold flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" />
            <span>Edit Education</span>
          </button>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed font-light">
          {profile.education || "No degrees or academic institutions recorded. Click Edit to document your academic and executive training background."}
        </p>
      </div>

      {/* 7. VERIFIED AWIEF CREDENTIALS & CERTIFICATES (LINKEDIN LICENSES & CERTIFICATIONS) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAD7E0] shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-lg font-serif font-bold text-[#1D0B14]">Licenses &amp; Verifiable Digital Credentials</h2>
            <p className="text-xs text-gray-500">Official certificates co-signed by AWIEF Leadership with public QR code validation.</p>
          </div>
          <span className="px-3 py-1 bg-[#D4AF37]/20 text-[#1D0B14] rounded-full text-xs font-bold font-serif">
            {profile.certificates?.length || 0} Earned
          </span>
        </div>

        {profile.certificates && profile.certificates.length > 0 ? (
          <div className="space-y-4">
            {profile.certificates.map((cert: any) => (
              <div
                key={cert.id}
                className="p-5 rounded-2xl border border-[#EAD7E0] bg-[#FDF8F9]/60 hover:border-[#7F3D59]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#7F3D59] text-white uppercase tracking-wider">
                      Verified Credential
                    </span>
                    <span className="text-[11px] text-gray-500 font-mono">
                      ID: {cert.certificateNumber}
                    </span>
                  </div>
                  <h3 className="text-base font-serif font-bold text-gray-900">{cert.courseTitle}</h3>
                  <p className="text-xs text-gray-500">
                    Issued to <strong>{cert.recipientName}</strong> on {new Date(cert.issuedAt).toLocaleDateString()} by AWIEF NPC
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/certificate/${cert.courseId}`}
                    className="px-4 py-2 bg-[#7F3D59] hover:bg-[#5E2C41] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>View Certificate</span>
                  </Link>
                  <Link
                    href={`/verify/${cert.certificateNumber}`}
                    className="px-3 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-bold rounded-xl transition-colors"
                  >
                    Verify Portal
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-[#FDF8F9] rounded-2xl border border-dashed border-[#EAD7E0] p-6 space-y-2">
            <p className="text-xs font-semibold text-gray-600">No certificates earned yet.</p>
            <p className="text-xs text-gray-500">Complete an enrolled masterclass to 100% and submit the evaluation survey to earn your verifiable credential.</p>
            <Link
              href="/catalog"
              className="inline-block mt-2 px-4 py-2 bg-[#7F3D59] text-white text-xs font-bold rounded-xl shadow-xs"
            >
              Explore Masterclasses
            </Link>
          </div>
        )}
      </div>

      {/* 8. EDIT PROFILE MODAL */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-gray-200 my-8 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-xl font-serif font-bold text-[#1D0B14]">Edit Founder Profile</h3>
                  <p className="text-xs text-gray-500">Update your executive identity, venture details, and competencies.</p>
                </div>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-800 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-5 text-xs">
                {/* Full Name & Headline */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#FDF8F9] border border-gray-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Professional Headline</label>
                    <input
                      type="text"
                      value={formData.headline}
                      onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                      placeholder="e.g. Founder & CEO at EcoAgri Foods | Techstars '25"
                      className="w-full px-3.5 py-2.5 bg-[#FDF8F9] border border-gray-300 rounded-xl"
                    />
                  </div>
                </div>

                {/* Country & City */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Country</label>
                    <select
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#FDF8F9] border border-gray-300 rounded-xl"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          [{c.code}] {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">City / Regional Hub</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="e.g. Nairobi, Lagos, Cape Town, Accra"
                      className="w-full px-3.5 py-2.5 bg-[#FDF8F9] border border-gray-300 rounded-xl"
                    />
                  </div>
                </div>

                {/* Enterprise Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Company / Enterprise Name</label>
                    <input
                      type="text"
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                      placeholder="e.g. EcoLink Solar Grid Systems"
                      className="w-full px-3.5 py-2.5 bg-[#FDF8F9] border border-gray-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Founder Role / Title</label>
                    <input
                      type="text"
                      value={formData.profession}
                      onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                      placeholder="e.g. Co-Founder & Managing Director"
                      className="w-full px-3.5 py-2.5 bg-[#FDF8F9] border border-gray-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Business Stage</label>
                    <select
                      value={formData.businessStage}
                      onChange={(e) => setFormData({ ...formData, businessStage: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#FDF8F9] border border-gray-300 rounded-xl"
                    >
                      <option value="Idea / Pre-Revenue">Idea / Pre-Revenue</option>
                      <option value="Early Stage">Early Stage</option>
                      <option value="Growth Stage">Growth Stage</option>
                      <option value="Scaling / Export Ready">Scaling / Export Ready</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Industry Sector</label>
                    <input
                      type="text"
                      value={formData.sector}
                      onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                      placeholder="e.g. Agribusiness, Green Energy"
                      className="w-full px-3.5 py-2.5 bg-[#FDF8F9] border border-gray-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Years in Business</label>
                    <select
                      value={formData.yearsInBusiness}
                      onChange={(e) => setFormData({ ...formData, yearsInBusiness: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#FDF8F9] border border-gray-300 rounded-xl"
                    >
                      <option value="<1 year">&lt;1 year</option>
                      <option value="1-3 years">1-3 years</option>
                      <option value="3-5 years">3-5 years</option>
                      <option value=">5 years">&gt;5 years</option>
                    </select>
                  </div>
                </div>

                {/* About / Bio */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Founder Story / Executive Bio</label>
                  <textarea
                    rows={4}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Summarize your venture journey, commercial traction, and scaling objectives..."
                    className="w-full px-3.5 py-2.5 bg-[#FDF8F9] border border-gray-300 rounded-xl"
                  ></textarea>
                </div>

                {/* Competencies & Skills */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Core Competencies &amp; Skills (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.skills}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                    placeholder="e.g. Financial Modeling, AfCFTA Rules of Origin, Venture Pitching, Due Diligence"
                    className="w-full px-3.5 py-2.5 bg-[#FDF8F9] border border-gray-300 rounded-xl"
                  />
                </div>

                {/* Education */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Academic &amp; Executive Education</label>
                  <input
                    type="text"
                    value={formData.education}
                    onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                    placeholder="e.g. BSc Agricultural Economics - University of Ibadan | Stanford Seed"
                    className="w-full px-3.5 py-2.5 bg-[#FDF8F9] border border-gray-300 rounded-xl"
                  />
                </div>

                {/* Social & Venture Links */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Venture Website</label>
                    <input
                      type="text"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3.5 py-2.5 bg-[#FDF8F9] border border-gray-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">LinkedIn URL</label>
                    <input
                      type="text"
                      value={formData.linkedinUrl}
                      onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                      placeholder="https://linkedin.com/in/..."
                      className="w-full px-3.5 py-2.5 bg-[#FDF8F9] border border-gray-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Twitter / X</label>
                    <input
                      type="text"
                      value={formData.twitterUrl}
                      onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })}
                      placeholder="https://x.com/..."
                      className="w-full px-3.5 py-2.5 bg-[#FDF8F9] border border-gray-300 rounded-xl"
                    />
                  </div>
                </div>

                {/* Leaderboard visibility */}
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="editLeaderboard"
                    checked={formData.showOnLeaderboard}
                    onChange={(e) => setFormData({ ...formData, showOnLeaderboard: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-[#7F3D59] focus:ring-[#7F3D59]"
                  />
                  <label htmlFor="editLeaderboard" className="font-semibold text-gray-700 cursor-pointer">
                    Display my venture on the Pan-African Founders Leaderboard &amp; Directory
                  </label>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="px-6 py-2.5 rounded-xl bg-[#7F3D59] hover:bg-[#5E2C41] text-white font-bold transition-all shadow-sm disabled:opacity-50"
                  >
                    {saveLoading ? "Saving..." : "Save Profile Details"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. SECURITY / CHANGE PASSWORD MODAL */}
      <AnimatePresence>
        {isChangingPassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-gray-200 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-gray-500" />
                  <h3 className="text-lg font-serif font-bold text-gray-900">Security Credentials</h3>
                </div>
                <button
                  onClick={() => setIsChangingPassword(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-800 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {passwordMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    passwordMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {passwordMsg.text}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Current Password *</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FDF8F9] border border-gray-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">New Password *</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FDF8F9] border border-gray-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Confirm New Password *</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FDF8F9] border border-gray-300 rounded-xl"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsChangingPassword(false)}
                    className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="px-5 py-2 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl font-bold transition-all disabled:opacity-50"
                  >
                    {passwordLoading ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 10. POPIA / GDPR PERSONAL DATA RIGHTS & ENCRYPTION CONTROLS */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAD7E0] shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>AES-256-GCM Encrypted PII · POPIA / NDPA / GDPR Controls</span>
            </div>
            <h2 className="text-lg font-serif font-bold text-[#1D0B14]">
              Privacy &amp; Personal Data Rights
            </h2>
            <p className="text-xs text-gray-500">
              Download an encrypted-decrypted JSON archive of your account records or exercise your right to erasure.
            </p>
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                const exported = await exportMyPersonalData();
                const blob = new Blob([JSON.stringify(exported, null, 2)], {
                  type: "application/json;charset=utf-8",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `awief-personal-data-${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              } catch (err: unknown) {
                alert(err instanceof Error ? err.message : "Failed to export data.");
              }
            }}
            className="px-4 py-2.5 bg-[#FDF8F9] hover:bg-white text-[#7F3D59] border border-[#EAD7E0] rounded-xl text-xs font-bold transition-colors shrink-0 self-start sm:self-auto"
          >
            Download My Personal Data (JSON)
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-red-50/50 border border-red-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-red-900">Delete Account (Right to Erasure)</h3>
            <p className="text-xs text-red-700/80">
              Permanently deletes your profile, enrollments, quiz records, and reviews. Certificates are permanently revoked.
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              const typed = prompt(
                `Type your email address (${profile.email}) to permanently erase your account:`
              );
              if (!typed) return;
              const res = await deleteMyAccount(typed);
              if (!res.success) {
                alert(res.error || "Could not erase account.");
                return;
              }
              await signOut({ callbackUrl: "/" });
            }}
            className="px-4 py-2 bg-white hover:bg-red-600 text-red-700 hover:text-white border border-red-300 rounded-xl text-xs font-bold transition-colors shrink-0 self-start sm:self-auto"
          >
            Delete My Account
          </button>
        </div>
      </div>
    </div>
  );
}
