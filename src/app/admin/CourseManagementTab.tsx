"use client";

import { useState } from "react";
import { deleteAdminCourse } from "./actions";
import CourseBuilder from "./CourseBuilder";
import LearnDashImportModal from "./LearnDashImportModal";
import {
  Plus,
  Pencil,
  Trash2,
  HelpCircle,
  Eye,
  Upload,
} from "@/components/Icons";

interface CourseSummary {
  id: string;
  title: string;
  category?: string | null;
  authorName?: string | null;
  instructor?: string | null;
  learndashSourceId?: string | null;
  modulesJson?: string | null;
  isPublished?: boolean;
  isNative?: boolean;
  isFree?: boolean;
  priceZar?: number;
  priceUsd?: number;
  royaltyRate?: number;
}

interface CourseManagementTabProps {
  courses: CourseSummary[];
  onRefresh: () => void | Promise<void>;
  onManageCourseQuizzes?: (courseId: string) => void;
  onSelectCourse?: (course: CourseSummary) => void;
  onCourseCreatedOrImported?: (courseId: string) => void;
}

/**
 * Self-service course management, LearnDash-style curriculum builder,
 * and LearnDash export importer for AWIEF administrators.
 *
 * @param {CourseManagementTabProps} props - Component properties.
 * @returns {JSX.Element} The rendered course builder and catalogue manager.
 */
export default function CourseManagementTab({
  courses,
  onRefresh,
  onManageCourseQuizzes,
  onSelectCourse,
  onCourseCreatedOrImported,
}: CourseManagementTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseSummary | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleStartCreate = () => {
    setEditingCourse(null);
    setIsEditing(true);
    setMsg(null);
  };

  const handleStartEdit = (c: CourseSummary) => {
    setEditingCourse(c);
    setIsEditing(true);
    setMsg(null);
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm("Are you sure you want to remove this masterclass from the active catalogue?"))
      return;
    try {
      const res = await deleteAdminCourse(courseId);
      if (res.success) {
        setMsg({ text: "Masterclass removed from catalogue.", type: "success" });
        await onRefresh();
      } else {
        alert(res.error || "Failed to remove course.");
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "An error occurred.");
    }
  };

  const handleBuilderSaved = async (savedCourseId: string) => {
    setIsEditing(false);
    setEditingCourse(null);
    setMsg({ text: "Masterclass and curriculum saved successfully!", type: "success" });
    await onRefresh();
    if (onCourseCreatedOrImported) {
      onCourseCreatedOrImported(savedCourseId);
    }
  };

  const handleImported = async (importedCourseId: string) => {
    setIsImportModalOpen(false);
    setMsg({ text: "LearnDash course imported into the Academy!", type: "success" });
    await onRefresh();
    if (onCourseCreatedOrImported) {
      onCourseCreatedOrImported(importedCourseId);
    }
  };

  return (
    <div className="space-y-6">
      {isImportModalOpen && (
        <LearnDashImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImported={handleImported}
        />
      )}

      {msg && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold ${
            msg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Header & Primary Creation / Import Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#EAD7E0] shadow-xs">
        <div>
          <h3 className="text-xl font-serif font-bold text-gray-900">
            Masterclasses &amp; Curriculum Studio
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Author structured courses with modules, learning objectives, and quizzes, or import directly from a LearnDash export.
          </p>
        </div>

        {!isEditing && (
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="px-4 py-2.5 bg-[#FDF8F9] hover:bg-[#EAD7E0]/60 text-[#7F3D59] border border-[#7F3D59]/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import LearnDash / SCORM</span>
            </button>

            <button
              type="button"
              onClick={handleStartCreate}
              className="px-5 py-2.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Masterclass</span>
            </button>
          </div>
        )}
      </div>

      {/* LearnDash-Inspired Course Builder */}
      {isEditing && (
        <CourseBuilder
          key={editingCourse?.id || "new-course"}
          course={editingCourse}
          onCancel={() => {
            setIsEditing(false);
            setEditingCourse(null);
          }}
          onSaved={handleBuilderSaved}
        />
      )}

      {/* Compact Courses Table (Zero Horizontal Scroll) */}
      <div className="bg-white rounded-2xl border border-[#EAD7E0] shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EAD7E0] flex items-center justify-between bg-[#FDF8F9]">
          <div>
            <h4 className="text-base font-serif font-bold text-gray-900">
              Course Catalogue ({courses.length} Masterclasses)
            </h4>
            <p className="text-xs text-gray-500">
              Click any course to open its curriculum workspace, or edit modules and pricing.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FDF8F9] border-b border-[#EAD7E0] text-[11px] font-bold uppercase tracking-wider text-[#7F3D59]">
              <tr>
                <th className="py-3 px-4">Masterclass &amp; Author</th>
                <th className="py-3 px-3">Format &amp; Status</th>
                <th className="py-3 px-3 text-right">Tuition &amp; Split</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {courses.map((c) => {
                let moduleCount = 0;
                try {
                  const parsed = c.modulesJson ? JSON.parse(c.modulesJson) : [];
                  if (Array.isArray(parsed)) moduleCount = parsed.length;
                } catch {
                  moduleCount = 0;
                }

                return (
                  <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 px-4 align-top">
                      <div className="space-y-1">
                        {onSelectCourse ? (
                          <button
                            type="button"
                            onClick={() => onSelectCourse(c)}
                            className="text-left font-serif font-bold text-sm text-[#7F3D59] hover:underline leading-snug"
                          >
                            {c.title}
                          </button>
                        ) : (
                          <p className="font-serif font-bold text-sm text-gray-900 leading-snug">
                            {c.title}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                          <span className="font-semibold text-gray-700">
                            {c.authorName || c.instructor || "AWIEF Faculty"}
                          </span>
                          <span>•</span>
                          <span>{c.category || "Masterclass"}</span>
                          {moduleCount > 0 && (
                            <>
                              <span>•</span>
                              <span>{moduleCount} Modules</span>
                            </>
                          )}
                          {c.learndashSourceId && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-mono font-bold">
                              {c.learndashSourceId}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 align-top">
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.isPublished
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {c.isPublished ? "Published" : "Draft"}
                        </span>
                        {c.isNative ? (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-semibold border border-amber-200">
                            Native Modules
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 text-[10px] font-semibold border border-purple-200">
                            Interactive Workshop
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-right align-top">
                      <p className="font-mono font-bold text-gray-900">
                        {c.isFree ? "Free" : `R${c.priceZar?.toLocaleString()} / $${c.priceUsd}`}
                      </p>
                      <p className="text-[10px] font-mono font-semibold text-[#7F3D59] mt-0.5">
                        {c.isFree ? "Sponsored" : `${c.royaltyRate || 35}% Author Split`}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 text-right align-top">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {onSelectCourse && (
                          <button
                            type="button"
                            onClick={() => onSelectCourse(c)}
                            className="px-2.5 py-1 bg-[#7F3D59]/10 hover:bg-[#7F3D59]/20 text-[#7F3D59] rounded-lg text-[11px] font-bold inline-flex items-center gap-1"
                            title="Open Course Workspace"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Workspace</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(c)}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-[11px] font-bold inline-flex items-center gap-1"
                          title="Edit Masterclass & Curriculum"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        {onManageCourseQuizzes && (
                          <button
                            type="button"
                            onClick={() => onManageCourseQuizzes(c.id)}
                            className="px-2.5 py-1 bg-[#FDF8F9] hover:bg-[#EAD7E0] text-[#7F3D59] border border-[#7F3D59]/30 rounded-lg text-[11px] font-bold inline-flex items-center gap-1"
                            title="Manage Quizzes for this Course"
                          >
                            <HelpCircle className="w-3 h-3" />
                            <span>Quizzes</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[11px] font-bold inline-flex items-center"
                          title="Remove Masterclass"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
