"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { COUNTRIES } from "@/lib/countries";
import { registerUser } from "./actions";

/**
 * Registration form component capturing founder and enterprise demographics.
 *
 * @returns {JSX.Element} The rendered registration form.
 */
function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseIdParam = searchParams.get("courseId") || "investment-readiness";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    country: "ZA",
    organization: "",
    profession: "Founder / Chief Executive Officer",
    businessStage: "Growth / Scale-up Stage",
    sector: "Agribusiness & Agritech",
    awiefProgram: "AWIEF Growth Accelerator",
    yearsInBusiness: "1-3 years",
    isAwiefAlumni: false,
    goals: "",
    consent: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const executiveRoles = [
    "Founder / Chief Executive Officer",
    "Co-Founder & COO",
    "Managing Director",
    "Chief Financial Officer / Head of Finance",
    "Head of Operations / Growth",
    "Sole Proprietor / Principal Consultant",
    "Enterprise Development Manager"
  ];

  const businessStages = [
    "Ideation / Pre-Revenue",
    "MVP / Early Seed Stage",
    "Growth / Scale-up Stage",
    "Mature / Cross-Border Exporter"
  ];

  const industrySectors = [
    "Agribusiness & Food Processing",
    "Fintech & Financial Inclusion",
    "Clean Energy, Waste & Climate Tech",
    "Healthtech, Care & Wellness",
    "Manufacturing, Textiles & FMCG",
    "Creative Industries, Media & EdTech",
    "E-Commerce & Digital Logistics",
    "Other Sector"
  ];

  const awiefPrograms = [
    "AWIEF Growth Accelerator",
    "AfCFTA Cross-Border Trade Cohort",
    "Pitch 'n Grow Competition",
    "AWIEF Award Winner / Nominee",
    "Independent Pan-African Founder"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formData.consent) {
      setErrorMsg("Please agree to the POPIA / NDPA / GDPR data processing policy.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg("Passwords do not match. Please verify.");
      return;
    }

    if (formData.password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await registerUser({
        ...formData,
        courseId: courseIdParam
      });

      if (!res.success) {
        setErrorMsg(res.error || "Registration failed.");
        setIsLoading(false);
        return;
      }

      // Auto login after registration
      const loginRes = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password
      });

      if (loginRes?.error) {
        router.push("/login");
      } else {
        router.push("/dashboard/courses");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl">
          {errorMsg}
        </div>
      )}

      {/* Account Basics */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#7F3D59] border-b border-gray-100 pb-1">
          1. Founder &amp; Account Credentials
        </h3>

        <div>
          <label className="block text-xs font-bold text-gray-700">
            Full Legal Name (For Verifiable Certificates) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Amara Okafor"
            className="mt-1 block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7F3D59]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700">
            Business Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="amara@ecoagri.ng"
            className="mt-1 block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7F3D59]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700">
              Password (Min 8 characters) <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="mt-1 block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7F3D59]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="mt-1 block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7F3D59]"
            />
          </div>
        </div>
      </div>

      {/* Enterprise & Location */}
      <div className="space-y-4 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#7F3D59] border-b border-gray-100 pb-1">
          2. Enterprise &amp; Location Profile
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700">
              Company / Venture Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              placeholder="e.g. EcoAgri Foods Limited"
              className="mt-1 block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7F3D59]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700">
              Country of Primary Operation <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="mt-1 block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7F3D59] bg-white"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700">Executive Role</label>
            <select
              value={formData.profession}
              onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
              className="mt-1 block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7F3D59] bg-white"
            >
              {executiveRoles.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700">Industry Sector</label>
            <select
              value={formData.sector}
              onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
              className="mt-1 block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7F3D59] bg-white"
            >
              {industrySectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700">Current Business Stage</label>
            <select
              value={formData.businessStage}
              onChange={(e) => setFormData({ ...formData, businessStage: e.target.value })}
              className="mt-1 block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7F3D59] bg-white"
            >
              {businessStages.map((stage) => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700">AWIEF Programme Affiliation</label>
            <select
              value={formData.awiefProgram}
              onChange={(e) => setFormData({ ...formData, awiefProgram: e.target.value })}
              className="mt-1 block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7F3D59] bg-white"
            >
              {awiefPrograms.map((prog) => (
                <option key={prog} value={prog}>{prog}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700">Growth Objectives &amp; Capital Goals</label>
          <textarea
            rows={2}
            value={formData.goals}
            onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
            placeholder="e.g. Preparing to raise $250k seed round and expand distribution under AfCFTA..."
            className="mt-1 block w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7F3D59]"
          />
        </div>
      </div>

      {/* Compliance consent */}
      <div className="pt-2">
        <label className="flex items-start gap-2.5 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            required
            checked={formData.consent}
            onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
            className="mt-0.5 rounded border-gray-300 text-[#7F3D59] focus:ring-[#7F3D59]"
          />
          <span>
            I consent to the processing of my business details in compliance with POPIA, NDPA, Kenya DPA, and GDPR for AWIEF cohort learning and credential verification.
          </span>
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-4 bg-[#7F3D59] hover:bg-[#5E2C41] text-white font-bold rounded-2xl shadow-xl transition-all disabled:opacity-50 text-sm font-serif"
      >
        {isLoading ? "Creating Academy Account..." : "Complete Registration & Enter Academy →"}
      </button>

      <div className="text-center pt-2">
        <p className="text-xs text-gray-500">
          Already registered?{" "}
          <Link href="/login" className="font-bold text-[#7F3D59] hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </form>
  );
}

/**
 * Public registration page wrapper with Suspense boundary.
 *
 * @returns {JSX.Element} The rendered registration page.
 */
export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#FDF8F9] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-[#7F3D59] selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg relative z-10 text-center mb-6">
        <div className="flex justify-start mb-4 px-4 sm:px-0">
          <Link 
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-[#7F3D59] transition-all bg-white px-3.5 py-1.5 rounded-full border border-gray-200 shadow-sm hover:shadow"
          >
            <span>← Back to Home</span>
          </Link>
        </div>

        <Link href="/" className="inline-block">
          <img
            className="mx-auto h-16 w-auto object-contain bg-white p-1 rounded-xl shadow-xs"
            src="/images/awief-logo.jpg"
            alt="AWIEF"
          />
        </Link>
        <h2 className="mt-4 text-center text-3xl font-serif font-extrabold text-[#1D0B14] tracking-tight">
          Join the AWIEF Digital Academy
        </h2>
        <p className="mt-1 text-center text-xs text-[#7F3D59] font-bold uppercase tracking-wider">
          Enterprise Capacity &amp; Pan-African Trade Network
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl border border-[#EAD7E0] sm:rounded-3xl sm:px-10">
          <Suspense fallback={<div className="p-8 text-center text-xs text-gray-400">Loading form...</div>}>
            <RegisterForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
