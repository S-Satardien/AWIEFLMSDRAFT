"use client";

import { useState, useMemo, useEffect } from "react";
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
  Search,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Eye,
  Plus,
  PlayCircle,
  ArrowRight
} from "@/components/Icons";
import UserManagementTab from "./UserManagementTab";
import QuizManagementTab from "./QuizManagementTab";
import RoyaltiesTab from "./RoyaltiesTab";
import CourseManagementTab from "./CourseManagementTab";
import CourseUserManagement from "./CourseUserManagement";
import StudentProfileDrawer from "./StudentProfileDrawer";
import CourseBuilder from "./CourseBuilder";
import LearnDashImportModal from "./LearnDashImportModal";
import {
  getAdminData,
  resolveComment,
  getAdvancedQuizAnalytics,
  exportAllPlatformData,
} from "./actions";
import { Pencil, Upload } from "@/components/Icons";

interface AdminClientProps {
  initialData: any;
}

type AdminView =
  | "ROYALTIES"
  | "TRANSACTIONS"
  | "COURSES_BUILDER"
  | "COURSE_DETAIL"
  | "COURSES_QUIZZES"
  | "COURSE_ROSTER"
  | "COHORT"
  | "STAFF_USERS"
  | "CERTIFICATES"
  | "SURVEYS"
  | "DIAGNOSTICS"
  | "REVIEWS";

type CourseDetailSubTab = "CURRICULUM" | "ROSTER" | "QUIZZES";

/**
 * AWIEF Executive Control Center & Administration Portal.
 * Features a persistent Left Sidebar with accordion dropdowns for:
 * 1. Masterclasses & Courses (Curriculum Studio, LearnDash Import, course workspaces, course quizzes)
 * 2. Course User Management (Course-scoped rosters, 360° student dossiers, master cohort, staff accounts)
 * 3. Financials & Royalties (Author royalties, settlement statements, transaction ledger)
 * 4. Credentials & Governance (Verifiable QR certificates, surveys, item diagnostics, reviewer annotations)
 *
 * @param {AdminClientProps} props - Initial server-fetched datasets.
 * @returns {JSX.Element} The rendered administrative interface.
 */
export default function AdminClient({ initialData }: AdminClientProps) {
  const [adminData, setAdminData] = useState(initialData);
  const {
    students = [],
    reviewComments = [],
    surveyResponses = [],
    certificates = [],
    quizNames = {},
    courses = [],
    transactions = [],
    role = "STUDENT"
  } = adminData;

  const [comments, setComments] = useState(reviewComments);
  const [advancedAnalytics, setAdvancedAnalytics] = useState<any>(null);
  const [isExportingData, setIsExportingData] = useState(false);

  // Active View State
  const [activeView, setActiveView] = useState<AdminView>(
    role === "ADMIN" ? "ROYALTIES" : "REVIEWS"
  );

  // Sidebar Accordion Collapsible State
  const [sidebarAccordions, setSidebarAccordions] = useState({
    courses: true,
    users: true,
    royalties: true,
    governance: false
  });

  const toggleAccordion = (section: keyof typeof sidebarAccordions) => {
    setSidebarAccordions((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Dedicated Course Selection & Sub-Tab State
  const [selectedCourse, setSelectedCourse] = useState<any>(courses[0] || null);
  const [courseDetailSubTab, setCourseDetailSubTab] = useState<CourseDetailSubTab>("CURRICULUM");
  const [courseQuizFilter, setCourseQuizFilter] = useState<string | null>(null);
  const [isEditingSelectedCourse, setIsEditingSelectedCourse] = useState(false);
  const [isCreatingCourseQuick, setIsCreatingCourseQuick] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // 360° Student Drawer State
  const [inspectStudentId, setInspectStudentId] = useState<string | null>(null);

  // Search filter for cohort table
  const [learnerSearch, setLearnerSearch] = useState("");

  useEffect(() => {
    if (role === "ADMIN") {
      getAdvancedQuizAnalytics().then((res) => setAdvancedAnalytics(res));
    }
  }, [role]);

  const refreshAdminData = async (focusCourseId?: string) => {
    const fresh = await getAdminData();
    if (!fresh) return;
    setAdminData(fresh);
    setComments(fresh.reviewComments || []);
    const targetId = focusCourseId || selectedCourse?.id;
    if (targetId) {
      const updatedSelected = (fresh.courses || []).find((c: any) => c.id === targetId);
      if (updatedSelected) {
        setSelectedCourse(updatedSelected);
      } else {
        setSelectedCourse((fresh.courses || [])[0] || null);
        if (activeView === "COURSE_DETAIL") {
          setIsEditingSelectedCourse(false);
          setActiveView("COURSES_BUILDER");
        }
      }
    }
  };

  const handleResolve = async (id: string) => {
    await resolveComment(id);
    setComments(comments.map((c: any) => (c.id === id ? { ...c, status: "RESOLVED" } : c)));
  };

  // Open Quizzes for a specific course
  const handleOpenCourseQuizzes = (courseId: string) => {
    const c = courses.find((item: any) => item.id === courseId);
    if (c) {
      setSelectedCourse(c);
      setIsEditingSelectedCourse(false);
      setActiveView("COURSE_DETAIL");
      setCourseDetailSubTab("QUIZZES");
    } else {
      setActiveView("COURSES_QUIZZES");
      setCourseQuizFilter(courseId);
    }
  };

  // Switch to specific course workspace
  const handleSelectCourseWorkspace = (course: any) => {
    setSelectedCourse(course);
    setIsEditingSelectedCourse(false);
    setActiveView("COURSE_DETAIL");
    setCourseDetailSubTab("CURRICULUM");
  };

  // Full platform data export
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

  // Filtered Cohort Students
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

  // Parse modules of selected course
  const selectedCourseModules = useMemo(() => {
    if (!selectedCourse?.modulesJson) return [];
    try {
      return JSON.parse(selectedCourse.modulesJson);
    } catch {
      return [];
    }
  }, [selectedCourse]);

  return (
    <div className="space-y-6 selection:bg-[#7F3D59] selection:text-white">
      {isImportModalOpen && (
        <LearnDashImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImported={async (courseId) => {
            setIsImportModalOpen(false);
            await refreshAdminData(courseId);
            setActiveView("COURSE_DETAIL");
            setCourseDetailSubTab("CURRICULUM");
            setIsEditingSelectedCourse(false);
          }}
        />
      )}

      {/* Top Header Strip with UN ECOSOC Seal & Platform Quick Actions */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-[#EAD7E0] flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#7F3D59]/10 text-[#7F3D59] border border-[#7F3D59]/20 inline-flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>UN ECOSOC Consultative Status</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-[#1D0B14]">
            AWIEF Executive Administration
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Create &amp; import masterclasses, manage course rosters, track author royalties, and verify credentials.
          </p>
        </div>

        {/* Global Action Strip */}
        {role === "ADMIN" && (
          <div className="flex flex-wrap items-center gap-2 self-start xl:self-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsCreatingCourseQuick(true);
                setActiveView("COURSES_BUILDER");
              }}
              className="px-3.5 py-2 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Course</span>
            </button>
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-2 bg-[#FDF8F9] hover:bg-[#EAD7E0]/60 text-[#7F3D59] border border-[#7F3D59]/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import LearnDash</span>
            </button>
            <button
              type="button"
              onClick={handleExportFullPlatformData}
              disabled={isExportingData}
              className="px-3.5 py-2 bg-[#D4AF37] hover:bg-[#B89628] text-[#1D0B14] rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 font-serif"
              title="Exports complete database (courses, users, transactions, certificates, surveys) in JSON"
            >
              <Download className="w-3.5 h-3.5 text-[#1D0B14]" />
              <span>{isExportingData ? "Exporting..." : "Export JSON"}</span>
            </button>
            <button
              type="button"
              onClick={exportStudentsCSV}
              className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-gray-600" />
              <span>Founders CSV</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Two-Column Layout: Left Sidebar + Workspace Content */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* LEFT SIDEBAR NAVIGATION WITH COLLAPSIBLE DROPDOWNS */}
        <aside className="w-full lg:w-64 lg:sticky lg:top-6 bg-white rounded-3xl border border-[#EAD7E0] p-4 shadow-sm shrink-0 space-y-4">
          <div className="px-2 pt-1 pb-2 border-b border-[#EAD7E0]/60 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Admin Navigation
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7F3D59]/10 text-[#7F3D59]">
              {role === "ADMIN" ? "Executive Portal" : "Faculty Reviewer"}
            </span>
          </div>

          <nav className="space-y-3 text-xs">
            {role === "ADMIN" && (
              <>
                {/* 1. MASTERCLASSES & COURSES DROPDOWN */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleAccordion("courses")}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl font-bold text-gray-800 hover:bg-[#FDF8F9] hover:text-[#7F3D59] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#7F3D59]" />
                      <span>Masterclasses &amp; Courses</span>
                    </div>
                    {sidebarAccordions.courses ? (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </button>

                  {sidebarAccordions.courses && (
                    <div className="pl-4 space-y-1 border-l-2 border-[#EAD7E0] ml-3.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingCourseQuick(false);
                          setActiveView("COURSES_BUILDER");
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-between ${
                          activeView === "COURSES_BUILDER" && !isCreatingCourseQuick
                            ? "bg-[#7F3D59] text-white font-bold"
                            : "text-gray-600 hover:bg-[#FDF8F9] hover:text-[#7F3D59]"
                        }`}
                      >
                        <span className="truncate">All Masterclasses</span>
                        <span className="text-[10px] opacity-75 font-mono">{courses.length}</span>
                      </button>

                      {/* Dynamic Course Workspaces */}
                      <div className="pt-1 pb-1 space-y-0.5 max-h-48 overflow-y-auto pr-1">
                        <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Course Workspaces:
                        </p>
                        {courses.map((c: any) => {
                          const isSelected = activeView === "COURSE_DETAIL" && selectedCourse?.id === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleSelectCourseWorkspace(c)}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] transition-colors truncate block ${
                                isSelected
                                  ? "bg-[#7F3D59]/15 text-[#7F3D59] font-bold border-l-2 border-[#7F3D59]"
                                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                              }`}
                              title={c.title}
                            >
                              {c.title}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveView("COURSES_QUIZZES");
                          setCourseQuizFilter(null);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                          activeView === "COURSES_QUIZZES"
                            ? "bg-[#7F3D59] text-white font-bold"
                            : "text-gray-600 hover:bg-[#FDF8F9] hover:text-[#7F3D59]"
                        }`}
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Course Quizzes</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. COURSE USER MANAGEMENT DROPDOWN */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleAccordion("users")}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl font-bold text-gray-800 hover:bg-[#FDF8F9] hover:text-[#7F3D59] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#7F3D59]" />
                      <span>Course User Management</span>
                    </div>
                    {sidebarAccordions.users ? (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </button>

                  {sidebarAccordions.users && (
                    <div className="pl-6 space-y-1 border-l-2 border-[#EAD7E0] ml-3.5">
                      <button
                        type="button"
                        onClick={() => setActiveView("COURSE_ROSTER")}
                        className={`w-full text-left px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-between ${
                          activeView === "COURSE_ROSTER"
                            ? "bg-[#7F3D59] text-white font-bold"
                            : "text-gray-600 hover:bg-[#FDF8F9] hover:text-[#7F3D59]"
                        }`}
                      >
                        <span>Course Rosters</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold">
                          Scoped
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveView("COHORT")}
                        className={`w-full text-left px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-between ${
                          activeView === "COHORT"
                            ? "bg-[#7F3D59] text-white font-bold"
                            : "text-gray-600 hover:bg-[#FDF8F9] hover:text-[#7F3D59]"
                        }`}
                      >
                        <span>Master Cohort</span>
                        <span className="text-[10px] opacity-75 font-mono">{students.length}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveView("STAFF_USERS")}
                        className={`w-full text-left px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                          activeView === "STAFF_USERS"
                            ? "bg-[#7F3D59] text-white font-bold"
                            : "text-gray-600 hover:bg-[#FDF8F9] hover:text-[#7F3D59]"
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Staff Accounts &amp; Roles</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. FINANCIALS & ROYALTIES DROPDOWN */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleAccordion("royalties")}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl font-bold text-gray-800 hover:bg-[#FDF8F9] hover:text-[#7F3D59] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <CircleDollarSign className="w-4 h-4 text-[#7F3D59]" />
                      <span>Financials &amp; Royalties</span>
                    </div>
                    {sidebarAccordions.royalties ? (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </button>

                  {sidebarAccordions.royalties && (
                    <div className="pl-6 space-y-1 border-l-2 border-[#EAD7E0] ml-3.5">
                      <button
                        type="button"
                        onClick={() => setActiveView("ROYALTIES")}
                        className={`w-full text-left px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-between ${
                          activeView === "ROYALTIES"
                            ? "bg-[#7F3D59] text-white font-bold"
                            : "text-gray-600 hover:bg-[#FDF8F9] hover:text-[#7F3D59]"
                        }`}
                      >
                        <span>Author Royalties</span>
                        <span className="text-[10px] font-mono font-bold text-[#D4AF37]">
                          R{totalRoyaltiesOwed.toLocaleString()}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveView("TRANSACTIONS")}
                        className={`w-full text-left px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-between ${
                          activeView === "TRANSACTIONS"
                            ? "bg-[#7F3D59] text-white font-bold"
                            : "text-gray-600 hover:bg-[#FDF8F9] hover:text-[#7F3D59]"
                        }`}
                      >
                        <span>Settlement Ledger</span>
                        <span className="text-[10px] opacity-75 font-mono">{transactions.length}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. CREDENTIALS & GOVERNANCE DROPDOWN */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleAccordion("governance")}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl font-bold text-gray-800 hover:bg-[#FDF8F9] hover:text-[#7F3D59] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-[#7F3D59]" />
                      <span>Credentials &amp; Quality</span>
                    </div>
                    {sidebarAccordions.governance ? (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </button>

                  {sidebarAccordions.governance && (
                    <div className="pl-6 space-y-1 border-l-2 border-[#EAD7E0] ml-3.5">
                      <button
                        type="button"
                        onClick={() => setActiveView("CERTIFICATES")}
                        className={`w-full text-left px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-between ${
                          activeView === "CERTIFICATES"
                            ? "bg-[#7F3D59] text-white font-bold"
                            : "text-gray-600 hover:bg-[#FDF8F9] hover:text-[#7F3D59]"
                        }`}
                      >
                        <span>Issued Certificates</span>
                        <span className="text-[10px] opacity-75 font-mono">{certificates.length}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveView("SURVEYS")}
                        className={`w-full text-left px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-between ${
                          activeView === "SURVEYS"
                            ? "bg-[#7F3D59] text-white font-bold"
                            : "text-gray-600 hover:bg-[#FDF8F9] hover:text-[#7F3D59]"
                        }`}
                      >
                        <span>Evaluation Surveys</span>
                        <span className="text-[10px] opacity-75 font-mono">{surveyResponses.length}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveView("DIAGNOSTICS")}
                        className={`w-full text-left px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                          activeView === "DIAGNOSTICS"
                            ? "bg-[#7F3D59] text-white font-bold"
                            : "text-gray-600 hover:bg-[#FDF8F9] hover:text-[#7F3D59]"
                        }`}
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>Item Diagnostics</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 5. FACULTY REVIEWS & ANNOTATIONS */}
            <div className="pt-2 border-t border-[#EAD7E0]/60">
              <button
                type="button"
                onClick={() => setActiveView("REVIEWS")}
                className={`w-full text-left px-3 py-2 rounded-xl font-bold transition-colors flex items-center justify-between ${
                  activeView === "REVIEWS"
                    ? "bg-[#7F3D59] text-white shadow-xs"
                    : "text-gray-700 hover:bg-[#FDF8F9] hover:text-[#7F3D59]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquareCheck className="w-4 h-4 text-[#D4AF37]" />
                  <span>Reviewer Annotations</span>
                </div>
                {openCommentsCount > 0 && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      activeView === "REVIEWS"
                        ? "bg-white text-[#7F3D59]"
                        : "bg-[#D4AF37] text-[#1D0B14]"
                    }`}
                  >
                    {openCommentsCount}
                  </span>
                )}
              </button>
            </div>
          </nav>

          {/* Sidebar Footer Indicator */}
          <div className="pt-4 border-t border-[#EAD7E0]/60 text-[11px] text-gray-500 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="font-medium">System Online • AWIEF Core</span>
            </div>
            <div className="flex items-center justify-between pt-1 text-[10px]">
              <Link href="/catalog" className="text-[#7F3D59] hover:underline font-bold">
                Public Catalogue →
              </Link>
              <Link href="/dashboard" className="text-gray-500 hover:underline">
                Dashboard
              </Link>
            </div>
          </div>
        </aside>

        {/* MAIN WORKSPACE CONTENT */}
        <main className="flex-1 min-w-0 w-full space-y-6">
          <AnimatePresence mode="wait">
            {/* VIEW 1: DEDICATED COURSE WORKSPACE */}
            {activeView === "COURSE_DETAIL" && selectedCourse && (
              <motion.div
                key={`COURSE_DETAIL_${selectedCourse.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Course Header Banner */}
                <div className="bg-white p-6 rounded-3xl border border-[#EAD7E0] shadow-sm space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#7F3D59]/10 text-[#7F3D59]">
                          {selectedCourse.category || "Masterclass"}
                        </span>
                        {selectedCourse.isNative ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Native Interactive Modules
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                            Interactive Workshop Package
                          </span>
                        )}
                        <span className="text-xs text-gray-400 font-mono">ID: {selectedCourse.id}</span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-serif font-bold text-gray-900">
                        {selectedCourse.title}
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">
                        Author: <strong className="text-gray-700">{selectedCourse.authorName || "AWIEF Faculty"}</strong> • Royalty Rate: {selectedCourse.royaltyRate || 35}% • Tuition: {selectedCourse.isFree ? "Free" : `R${selectedCourse.priceZar?.toLocaleString()} / $${selectedCourse.priceUsd}`}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingSelectedCourse(!isEditingSelectedCourse)}
                        className="px-4 py-2 bg-[#FDF8F9] hover:bg-[#EAD7E0]/60 text-[#7F3D59] border border-[#7F3D59]/30 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>{isEditingSelectedCourse ? "View Blueprint" : "Edit Course & Curriculum"}</span>
                      </button>
                      <Link
                        href={`/course/${selectedCourse.id}`}
                        target="_blank"
                        className="px-4 py-2 bg-[#7F3D59] hover:bg-[#5E2C41] text-white text-xs font-bold rounded-xl transition-colors shadow-sm inline-flex items-center gap-1.5"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Launch Course View</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingSelectedCourse(false);
                          setActiveView("COURSES_BUILDER");
                        }}
                        className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>All Courses</span>
                      </button>
                    </div>
                  </div>

                  {/* Course Sub-Tab Navigation */}
                  <div className="flex items-center gap-2 pt-3 border-t border-[#EAD7E0]/60 overflow-x-auto text-xs">
                    <button
                      type="button"
                      onClick={() => setCourseDetailSubTab("CURRICULUM")}
                      className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        courseDetailSubTab === "CURRICULUM"
                          ? "bg-[#7F3D59] text-white shadow-xs"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Curriculum &amp; Learning Objectives</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingSelectedCourse(false);
                        setCourseDetailSubTab("ROSTER");
                      }}
                      className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        courseDetailSubTab === "ROSTER"
                          ? "bg-[#7F3D59] text-white shadow-xs"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Course Roster &amp; User Management</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingSelectedCourse(false);
                        setCourseDetailSubTab("QUIZZES");
                      }}
                      className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        courseDetailSubTab === "QUIZZES"
                          ? "bg-[#7F3D59] text-white shadow-xs"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Course Quizzes &amp; Assessments</span>
                    </button>
                  </div>
                </div>

                {/* Sub-Tab 1: Curriculum & Learning Objectives (or Inline CourseBuilder) */}
                {courseDetailSubTab === "CURRICULUM" && (
                  <div className="space-y-4">
                    {isEditingSelectedCourse ? (
                      <CourseBuilder
                        key={selectedCourse.id}
                        course={selectedCourse}
                        onCancel={() => setIsEditingSelectedCourse(false)}
                        onSaved={async (savedId) => {
                          setIsEditingSelectedCourse(false);
                          await refreshAdminData(savedId);
                        }}
                      />
                    ) : (
                      <div className="bg-white p-6 rounded-3xl border border-[#EAD7E0] shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                          <div>
                            <h3 className="font-serif font-bold text-gray-900 text-base mb-1">
                              Course Pedagogical Blueprint &amp; Syllabus
                            </h3>
                            <p className="text-xs text-gray-500">
                              Each bite-sized module is designed for 20-30 minute completion, paired with pan-African case studies and practical templates.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsEditingSelectedCourse(true)}
                            className="px-4 py-2 bg-[#7F3D59] hover:bg-[#5E2C41] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 self-start shrink-0"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit Modules &amp; Quizzes</span>
                          </button>
                        </div>

                        {selectedCourseModules.length === 0 ? (
                          <div className="p-8 text-center text-gray-500 bg-[#FDF8F9] rounded-2xl border border-[#EAD7E0] text-xs space-y-3">
                            <p>No native modules defined for this masterclass yet.</p>
                            <button
                              type="button"
                              onClick={() => setIsEditingSelectedCourse(true)}
                              className="px-4 py-2 bg-[#7F3D59] text-white rounded-xl font-bold"
                            >
                              Open Course Builder to Add Modules
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {selectedCourseModules.map((mod: any, index: number) => (
                              <div
                                key={mod.id || index}
                                className="p-5 rounded-2xl border border-[#EAD7E0] bg-[#FDF8F9]/50 hover:bg-[#FDF8F9] transition-colors space-y-3"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#7F3D59]">
                                      Module {index + 1}
                                    </span>
                                    <h4 className="font-serif font-bold text-gray-900 text-sm">
                                      {mod.title}
                                    </h4>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {mod.quizId && (
                                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                                        Quiz Linked
                                      </span>
                                    )}
                                    <span className="text-xs font-mono font-bold text-gray-500 bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                                      {mod.duration || "25 mins"}
                                    </span>
                                  </div>
                                </div>

                                <p className="text-xs text-gray-600 leading-relaxed">
                                  {mod.summary}
                                </p>

                                {mod.topics && Array.isArray(mod.topics) && mod.topics.length > 0 && (
                                  <div className="bg-white p-3.5 rounded-xl border border-gray-200 text-xs space-y-1">
                                    <strong className="text-gray-900 block text-[11px] uppercase tracking-wider">
                                      Sub-Lessons / Topics ({mod.topics.length}):
                                    </strong>
                                    <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                                      {mod.topics.map((t: any, tIdx: number) => (
                                        <li key={t.id || tIdx}>
                                          {typeof t === "string" ? t : t.title}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {mod.caseStudy && (
                                  <div className="bg-white p-3.5 rounded-xl border border-gray-200 text-xs">
                                    <strong className="text-gray-900 block font-serif mb-1">
                                      Pan-African Enterprise Case Study:
                                    </strong>
                                    <p className="text-gray-600 italic">
                                      {typeof mod.caseStudy === "string"
                                        ? mod.caseStudy
                                        : mod.caseStudy.summary || mod.caseStudy.title}
                                    </p>
                                  </div>
                                )}

                                {mod.keyTakeaways && mod.keyTakeaways.length > 0 && (
                                  <div className="space-y-1.5 text-xs">
                                    <strong className="text-gray-700 block text-[11px] uppercase tracking-wider">
                                      Learning Objectives &amp; Core Takeaways:
                                    </strong>
                                    <ul className="list-disc list-inside space-y-1 text-gray-600 pl-1">
                                      {mod.keyTakeaways.map((takeaway: string, tIdx: number) => (
                                        <li key={tIdx}>{takeaway}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {mod.templateName && (
                                  <div className="flex items-center gap-2 text-xs font-medium text-[#7F3D59] bg-[#7F3D59]/10 px-3 py-2 rounded-xl">
                                    <Download className="w-3.5 h-3.5 text-[#7F3D59]" />
                                    <span>Downloadable Toolkit Template: {mod.templateName}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-Tab 2: Course-Scoped User Management */}
                {courseDetailSubTab === "ROSTER" && (
                  <div className="space-y-4">
                    <CourseUserManagement
                      initialCourseId={selectedCourse.id}
                      allCourses={courses}
                      allUsers={students}
                      onRefreshParent={() => refreshAdminData()}
                    />
                  </div>
                )}

                {/* Sub-Tab 3: Course-Scoped Quizzes */}
                {courseDetailSubTab === "QUIZZES" && (
                  <div className="space-y-4">
                    <QuizManagementTab
                      courses={courses}
                      initialCourseId={selectedCourse.id}
                    />
                  </div>
                )}
              </motion.div>
            )}

            {/* VIEW 2: COURSE-SCORED ROSTER (ALL COURSES) */}
            {activeView === "COURSE_ROSTER" && (
              <motion.div
                key="COURSE_ROSTER"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <CourseUserManagement
                  initialCourseId="ALL"
                  allCourses={courses}
                  allUsers={students}
                  onRefreshParent={() => refreshAdminData()}
                />
              </motion.div>
            )}

            {/* VIEW 3: COURSES BUILDER TAB */}
            {activeView === "COURSES_BUILDER" && (
              <motion.div
                key="COURSES_BUILDER"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {isCreatingCourseQuick ? (
                  <CourseBuilder
                    course={null}
                    onCancel={() => setIsCreatingCourseQuick(false)}
                    onSaved={async (savedId) => {
                      setIsCreatingCourseQuick(false);
                      await refreshAdminData(savedId);
                      setActiveView("COURSE_DETAIL");
                      setCourseDetailSubTab("CURRICULUM");
                    }}
                  />
                ) : (
                  <CourseManagementTab
                    courses={courses}
                    onRefresh={() => refreshAdminData()}
                    onManageCourseQuizzes={handleOpenCourseQuizzes}
                    onSelectCourse={handleSelectCourseWorkspace}
                    onCourseCreatedOrImported={async (courseId) => {
                      await refreshAdminData(courseId);
                    }}
                  />
                )}
              </motion.div>
            )}

            {/* VIEW 4: COURSES QUIZZES TAB */}
            {activeView === "COURSES_QUIZZES" && (
              <motion.div
                key="COURSES_QUIZZES"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <QuizManagementTab
                  courses={courses}
                  initialCourseId={courseQuizFilter}
                />
              </motion.div>
            )}

            {/* VIEW 5: ROYALTIES & FINANCIAL STATEMENTS */}
            {(activeView === "ROYALTIES" || activeView === "TRANSACTIONS") && (
              <motion.div
                key="ROYALTIES"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <RoyaltiesTab
                  transactions={transactions}
                  courses={courses}
                  initialSection={activeView === "TRANSACTIONS" ? "LEDGER" : "ROYALTIES"}
                />
              </motion.div>
            )}

            {/* VIEW 6: COHORT OVERVIEW & KPIS */}
            {activeView === "COHORT" && (
              <motion.div
                key="COHORT"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
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

                {/* Main Cohort Table */}
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
                    <table className="w-full divide-y divide-gray-200 text-xs">
                      <thead className="bg-[#FDF8F9] text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        <tr>
                          <th scope="col" className="px-3.5 py-3 text-left">
                            Founder &amp; Venture
                          </th>
                          <th scope="col" className="px-2.5 py-3 text-left">
                            Location
                          </th>
                          <th scope="col" className="px-3 py-3 text-left">
                            Sector &amp; Stage
                          </th>
                          <th scope="col" className="px-3 py-3 text-left">
                            AWIEF Program
                          </th>
                          <th scope="col" className="px-2.5 py-3 text-center">
                            Progress
                          </th>
                          <th scope="col" className="px-3 py-3 text-right">
                            Last Active
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {filteredStudents.map((student: any) => (
                          <tr
                            key={student.id}
                            onClick={() => setInspectStudentId(student.id)}
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <td className="px-3.5 py-3 align-top">
                              <div className="flex items-start gap-2.5">
                                <div className="flex-shrink-0 h-8 w-8 bg-[#7F3D59] text-white rounded-full flex items-center justify-center font-bold text-xs mt-0.5">
                                  {student.name ? student.name[0].toUpperCase() : "S"}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-gray-900 hover:text-[#7F3D59] flex items-center gap-1">
                                    <span>{student.name || "Anonymous Founder"}</span>
                                    <Eye className="w-3 h-3 text-gray-400 shrink-0" />
                                  </div>
                                  <div className="text-[11px] text-gray-500 break-all">
                                    {student.organization || student.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-2.5 py-3 align-top">
                              <div className="flex items-center gap-1.5">
                                {student.country && (
                                  <img
                                    src={`https://flagcdn.com/w40/${student.country.toLowerCase()}.png`}
                                    alt={student.country}
                                    className="w-4 h-auto rounded-[2px] shrink-0"
                                  />
                                )}
                                <span className="font-medium text-gray-700">
                                  {student.country || "Africa"}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3 align-top">
                              <p className="font-medium text-gray-800">
                                {student.sector || "Agribusiness"}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                {student.businessStage || "Growth Stage"}
                              </p>
                            </td>
                            <td className="px-3 py-3 align-top">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7F3D59]/10 text-[#7F3D59] inline-block">
                                {student.awiefProgram || "Growth Accelerator"}
                              </span>
                            </td>
                            <td className="px-2.5 py-3 text-center align-top">
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
                            <td className="px-3 py-3 text-right text-xs text-gray-500 align-top">
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
              </motion.div>
            )}

            {/* VIEW 7: STAFF ACCOUNTS & ROLES */}
            {activeView === "STAFF_USERS" && (
              <motion.div
                key="STAFF_USERS"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <UserManagementTab />
              </motion.div>
            )}

            {/* VIEW 8: ISSUED CERTIFICATES REGISTRY */}
            {activeView === "CERTIFICATES" && (
              <motion.div
                key="CERTIFICATES"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-2xl shadow-sm border border-[#EAD7E0] overflow-hidden"
              >
                <div className="px-6 py-4 bg-[#FDF8F9] border-b border-[#EAD7E0] flex justify-between items-center">
                  <h3 className="font-serif font-bold text-gray-900">
                    Official Issued Certificates Registry
                  </h3>
                  <span className="text-xs text-gray-500">{certificates.length} Issued</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-[#FDF8F9] text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="px-3.5 py-3 text-left">Founder Recipient</th>
                        <th className="px-3 py-3 text-left">Masterclass</th>
                        <th className="px-3 py-3 text-left">Certificate ID</th>
                        <th className="px-3 py-3 text-left">Issue Date</th>
                        <th className="px-3.5 py-3 text-right">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {certificates.map((c: any) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-3.5 py-3 font-bold text-gray-900 align-top">
                            {c.recipientName}
                          </td>
                          <td className="px-3 py-3 text-gray-700 align-top">
                            <span className="line-clamp-2 max-w-[260px]">{c.courseTitle}</span>
                          </td>
                          <td className="px-3 py-3 font-mono text-[11px] font-bold text-[#7F3D59] align-top break-all">
                            {c.certificateNumber}
                          </td>
                          <td className="px-3 py-3 text-gray-500 text-xs align-top">
                            {new Date(c.issuedAt).toLocaleDateString()}
                          </td>
                          <td className="px-3.5 py-3 text-right text-xs align-top">
                            <Link
                              href={`/verify/${c.certificateNumber}`}
                              target="_blank"
                              className="text-[#7F3D59] hover:underline font-bold inline-flex items-center gap-1"
                            >
                              <span>Verify</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* VIEW 9: COURSE EVALUATION SURVEYS */}
            {activeView === "SURVEYS" && (
              <motion.div
                key="SURVEYS"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
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
              </motion.div>
            )}

            {/* VIEW 10: ASSESSMENT ITEM DIAGNOSTICS */}
            {activeView === "DIAGNOSTICS" && (
              <motion.div
                key="DIAGNOSTICS"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
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
              </motion.div>
            )}

            {/* VIEW 11: QUALITY & FACULTY REVIEWS */}
            {activeView === "REVIEWS" && (
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
                      Faculty authors and external reviewers can leave editorial and pedagogical recommendations directly in interactive modules.
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
        </main>
      </div>

      {/* 360° SINGLE STUDENT PROFILER DRAWER */}
      {inspectStudentId && (
        <StudentProfileDrawer
          userId={inspectStudentId}
          allCourses={courses}
          onClose={() => setInspectStudentId(null)}
          onRefreshParent={() => refreshAdminData()}
        />
      )}
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
