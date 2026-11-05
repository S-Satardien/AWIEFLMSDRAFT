"use client";

import { useState } from "react";
import { saveAdminCourse, deleteAdminCourse } from "./actions";

interface CourseManagementTabProps {
  courses: any[];
  onRefresh: () => void;
}

/**
 * Self-service course management and curriculum builder for AWIEF administrators.
 * Enables non-technical staff to author new commercial masterclasses, edit pricing (ZAR/USD),
 * configure faculty author royalties, and toggle between Native Modules and SCORM packages.
 *
 * @param {CourseManagementTabProps} props - Component properties.
 * @returns {JSX.Element} The rendered course builder.
 */
export default function CourseManagementTab({ courses, onRefresh }: CourseManagementTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const initialForm = {
    id: "",
    title: "",
    category: "Masterclass",
    duration: "2.5 Hours",
    priceZar: 1850,
    priceUsd: 105,
    isFree: false,
    authorName: "",
    authorRole: "",
    authorEmail: "",
    authorBio: "",
    royaltyRate: 35,
    shortDescription: "",
    description: "",
    isNative: true,
    isPublished: true,
  };

  const [formData, setFormData] = useState(initialForm);

  const handleStartCreate = () => {
    setSelectedCourse(null);
    setFormData({
      ...initialForm,
      id: `course-${Date.now()}`
    });
    setIsEditing(true);
    setMsg(null);
  };

  const handleStartEdit = (c: any) => {
    setSelectedCourse(c);
    setFormData({
      id: c.id,
      title: c.title || "",
      category: c.category || "Masterclass",
      duration: c.duration || "Self-Paced",
      priceZar: c.priceZar || 0,
      priceUsd: c.priceUsd || 0,
      isFree: Boolean(c.isFree),
      authorName: c.authorName || c.instructor || "",
      authorRole: c.authorRole || c.instructorRole || "",
      authorEmail: c.authorEmail || "",
      authorBio: c.authorBio || "",
      royaltyRate: c.royaltyRate || 35,
      shortDescription: c.shortDescription || "",
      description: c.description || "",
      isNative: c.isNative ?? true,
      isPublished: c.isPublished ?? true,
    });
    setIsEditing(true);
    setMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMsg(null);

    try {
      const res = await saveAdminCourse(formData);
      if (res.success) {
        setMsg({ text: "Masterclass successfully saved!", type: "success" });
        setIsEditing(false);
        onRefresh();
      } else {
        setMsg({ text: res.error || "Failed to save course.", type: "error" });
      }
    } catch (err: any) {
      setMsg({ text: err.message || "An unexpected error occurred.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm("Are you sure you want to remove this masterclass from the active catalogue?")) return;
    try {
      const res = await deleteAdminCourse(courseId);
      if (res.success) {
        onRefresh();
      } else {
        alert(res.error || "Failed to remove course.");
      }
    } catch (e: any) {
      alert(e.message || "An error occurred.");
    }
  };

  return (
    <div className="space-y-6">
      {msg && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold ${
            msg.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Header & Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#EAD7E0] shadow-xs">
        <div>
          <h3 className="text-xl font-serif font-bold text-gray-900">
            Course Management &amp; Self-Service Curriculum Builder
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Author and configure commercial masterclasses, set author royalty rates, and publish bite-sized curricula without code deployments.
          </p>
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={handleStartCreate}
            className="px-5 py-2.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 self-start sm:self-auto shrink-0"
          >
            <span>+ Create New Masterclass</span>
          </button>
        )}
      </div>

      {/* Editor Form Modal / Inline */}
      {isEditing && (
        <div className="bg-white p-8 rounded-2xl border-2 border-[#7F3D59]/40 shadow-lg space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h4 className="text-lg font-serif font-bold text-gray-900">
                {selectedCourse ? `Edit Masterclass: ${formData.title}` : "Author New Commercial Masterclass"}
              </h4>
              <p className="text-xs text-gray-500">Configure curriculum attributes, author payout terms, and pricing.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-xs text-gray-400 hover:text-gray-800 font-bold"
            >
              Cancel ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700">Course Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Venture Debt &amp; Working Capital Governance"
                  className="mt-1 block w-full px-3.5 py-2 text-xs border border-gray-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g. Investment Readiness, Trade & AfCFTA"
                  className="mt-1 block w-full px-3.5 py-2 text-xs border border-gray-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700">Estimated Duration</label>
                <input
                  type="text"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="e.g. 2.5 Hours (5 Modules)"
                  className="mt-1 block w-full px-3.5 py-2 text-xs border border-gray-300 rounded-xl"
                />
              </div>
            </div>

            {/* Pricing & Commercial Terms */}
            <div className="bg-[#FDF8F9] p-4 rounded-xl border border-[#EAD7E0] space-y-4">
              <h5 className="text-xs font-bold uppercase tracking-wider text-[#7F3D59]">
                Commercial Pricing &amp; Author Royalty Terms
              </h5>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isFree"
                  checked={formData.isFree}
                  onChange={(e) => setFormData({ ...formData, isFree: e.target.checked })}
                  className="rounded border-gray-300 text-[#7F3D59]"
                />
                <label htmlFor="isFree" className="text-xs font-bold text-gray-800">
                  Free / Partner-Sponsored Masterclass (Tuition: R0.00)
                </label>
              </div>

              {!formData.isFree && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700">Tuition Price (ZAR)</label>
                    <input
                      type="number"
                      value={formData.priceZar}
                      onChange={(e) => setFormData({ ...formData, priceZar: parseInt(e.target.value, 10) || 0 })}
                      className="mt-1 block w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700">Tuition Price (USD)</label>
                    <input
                      type="number"
                      value={formData.priceUsd}
                      onChange={(e) => setFormData({ ...formData, priceUsd: parseInt(e.target.value, 10) || 0 })}
                      className="mt-1 block w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700">Author Royalty Share (%)</label>
                    <input
                      type="number"
                      value={formData.royaltyRate}
                      onChange={(e) => setFormData({ ...formData, royaltyRate: parseInt(e.target.value, 10) || 0 })}
                      className="mt-1 block w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Author Profile */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700">Faculty Author Name</label>
                <input
                  type="text"
                  value={formData.authorName}
                  onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                  placeholder="e.g. Nomsa Dlamini"
                  className="mt-1 block w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700">Author Professional Role</label>
                <input
                  type="text"
                  value={formData.authorRole}
                  onChange={(e) => setFormData({ ...formData, authorRole: e.target.value })}
                  placeholder="e.g. Lead Syndicate Principal"
                  className="mt-1 block w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700">Author Email</label>
                <input
                  type="email"
                  value={formData.authorEmail}
                  onChange={(e) => setFormData({ ...formData, authorEmail: e.target.value })}
                  placeholder="nomsa@syndicate.africa"
                  className="mt-1 block w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
                />
              </div>
            </div>

            {/* Descriptions */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700">Short Synopsis</label>
                <textarea
                  rows={2}
                  value={formData.shortDescription}
                  onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                  placeholder="Brief summary for catalogue preview cards..."
                  className="mt-1 block w-full p-2.5 text-xs border border-gray-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700">Full Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed pedagogical narrative and learning outcomes..."
                  className="mt-1 block w-full p-2.5 text-xs border border-gray-300 rounded-xl"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-6 pt-2 border-t border-gray-100">
              <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.isNative}
                  onChange={(e) => setFormData({ ...formData, isNative: e.target.checked })}
                  className="rounded border-gray-300 text-[#7F3D59]"
                />
                <span>Native Bite-Sized Modules (Unchecked = Legacy SCORM Package)</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                  className="rounded border-gray-300 text-[#7F3D59]"
                />
                <span>Published in Live Catalogue</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-700 font-bold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50"
              >
                {isSaving ? "Saving Masterclass..." : "Save Masterclass"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Courses List Table */}
      <div className="bg-white rounded-2xl border border-[#EAD7E0] shadow-xs overflow-hidden">
        <div className="p-6 border-b border-[#EAD7E0] flex items-center justify-between">
          <div>
            <h4 className="text-base font-serif font-bold text-gray-900">
              Live Course Catalogue ({courses.length} Masterclasses)
            </h4>
            <p className="text-xs text-gray-500">Manage pricing, delivery format, and editorial metadata.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FDF8F9] border-b border-[#EAD7E0] text-[11px] font-bold uppercase tracking-wider text-[#7F3D59]">
              <tr>
                <th className="py-3 px-4">Masterclass Title</th>
                <th className="py-3 px-4">Author / Faculty</th>
                <th className="py-3 px-4 text-center">Format</th>
                <th className="py-3 px-4 text-right">Tuition</th>
                <th className="py-3 px-4 text-center">Royalty</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3 px-4 font-bold text-gray-900 max-w-xs">
                    <p className="line-clamp-1">{c.title}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{c.id}</p>
                  </td>
                  <td className="py-3 px-4 text-gray-700">
                    <p className="font-semibold">{c.authorName || c.instructor || "AWIEF Faculty"}</p>
                    <p className="text-[10px] text-gray-400">{c.authorRole || c.instructorRole || "Practitioner"}</p>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {c.isNative ? (
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                        Native Modules
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 text-[10px] font-bold border border-purple-200">
                        SCORM Package
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-gray-800">
                    {c.isFree ? "Free" : `R${c.priceZar?.toLocaleString()} / $${c.priceUsd}`}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-[#7F3D59]">
                    {c.royaltyRate ? `${c.royaltyRate}%` : "—"}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.isPublished
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {c.isPublished ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(c)}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-[11px] font-bold"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-[11px] font-bold"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
