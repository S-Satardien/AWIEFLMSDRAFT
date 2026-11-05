"use client";

import { useState, useMemo, useEffect } from "react";
import { resolveComment, getAdvancedQuizAnalytics, exportAllPlatformData } from "./actions";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CircleDollarSign,
  BookOpen,
  GraduationCap,
  Users,
  MessageSquareCheck,
  Download,
  Award,
  TrendingUp,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  FileText,
  BarChart3,
  Calendar,
  Layers,
  Search
} from "lucide-react";
import UserManagementTab from "./UserManagementTab";
import QuizManagementTab from "./QuizManagementTab";
import RoyaltiesTab from "./RoyaltiesTab";
import CourseManagementTab from "./CourseManagementTab";

interface AdminClientProps {
  initialData: any;
}

type MainSection = "ROYALTIES" | "COURSES" | "LEARNERS" | "USERS" | "REVIEWS";
type CourseSubTab = "BUILDER" | "QUIZZES";
type LearnerSubTab = "COHORT" | "SURVEYS" | "CERTIFICATES" | "DIAGNOSTICS";

/**
 * Executive Control Center for the AWIEF Digital Learning Academy.
 * Features hierarchical top navigation with sub-tabs for:
 * 1. Royalties & Financial Statement Engine
 * 2. Courses & Curriculum (with integrated Course Quizzes & Assessments)
 * 3. Learner Cohorts & Analytics (Cohort progress, Surveys, Certificates, Item Diagnostics)
 * 4. User Accounts & Role Permissions
 * 5. Editorial Reviews & Annotations
 *
 * @param {AdminClientProps} props - Initial server-fetched datasets.
 * @returns {JSX.Element} The rendered administrative interface.
 */
export default function AdminClient({ initialData }: AdminClientProps) {
  const {
    students = [],
    reviewComments = [],
    surveyResponses = [],
    certificates = [],
    quizNames = {},
    courses = [],
    transactions = [],
    role = "STUDENT"
  } = initialData;

  const [comments, setComments] = useState(reviewComments);
  const [advancedAnalytics, setAdvancedAnalytics] = useState<any>(null);
  const [isExportingData, setIsExportingData] = useState(false);

  // Hierarchical Navigation State
  const [activeSection, setActiveSection] = useState<MainSection>(
    role === "ADMIN" ? "ROYALTIES" : "REVIEWS"
  );
  const [courseSubTab, setCourseSubTab] = useState<CourseSubTab>("BUILDER");
  const [learnerSubTab, setLearnerSubTab] = useState<LearnerSubTab>("COHORT");
  const [courseQuizFilter, setCourseQuizFilter] = useState<string | null>(null);

  // Search filter for learners table
  const [learnerSearch, setLearnerSearch] = useState("");

  useEffect(() => {
    if (role === "ADMIN") {
      getAdvancedQuizAnalytics().then((res) => setAdvancedAnalytics(res));
    }
  }, [role]);

  const handleResolve = async (id: string) => {
    await resolveComment(id);
    setComments(comments.map((c: any) => (c.id === id ? { ...c, status: "RESOLVED" } : c)));
  };

  // Switch to Quizzes sub-tab with a specific course pre-selected
  const handleOpenCourseQuizzes = (courseId: string) => {
    setActiveSection("COURSES");
    setCourseSubTab("QUIZZES");
    setCourseQuizFilter(courseId);
  };

  // Full platform data export (Zero vendor lock-in demonstration)
  const handleExportFullPlatformData = async () => {
    setIsExportingData(true);
    try {
      const data = await exportAllPlatformData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `awief-lms-full-platform-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("Failed to export platform data: " + e.message);
    } finally {
      setIsExportingData(false);
    }
  };

  const exportStudentsCSV = () => {
    let csv =
      "Founder Name,Email,Country,Enterprise / Venture,Executive Role,Business Stage,Industry Sector,AWIEF Program,Years in Business,Last Active,Masterclasses Enrolled,Progress (%)\n";
    students.forEach((s: any) => {
      const lastActive = s.lastActiveDate
        ? new Date(s.lastActiveDate).toISOString().split("T")[0]
        : "Never";
      csv += `"${s.name || ""}","${s.email}","${s.country || ""}","${s.organization || ""}","${
        s.profession || ""
      }","${s.businessStage || ""}","${s.sector || ""}","${s.awiefProgram || ""}","${
        s.yearsInBusiness || ""
      }","${lastActive}",${s.enrolledCount || 1},${s.scormProgress || 0}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `awief-founders-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    if (!learnerSearch.trim()) return students;
    const q = learnerSearch.toLowerCase();
    return students.filter(
      (s: any) =>
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.organization?.toLowerCase().includes(q) ||
        s.country?.toLowerCase().includes(q) ||
        s.sector?.toLowerCase().includes(q)
    );
  }, [students, learnerSearch]);

  // Analytics Calculations
  const stats = useMemo(() => {
    if (!students || students.length === 0)
      return { total: 0, avgProgress: 0, fullyCertified: 0 };
    const total = students.length;
    const totalProgress = students.reduce(
      (acc: number, s: any) => acc + (s.scormProgress || 0),
      0
    );
    const avgProgress = Math.round(totalProgress / total);
    const fullyCertified = students.filter((s: any) => s.scormProgress >= 100).length;

    return { total, avgProgress, fullyCertified };
  }, [students]);

  // Survey Stats
  const surveyStats = useMemo(() => {
    if (surveyResponses.length === 0)
      return { count: 0, avgPlatform: 0, avgMaterials: 0, avgBefore: 0, avgAfter: 0 };
    const count = surveyResponses.length;
    const avgPlatform = (
      surveyResponses.reduce((a: number, r: any) => a + r.q1_platformNav, 0) / count
    ).toFixed(1);
    const avgMaterials = (
      surveyResponses.reduce((a: number, r: any) => a + r.q2_materialsClear, 0) / count
    ).toFixed(1);
    const avgBefore = (
      surveyResponses.reduce((a: number, r: any) => a + r.q5_understandingBefore, 0) / count
    ).toFixed(1);
    const avgAfter = (
      surveyResponses.reduce((a: number, r: any) => a + r.q6_understandingAfter, 0) / count
    ).toFixed(1);
    return { count, avgPlatform, avgMaterials, avgBefore, avgAfter };
  }, [surveyResponses]);

  // Total royalties calculated
  const totalRoyaltiesOwed = useMemo(() => {
    return transactions.reduce((sum: number, t: any) => sum + (t.authorRoyaltyZar || 0), 0);
  }, [transactions]);

  const courseComments = comments.filter(
    (c: any) =>
      c.type === "SCORM" || !c.type || c.type === "EDITORIAL" || c.type === "HIGHLIGHT"
  );
  const openCommentsCount = courseComments.filter((c: any) => c.status === "OPEN").length;

  return (
    <div className="space-y-6 selection:bg-[#7F3D59] selection:text-white">
      {/* Top Header Strip with UN ECOSOC Seal & Platform Export Actions */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#EAD7E0] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#7F3D59]/10 text-[#7F3D59] border border-[#7F3D59]/20 inline-flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>UN ECOSOC Consultative Status</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-[#1D0B14]">
            AWIEF Executive Administration &amp; Royalties Hub
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Track author royalties, manage commercial masterclasses and embedded quizzes, monitor pan-African cohorts, and export audited statements.
          </p>
        </div>

        {/* Global Action Export Strip (Zero Vendor Lock-in) */}
        {role === "ADMIN" && (
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
            <button
              type="button"
              onClick={handleExportFullPlatformData}
              disabled={isExportingData}
              className="px-4 py-2 bg-[#D4AF37] hover:bg-[#B89628] text-[#1D0B14] rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 font-serif"
              title="Exports complete database (courses, users, transactions, certificates, surveys) in JSON"
            >
              <Download className="w-3.5 h-3.5 text-[#1D0B14]" />
              <span>{isExportingData ? "Exporting..." : "Export Platform Data (JSON)"}</span>
            </button>
            <button
              type="button"
              onClick={exportStudentsCSV}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-gray-600" />
              <span>Export Founders CSV</span>
            </button>
          </div>
        )}
      </div>

      {/* Primary Section Tabs Navigation Bar */}
      <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-[#EAD7E0] flex overflow-x-auto gap-1.5">
        {role === "ADMIN" && (
          <>
            {/* 1. ROYALTIES */}
            <button
              type="button"
              onClick={() => setActiveSection("ROYALTIES")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeSection === "ROYALTIES"
                  ? "bg-[#7F3D59] text-white shadow-sm"
                  : "text-gray-700 hover:bg-[#FDF8F9] hover:text-[#7F3D59]"
              }`}
            >
              <CircleDollarSign className="w-4 h-4" />
              <span>Author Royalties &amp; Statements</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  activeSection === "ROYALTIES"
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-[#7F3D59]"
                }`}
              >
                R{totalRoyaltiesOwed.toLocaleString()}
              </span>
            </button>

            {/* 2. COURSES (With Embedded Quizzes) */}
            <button
              type="button"
              onClick={() => setActiveSection("COURSES")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeSection === "COURSES"
                  ? "bg-[#7F3D59] text-white shadow-sm"
                  : "text-gray-700 hover:bg-[#FDF8F9] hover:text-[#7F3D59]"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Courses &amp; Quizzes</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeSection === "COURSES"
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {courses.length}
              </span>
            </button>

            {/* 3. LEARNERS & ANALYTICS */}
            <button
              type="button"
              onClick={() => setActiveSection("LEARNERS")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeSection === "LEARNERS"
                  ? "bg-[#7F3D59] text-white shadow-sm"
                  : "text-gray-700 hover:bg-[#FDF8F9] hover:text-[#7F3D59]"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Learners &amp; Analytics</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeSection === "LEARNERS"
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {students.length}
              </span>
            </button>

            {/* 4. USER MANAGEMENT */}
            <button
              type="button"
              onClick={() => setActiveSection("USERS")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeSection === "USERS"
                  ? "bg-[#7F3D59] text-white shadow-sm"
                  : "text-gray-700 hover:bg-[#FDF8F9] hover:text-[#7F3D59]"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>User Management</span>
            </button>
          </>
        )}

        {/* 5. QUALITY & REVIEWS */}
        <button
          type="button"
          onClick={() => setActiveSection("REVIEWS")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSection === "REVIEWS"
              ? "bg-[#7F3D59] text-white shadow-sm"
              : "text-gray-700 hover:bg-[#FDF8F9] hover:text-[#7F3D59]"
          }`}
        >
          <MessageSquareCheck className="w-4 h-4" />
          <span>Reviewer Annotations</span>
          {openCommentsCount > 0 && (
            <span className="bg-[#D4AF37] text-[#1D0B14] text-[10px] font-bold px-2 py-0.5 rounded-full">
              {openCommentsCount}
            </span>
          )}
        </button>
      </div>

      {/* SECONDARY SUB-TABS NAVIGATION (When Active Section has multiple views) */}
      {activeSection === "COURSES" && role === "ADMIN" && (
        <div className="bg-[#FDF8F9] p-1.5 rounded-xl border border-[#EAD7E0] flex items-center gap-2 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3">
            Course Module View:
          </span>
          <button
            type="button"
            onClick={() => setCourseSubTab("BUILDER")}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              courseSubTab === "BUILDER"
                ? "bg-[#7F3D59] text-white shadow-xs"
                : "text-gray-600 hover:bg-white hover:text-gray-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Masterclass Builder ({courses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setCourseSubTab("QUIZZES")}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              courseSubTab === "QUIZZES"
                ? "bg-[#7F3D59] text-white shadow-xs"
                : "text-gray-600 hover:bg-white hover:text-gray-900"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Course Quizzes &amp; Assessments</span>
          </button>
        </div>
      )}

      {activeSection === "LEARNERS" && role === "ADMIN" && (
        <div className="bg-[#FDF8F9] p-1.5 rounded-xl border border-[#EAD7E0] flex items-center gap-2 text-xs overflow-x-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 whitespace-nowrap">
            Analytics Sub-Views:
          </span>
          <button
            type="button"
            onClick={() => setLearnerSubTab("COHORT")}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              learnerSubTab === "COHORT"
                ? "bg-[#7F3D59] text-white shadow-xs"
                : "text-gray-600 hover:bg-white hover:text-gray-900"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Cohort Progress ({students.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setLearnerSubTab("SURVEYS")}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              learnerSubTab === "SURVEYS"
                ? "bg-[#7F3D59] text-white shadow-xs"
                : "text-gray-600 hover:bg-white hover:text-gray-900"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Course Surveys ({surveyResponses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setLearnerSubTab("CERTIFICATES")}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              learnerSubTab === "CERTIFICATES"
                ? "bg-[#7F3D59] text-white shadow-xs"
                : "text-gray-600 hover:bg-white hover:text-gray-900"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Certificates Issued ({certificates.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setLearnerSubTab("DIAGNOSTICS")}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              learnerSubTab === "DIAGNOSTICS"
                ? "bg-[#7F3D59] text-white shadow-xs"
                : "text-gray-600 hover:bg-white hover:text-gray-900"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Quiz Item Diagnostics</span>
          </button>
        </div>
      )}

      {/* SECTION CONTENT PANELS */}
      <AnimatePresence mode="wait">
        {/* 1. ROYALTIES TAB */}
        {activeSection === "ROYALTIES" && role === "ADMIN" && (
          <motion.div
            key="ROYALTIES"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <RoyaltiesTab transactions={transactions} courses={courses} />
          </motion.div>
        )}

        {/* 2. COURSES TAB */}
        {activeSection === "COURSES" && role === "ADMIN" && (
          <motion.div
            key="COURSES"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {courseSubTab === "BUILDER" ? (
              <CourseManagementTab
                courses={courses}
                onRefresh={() => window.location.reload()}
                onManageCourseQuizzes={handleOpenCourseQuizzes}
              />
            ) : (
              <QuizManagementTab
                courses={courses}
                initialCourseId={courseQuizFilter}
              />
            )}
          </motion.div>
        )}

        {/* 3. LEARNERS & ANALYTICS TAB */}
        {activeSection === "LEARNERS" && role === "ADMIN" && (
          <motion.div
            key="LEARNERS"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* SUB-VIEW A: COHORT PROGRESS */}
            {learnerSubTab === "COHORT" && (
              <div className="space-y-6">
                {/* Analytics Dashboard KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-2xl shadow-sm border border-[#EAD7E0] p-6 flex items-center">
                    <div className="p-3 bg-[#7F3D59]/10 text-[#7F3D59] rounded-xl">
                      <Users className="w-6 h-6 text-[#7F3D59]" />
                    </div>
                    <div className="ml-4">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Total Founders Enrolled
                      </p>
                      <p className="text-2xl font-serif font-extrabold text-gray-900">
                        {stats.total} Entrepreneurs
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-[#EAD7E0] p-6 flex items-center">
                    <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
                      <TrendingUp className="w-6 h-6 text-amber-700" />
                    </div>
                    <div className="ml-4">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Average Masterclass Progress
                      </p>
                      <p className="text-2xl font-serif font-extrabold text-gray-900">
                        {stats.avgProgress}%
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-[#EAD7E0] p-6 flex items-center">
                    <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
                      <Award className="w-6 h-6 text-emerald-700" />
                    </div>
                    <div className="ml-4">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Completed / Verified
                      </p>
                      <p className="text-2xl font-serif font-extrabold text-emerald-700">
                        {stats.fullyCertified} Founders
                      </p>
                    </div>
                  </div>
                </div>

                {/* Main Table */}
                <div className="bg-white shadow-sm rounded-2xl border border-[#EAD7E0] overflow-hidden">
                  <div className="px-6 py-5 border-b border-[#EAD7E0] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#FDF8F9]">
                    <div>
                      <h3 className="text-base font-serif font-bold text-gray-900">
                        Master Pan-African Founders Cohort ({filteredStudents.length} Learners)
                      </h3>
                      <p className="text-xs text-gray-500">
                        Demographic data captured under POPIA/GDPR consent for impact reporting.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          value={learnerSearch}
                          onChange={(e) => setLearnerSearch(e.target.value)}
                          placeholder="Search founder, country..."
                          className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#7F3D59] focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={exportStudentsCSV}
                        className="px-4 py-2 bg-[#7F3D59] text-white text-xs font-bold rounded-xl hover:bg-[#5E2C41] transition-colors shadow-sm flex items-center gap-1.5 shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>CSV</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                      <thead className="bg-[#FDF8F9] text-[11px] font-bold uppercase tracking-wider text-gray-500">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left">
                            Founder &amp; Venture
                          </th>
                          <th scope="col" className="px-6 py-3 text-left">
                            Location
                          </th>
                          <th scope="col" className="px-6 py-3 text-left">
                            Sector &amp; Stage
                          </th>
                          <th scope="col" className="px-6 py-3 text-left">
                            AWIEF Program
                          </th>
                          <th scope="col" className="px-6 py-3 text-center">
                            Progress
                          </th>
                          <th scope="col" className="px-6 py-3 text-left">
                            Last Active
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {filteredStudents.map((student: any) => (
                          <tr key={student.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-9 w-9 bg-[#7F3D59] text-white rounded-full flex items-center justify-center font-bold text-xs">
                                  {student.name ? student.name[0].toUpperCase() : "S"}
                                </div>
                                <div className="ml-3">
                                  <div className="font-bold text-gray-900">
                                    {student.name || "Anonymous Founder"}
                                  </div>
                                  <div className="text-[11px] text-gray-500">
                                    {student.organization || student.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                {student.country && (
                                  <img
                                    src={`https://flagcdn.com/w40/${student.country.toLowerCase()}.png`}
                                    alt={student.country}
                                    className="w-4 h-auto rounded-[2px]"
                                  />
                                )}
                                <span className="font-medium text-gray-700">
                                  {student.country || "Pan-Africa"}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <p className="font-medium text-gray-800">
                                {student.sector || "Agribusiness"}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                {student.businessStage || "Growth Stage"}
                              </p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7F3D59]/10 text-[#7F3D59]">
                                {student.awiefProgram || "Growth Accelerator"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span
                                className={`px-2 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full ${
                                  student.scormProgress >= 100
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {student.scormProgress}%
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                              {student.lastActiveDate
                                ? new Date(student.lastActiveDate).toLocaleDateString()
                                : "Never"}
                            </td>
                          </tr>
                        ))}
                        {filteredStudents.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                              No founders match your search criteria.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-VIEW B: SURVEYS */}
            {learnerSubTab === "SURVEYS" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#EAD7E0]">
                    <p className="text-xs text-gray-500 font-bold uppercase">
                      Evaluations Completed
                    </p>
                    <p className="text-2xl font-serif font-extrabold text-gray-900 mt-1">
                      {surveyStats.count}
                    </p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#EAD7E0]">
                    <p className="text-xs text-gray-500 font-bold uppercase">Platform &amp; Pacing</p>
                    <p className="text-2xl font-serif font-extrabold text-emerald-600 mt-1">
                      {surveyStats.avgPlatform} / 5.0
                    </p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#EAD7E0]">
                    <p className="text-xs text-gray-500 font-bold uppercase">Template Utility</p>
                    <p className="text-2xl font-serif font-extrabold text-[#7F3D59] mt-1">
                      {surveyStats.avgMaterials} / 5.0
                    </p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#EAD7E0]">
                    <p className="text-xs text-gray-500 font-bold uppercase">Competency Lift</p>
                    <p className="text-2xl font-serif font-extrabold text-[#D4AF37] mt-1">
                      {surveyStats.avgBefore} → {surveyStats.avgAfter}{" "}
                      <span className="text-xs font-normal text-gray-500">
                        (+{(Number(surveyStats.avgAfter) - Number(surveyStats.avgBefore)).toFixed(1)})
                      </span>
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-[#EAD7E0] overflow-hidden">
                  <div className="px-6 py-4 bg-[#FDF8F9] border-b border-[#EAD7E0] flex justify-between items-center">
                    <h3 className="font-serif font-bold text-gray-900">
                      Executive Evaluation Reviews
                    </h3>
                    <span className="text-xs text-gray-500">
                      {surveyResponses.length} Responses
                    </span>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {surveyResponses.map((r: any) => (
                      <div
                        key={r.id}
                        className="p-6 space-y-4 hover:bg-gray-50/50 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm">
                              {r.user?.name || r.user?.email}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {r.user?.organization || "Venture"} • {r.user?.sector || "Sector"} •{" "}
                              {r.user?.country || "Pan-Africa"}
                            </p>
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(r.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FDF8F9] p-3.5 rounded-xl text-xs">
                          <div>
                            <span className="text-gray-400 block text-[10px] uppercase">
                              Navigation
                            </span>
                            <span className="font-bold text-gray-800">{r.q1_platformNav} / 5</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px] uppercase">
                              Templates
                            </span>
                            <span className="font-bold text-gray-800">
                              {r.q2_materialsClear} / 5
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px] uppercase">Pacing</span>
                            <span className="font-bold text-gray-800">
                              {r.q3_durationAppropriate} / 5
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px] uppercase">
                              Objectives
                            </span>
                            <span className="font-bold text-gray-800">
                              {r.q4_contentMatchedObjectives} / 5
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="font-bold text-gray-700 block">
                              30-Day Implementation Action:
                            </span>
                            <p className="text-gray-700 bg-white p-3 rounded-xl border border-gray-200 mt-1 italic leading-relaxed">
                              &ldquo;{r.q8_applicationOpenEnded}&rdquo;
                            </p>
                          </div>
                          {r.q9_recommendedCoursesOpenEnded && (
                            <div>
                              <span className="font-bold text-gray-700 block">
                                Recommended Future Masterclasses:
                              </span>
                              <p className="text-gray-600 bg-white p-3 rounded-xl border border-gray-200 mt-1 italic leading-relaxed">
                                &ldquo;{r.q9_recommendedCoursesOpenEnded}&rdquo;
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-VIEW C: CERTIFICATES */}
            {learnerSubTab === "CERTIFICATES" && (
              <div className="bg-white rounded-2xl shadow-sm border border-[#EAD7E0] overflow-hidden">
                <div className="px-6 py-4 bg-[#FDF8F9] border-b border-[#EAD7E0] flex justify-between items-center">
                  <h3 className="font-serif font-bold text-gray-900">
                    Official Issued Certificates Registry
                  </h3>
                  <span className="text-xs text-gray-500">{certificates.length} Issued</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-[#FDF8F9] text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="px-6 py-3 text-left">Founder Recipient</th>
                        <th className="px-6 py-3 text-left">Masterclass</th>
                        <th className="px-6 py-3 text-left">Certificate ID</th>
                        <th className="px-6 py-3 text-left">Issue Date</th>
                        <th className="px-6 py-3 text-right">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {certificates.map((c: any) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">
                            {c.recipientName}
                          </td>
                          <td className="px-6 py-4 text-gray-700 max-w-xs truncate">
                            {c.courseTitle}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-bold text-[#7F3D59]">
                            {c.certificateNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-xs">
                            {new Date(c.issuedAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                            <Link
                              href={`/verify/${c.certificateNumber}`}
                              target="_blank"
                              className="text-[#7F3D59] hover:underline font-bold inline-flex items-center gap-1"
                            >
                              <span>Verify Link</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-VIEW D: QUIZ DIAGNOSTICS */}
            {learnerSubTab === "DIAGNOSTICS" && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-[#5E2C41] to-[#7F3D59] rounded-2xl shadow-md p-6 text-white border border-[#D4AF37]/30">
                  <h3 className="text-xl font-serif font-bold text-white">
                    Assessment Item Diagnostics
                  </h3>
                  <p className="text-gray-200 text-xs mt-1">
                    Pinpoint which scenario questions learners struggle with across commercial cohorts.
                  </p>
                </div>

                {!advancedAnalytics ? (
                  <div className="flex justify-center items-center h-32 bg-white rounded-2xl border border-gray-100">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7F3D59]"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {Object.entries(advancedAnalytics.analytics || {}).map(([qId, st]: any) => (
                      <div
                        key={qId}
                        className="bg-white rounded-2xl shadow-sm border border-[#EAD7E0] p-6 space-y-4"
                      >
                        <h4 className="font-serif font-bold text-gray-900 text-base">
                          Quiz: {quizNames[qId] || `Assessment ${qId}`}
                        </h4>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="bg-[#FDF8F9] p-3 rounded-xl border border-[#EAD7E0]">
                            <p className="text-[10px] text-gray-500 font-bold uppercase">
                              Total Attempts
                            </p>
                            <p className="text-xl font-bold text-gray-900">{st.totalAttempts}</p>
                          </div>
                          <div className="bg-[#FDF8F9] p-3 rounded-xl border border-[#EAD7E0]">
                            <p className="text-[10px] text-gray-500 font-bold uppercase">
                              Passing Learners
                            </p>
                            <p className="text-xl font-bold text-emerald-700">{st.passedUsers}</p>
                          </div>
                          <div className="bg-[#FDF8F9] p-3 rounded-xl border border-[#EAD7E0]">
                            <p className="text-[10px] text-gray-500 font-bold uppercase">
                              Avg Attempts to Pass
                            </p>
                            <p className="text-xl font-bold text-[#7F3D59]">
                              {st.avgAttemptsToPass}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* 4. USER MANAGEMENT TAB */}
        {activeSection === "USERS" && role === "ADMIN" && (
          <motion.div
            key="USERS"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <UserManagementTab />
          </motion.div>
        )}

        {/* 5. QUALITY & REVIEWS TAB */}
        {activeSection === "REVIEWS" && (
          <motion.div
            key="REVIEWS"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-[#1D0B14] rounded-2xl shadow-md p-6 text-white flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border border-[#3E1A29]">
              <div>
                <h3 className="text-xl font-serif font-bold text-white">
                  Course Review &amp; Faculty Annotations
                </h3>
                <p className="text-gray-300 text-xs mt-1">
                  Faculty authors and external reviewers can leave editorial and pedagogical recommendations directly in SCORM modules.
                </p>
              </div>
              <Link
                href="/course/investment-readiness?mode=review"
                className="px-5 py-2.5 bg-[#D4AF37] text-[#1D0B14] font-serif font-bold rounded-xl shadow-sm hover:bg-[#B89628] transition-colors text-xs flex items-center justify-center shrink-0"
              >
                <span>Launch Review Mode →</span>
              </Link>
            </div>

            <ReviewList comments={courseComments} handleResolve={handleResolve} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReviewList({
  comments,
  handleResolve
}: {
  comments: any[];
  handleResolve: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {comments.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-[#EAD7E0] text-center text-gray-500 text-xs">
          No reviewer annotations submitted yet.
        </div>
      ) : (
        comments.map((comment: any) => (
          <div
            key={comment.id}
            className={`bg-white p-6 rounded-2xl border shadow-xs transition-all ${
              comment.status === "RESOLVED"
                ? "border-gray-200 opacity-60"
                : "border-[#EAD7E0] hover:shadow-md"
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center mb-3">
                <div className="h-9 w-9 bg-[#7F3D59]/10 text-[#7F3D59] rounded-xl flex items-center justify-center font-bold text-xs border border-[#7F3D59]/20">
                  {comment.user?.name ? comment.user.name[0].toUpperCase() : "R"}
                </div>
                <div className="ml-3">
                  <p className="font-bold text-gray-900 text-xs">
                    {comment.user?.name || comment.user?.email}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {new Date(comment.createdAt).toLocaleString()}
                  </p>
                </div>
                {comment.status === "RESOLVED" && (
                  <span className="ml-3 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                    RESOLVED
                  </span>
                )}
              </div>

              {comment.status === "OPEN" && (
                <button
                  type="button"
                  onClick={() => handleResolve(comment.id)}
                  className="text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Mark Resolved
                </button>
              )}
            </div>

            <div className="pl-12 space-y-2 text-xs">
              <p className="text-gray-800 font-medium whitespace-pre-wrap">{comment.comment}</p>
              {comment.selectedText && (
                <div className="bg-[#FDF8F9] border-l-4 border-[#7F3D59] p-3 rounded-r-lg">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                    Context Highlighted:
                  </p>
                  <p className="text-xs text-gray-600 italic">
                    &ldquo;{comment.selectedText}&rdquo;
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1 font-mono">
                    Source: {comment.lessonHash}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
