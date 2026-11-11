"use client";

import { useState, useEffect, useMemo } from "react";
import { getCourseRoster, adminEnrollUserInCourse, adminUpdateEnrollmentProgress, adminUnenrollUser } from "./actions";
import { COUNTRIES } from "@/lib/countries";
import StudentProfileDrawer from "./StudentProfileDrawer";
import {
  Users,
  Search,
  BookOpen,
  CheckCircle2,
  Download,
  Plus,
  ShieldCheck,
  Check,
  Award,
  X,
  ExternalLink
} from "@/components/Icons";

interface CourseUserManagementProps {
  initialCourseId?: string;
  allCourses: any[];
  allUsers?: any[];
  onRefreshParent?: () => void;
}

/**
 * Course-Scoped User Management and Enrolled Student Directory.
 * Features multi-dimensional filters (Completion %, Country, Business Stage, Sector, Payment Type),
 * direct enrollment controls, CSV roster exports, and deep single-student 360° profile inspection.
 *
 * @param {CourseUserManagementProps} props - Component properties.
 * @returns {JSX.Element} The rendered course roster manager.
 */
export default function CourseUserManagement({
  initialCourseId = "ALL",
  allCourses,
  allUsers = [],
  onRefreshParent
}: CourseUserManagementProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId);
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [completionFilter, setCompletionFilter] = useState<"ALL" | "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED">("ALL");
  const [countryFilter, setCountryFilter] = useState("ALL");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");

  // 360 Drawer State
  const [inspectStudentId, setInspectStudentId] = useState<string | null>(null);

  // Enroll Student Modal State
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollTargetUserId, setEnrollTargetUserId] = useState("");
  const [enrollTargetCourseId, setEnrollTargetCourseId] = useState(
    initialCourseId !== "ALL" ? initialCourseId : allCourses[0]?.id || ""
  );
  const [enrollSubmitting, setEnrollSubmitting] = useState(false);

  const fetchRoster = async (courseId: string) => {
    setLoading(true);
    try {
      const data = await getCourseRoster(courseId);
      setRoster(data);
    } catch (e) {
      console.error("Failed to load course roster:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster(selectedCourseId);
  }, [selectedCourseId]);

  // Filtered Roster
  const filteredRoster = useMemo(() => {
    return roster.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          item.studentName?.toLowerCase().includes(q) ||
          item.email?.toLowerCase().includes(q) ||
          item.organization?.toLowerCase().includes(q) ||
          item.sector?.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Completion status
      if (completionFilter === "COMPLETED" && item.progress < 100) return false;
      if (completionFilter === "IN_PROGRESS" && (item.progress === 0 || item.progress >= 100)) return false;
      if (completionFilter === "NOT_STARTED" && item.progress > 0) return false;

      // Country
      if (countryFilter !== "ALL" && item.country !== countryFilter) return false;

      // Business Stage
      if (stageFilter !== "ALL" && item.businessStage !== stageFilter) return false;

      // Payment gateway
      if (paymentFilter !== "ALL" && item.gateway !== paymentFilter) return false;

      return true;
    });
  }, [roster, searchQuery, completionFilter, countryFilter, stageFilter, paymentFilter]);

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollTargetUserId || !enrollTargetCourseId) return;
    setEnrollSubmitting(true);
    try {
      const res = await adminEnrollUserInCourse(enrollTargetUserId, enrollTargetCourseId);
      if (res.success) {
        setIsEnrollModalOpen(false);
        setEnrollTargetUserId("");
        fetchRoster(selectedCourseId);
        if (onRefreshParent) onRefreshParent();
      } else {
        alert(res.error || "Failed to enroll student.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setEnrollSubmitting(false);
    }
  };

  const handleFastSetProgress = async (enrollmentId: string, pct: number) => {
    try {
      await adminUpdateEnrollmentProgress(enrollmentId, pct);
      fetchRoster(selectedCourseId);
      if (onRefreshParent) onRefreshParent();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleFastUnenroll = async (enrollmentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to unenroll ${studentName} from this course?`)) return;
    try {
      await adminUnenrollUser(enrollmentId);
      fetchRoster(selectedCourseId);
      if (onRefreshParent) onRefreshParent();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const exportRosterCSV = () => {
    let csv = "Student Name,Email,Country,Enterprise,Profession,Business Stage,Sector,Masterclass,Progress (%),Course Quizzes Passed,Enrollment Type,Last Active,Certificate ID\n";
    filteredRoster.forEach((r) => {
      csv += `"${r.studentName}","${r.email}","${r.country}","${r.organization}","${r.profession}","${r.businessStage}","${r.sector}","${r.courseTitle}",${r.progress},"${r.passedQuizzesCount}/${r.totalCourseQuizzes}","${r.gateway}","${r.lastAccess.split("T")[0]}","${r.certificateNumber || ""}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `awief-course-roster-${selectedCourseId}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 360 Drawer Inspector */}
      {inspectStudentId && (
        <StudentProfileDrawer
          userId={inspectStudentId}
          allCourses={allCourses}
          onClose={() => setInspectStudentId(null)}
          onRefreshParent={() => fetchRoster(selectedCourseId)}
        />
      )}

      {/* Header Strip & Course Selector */}
      <div className="bg-white p-6 rounded-3xl border border-[#EAD7E0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#7F3D59]/10 text-[#7F3D59] rounded-lg">
              <Users className="w-4 h-4" />
            </span>
            <h3 className="text-xl font-serif font-bold text-gray-900">
              Course-Scoped User Management &amp; Student Rosters
            </h3>
          </div>
          <p className="text-xs text-gray-500">
            View enrolled founders per masterclass, monitor completion rates, and inspect 360° individual profiles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsEnrollModalOpen(true)}
            className="px-4 py-2 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Enroll Student</span>
          </button>

          <button
            type="button"
            onClick={exportRosterCSV}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-gray-600" />
            <span>Export Roster CSV</span>
          </button>
        </div>
      </div>

      {/* Multi-Dimensional Filter Bar */}
      <div className="bg-white p-5 rounded-3xl border border-[#EAD7E0] shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          {/* Masterclass Selector */}
          <div className="lg:col-span-2">
            <label className="block font-bold text-gray-700 mb-1">Masterclass Scope</label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full px-3 py-2 bg-[#FDF8F9] border border-gray-300 rounded-xl text-xs font-bold text-[#7F3D59]"
            >
              <option value="ALL">All Masterclasses (Consolidated)</option>
              {allCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="lg:col-span-2">
            <label className="block font-bold text-gray-700 mb-1">Search Student / Venture</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or company..."
                className="w-full pl-9 pr-3 py-2 bg-[#FDF8F9] border border-gray-300 rounded-xl text-xs"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Completion Rate Filter */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Completion Rate</label>
            <select
              value={completionFilter}
              onChange={(e: any) => setCompletionFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#FDF8F9] border border-gray-300 rounded-xl text-xs"
            >
              <option value="ALL">All Rates</option>
              <option value="COMPLETED">Completed (100%)</option>
              <option value="IN_PROGRESS">In Progress (1–99%)</option>
              <option value="NOT_STARTED">Not Started (0%)</option>
            </select>
          </div>

          {/* Country Filter */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Country</label>
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#FDF8F9] border border-gray-300 rounded-xl text-xs"
            >
              <option value="ALL">All Countries</option>
              {COUNTRIES.slice(0, 15).map((c) => (
                <option key={c.code} value={c.code}>
                  [{c.code}] {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Results Summary Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-[11px] text-gray-500">
          <span>
            Showing <strong>{filteredRoster.length}</strong> enrolled students
            {selectedCourseId !== "ALL" && (
              <> in <strong>{allCourses.find((c) => c.id === selectedCourseId)?.title}</strong></>
            )}
          </span>
          {(searchQuery || completionFilter !== "ALL" || countryFilter !== "ALL") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setCompletionFilter("ALL");
                setCountryFilter("ALL");
              }}
              className="text-[#7F3D59] hover:underline font-bold"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-3xl border border-[#EAD7E0] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7F3D59] mx-auto mb-2"></div>
            Loading enrolled course roster...
          </div>
        ) : filteredRoster.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500 space-y-2">
            <p className="font-semibold text-gray-700">No students found matching your filter criteria.</p>
            <p>Try clearing your search query or selecting another masterclass.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-[#FDF8F9]">
                <tr>
                  <th className="px-5 py-3.5 text-left font-bold text-gray-700 uppercase tracking-wider">
                    Founder / Student
                  </th>
                  <th className="px-5 py-3.5 text-left font-bold text-gray-700 uppercase tracking-wider">
                    Masterclass Track
                  </th>
                  <th className="px-5 py-3.5 text-left font-bold text-gray-700 uppercase tracking-wider">
                    Curriculum Progress
                  </th>
                  <th className="px-5 py-3.5 text-left font-bold text-gray-700 uppercase tracking-wider">
                    Course Quizzes
                  </th>
                  <th className="px-5 py-3.5 text-left font-bold text-gray-700 uppercase tracking-wider">
                    Enrollment Type
                  </th>
                  <th className="px-5 py-3.5 text-right font-bold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredRoster.map((item) => (
                  <tr key={item.enrollmentId} className="hover:bg-gray-50/70 transition-colors">
                    {/* Student Identity */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#7F3D59] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {item.studentName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => setInspectStudentId(item.userId)}
                            className="font-bold text-gray-900 hover:text-[#7F3D59] hover:underline text-left block"
                          >
                            {item.studentName}
                          </button>
                          <span className="text-[11px] text-gray-400 block font-mono">{item.email}</span>
                          <span className="text-[10px] text-gray-500 block">
                            [{item.country}] {item.organization} • {item.businessStage}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Masterclass Track */}
                    <td className="px-5 py-4">
                      <span className="font-serif font-bold text-gray-800 block truncate max-w-xs">
                        {item.courseTitle}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        Active: {new Date(item.lastAccess).toLocaleDateString()}
                      </span>
                    </td>

                    {/* Progress */}
                    <td className="px-5 py-4">
                      <div className="space-y-1 w-32">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-gray-500">Rate:</span>
                          <span className="text-[#7F3D59] font-mono">{item.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              item.progress >= 100 ? "bg-emerald-600" : "bg-[#7F3D59]"
                            }`}
                            style={{ width: `${item.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>

                    {/* Course Quizzes */}
                    <td className="px-5 py-4">
                      <span className="font-bold text-gray-800 block font-mono">
                        {item.passedQuizzesCount} of {item.totalCourseQuizzes} Passed
                      </span>
                      {item.certificateNumber ? (
                        <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                          <Award className="w-3 h-3 text-[#D4AF37]" />
                          <span>Certified</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400">In Progress</span>
                      )}
                    </td>

                    {/* Enrollment Type */}
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FDF8F9] text-[#7F3D59] border border-[#EAD7E0]">
                        {item.gateway}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setInspectStudentId(item.userId)}
                        className="px-3 py-1 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-lg text-[10px] font-bold transition-all shadow-2xs"
                      >
                        View 360° Profile
                      </button>

                      <button
                        type="button"
                        onClick={() => handleFastSetProgress(item.enrollmentId, 100)}
                        disabled={item.progress >= 100}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold border border-emerald-200 disabled:opacity-40"
                        title="Mark course as 100% completed"
                      >
                        Set 100%
                      </button>

                      <button
                        type="button"
                        onClick={() => handleFastUnenroll(item.enrollmentId, item.studentName)}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[10px] font-bold border border-red-200"
                        title="Unenroll student from this course"
                      >
                        Unenroll
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ENROLL STUDENT MODAL */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-200 space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-serif font-bold text-gray-900">Enroll Student into Course</h3>
                <p className="text-[11px] text-gray-500">Assign an existing student account to any masterclass.</p>
              </div>
              <button
                onClick={() => setIsEnrollModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-800 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEnrollSubmit} className="space-y-4">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Select Student *</label>
                <select
                  required
                  value={enrollTargetUserId}
                  onChange={(e) => setEnrollTargetUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FDF8F9] border border-gray-300 rounded-xl text-xs font-medium"
                >
                  <option value="">Choose a student...</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || "Anonymous"} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Masterclass *</label>
                <select
                  required
                  value={enrollTargetCourseId}
                  onChange={(e) => setEnrollTargetCourseId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FDF8F9] border border-gray-300 rounded-xl text-xs font-bold text-[#7F3D59]"
                >
                  {allCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enrollSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#7F3D59] hover:bg-[#5E2C41] text-white font-bold transition-all disabled:opacity-50"
                >
                  {enrollSubmitting ? "Enrolling..." : "Enroll Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
