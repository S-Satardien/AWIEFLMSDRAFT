"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  parseLearnDashExportAction,
  importLearnDashCourseAction,
} from "./actions";
import type { ParsedLearnDashCourse } from "@/lib/learndashImporter";
import {
  Upload,
  FileUp,
  X,
  CheckCircle2,
  BookOpen,
  HelpCircle,
  Video,
  Download,
  AlertTriangle,
  Sparkles,
} from "@/components/Icons";

interface LearnDashImportModalProps {
  onClose: () => void;
  onImported: (courseId: string) => void;
}

/**
 * LearnDash Course Importer Wizard.
 * Parses WordPress/LearnDash WXR XML (.xml), LearnDash JSON (.json), or LearnDash Export Bundles (.zip),
 * previews the extracted modules, sub-topics, video embeds, learning objectives, and quizzes,
 * and imports them directly into the AWIEF Digital Learning Academy database.
 *
 * @param {LearnDashImportModalProps} props - Component properties.
 * @returns {JSX.Element} The rendered LearnDash import modal.
 */
export default function LearnDashImportModal({
  onClose,
  onImported,
}: LearnDashImportModalProps) {
  const [step, setStep] = useState<"UPLOAD" | "PREVIEW" | "DONE">("UPLOAD");
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");

  const [parsedCourses, setParsedCourses] = useState<ParsedLearnDashCourse[]>([]);
  const [selectedCourseIdx, setSelectedCourseIdx] = useState<number>(0);

  // Editable import overrides
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Masterclass");
  const [authorName, setAuthorName] = useState("");
  const [authorRole, setAuthorRole] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [priceZar, setPriceZar] = useState(1850);
  const [priceUsd, setPriceUsd] = useState(105);
  const [royaltyRate, setRoyaltyRate] = useState(35);
  const [isPublished, setIsPublished] = useState(true);

  const [importedResult, setImportedResult] = useState<{
    courseId: string;
    quizCount: number;
  } | null>(null);

  const applySelectedCourseDefaults = (course: ParsedLearnDashCourse) => {
    setTitle(course.title || "Imported Masterclass");
    setCategory(course.category || "Masterclass");
    setAuthorName(course.authorName || "AWIEF Faculty");
    setAuthorRole(course.authorRole || "Course Author");
    setAuthorEmail(course.authorEmail || "");
    setIsFree(course.isFree);
    setPriceZar(course.priceZar || 1850);
    setPriceUsd(course.priceUsd || 105);
    setRoyaltyRate(35);
    setIsPublished(true);
  };

  const handleFileUpload = async (file: File) => {
    setErrorMsg(null);
    if (file.size > 80 * 1024 * 1024) {
      setErrorMsg("This package file exceeds 80 MB. Please upload a smaller archive.");
      return;
    }
    setIsParsing(true);
    setUploadedFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/import-package", {
        method: "POST",
        body: formData,
      });
      const res = await response.json();

      if (!response.ok || !res.success || !res.courses || res.courses.length === 0) {
        setErrorMsg(res.error || "Could not extract any courses from that file.");
        return;
      }

      setParsedCourses(res.courses);
      setSelectedCourseIdx(0);
      applySelectedCourseDefaults(res.courses[0]);
      setStep("PREVIEW");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to read the uploaded file.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleLoadSample = async (kind: "learndash" | "scorm" = "learndash") => {
    setErrorMsg(null);
    setIsParsing(true);
    setUploadedFileName(
      kind === "scorm" ? "sample-scorm-imsmanifest.xml" : "sample-learndash-export.xml"
    );

    try {
      const res = await parseLearnDashExportAction({ useSample: kind });
      if (!res.success || !res.courses || res.courses.length === 0) {
        setErrorMsg(res.error || "Failed to load sample course export.");
        return;
      }
      setParsedCourses(res.courses);
      setSelectedCourseIdx(0);
      applySelectedCourseDefaults(res.courses[0]);
      setStep("PREVIEW");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to parse sample export.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleDownloadSampleXml = async () => {
    const res = await parseLearnDashExportAction({ useSample: true });
    if (!res.sampleXml) return;
    const blob = new Blob([res.sampleXml], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "awief-sample-learndash-export.xml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const activeCourse = parsedCourses[selectedCourseIdx];

  const handleConfirmImport = async () => {
    if (!activeCourse) return;
    setErrorMsg(null);
    setIsImporting(true);

    try {
      const res = await importLearnDashCourseAction(activeCourse, {
        title,
        category,
        authorName,
        authorRole,
        authorEmail,
        isFree,
        priceZar: Number(priceZar) || 0,
        priceUsd: Number(priceUsd) || 0,
        royaltyRate: Number(royaltyRate) || 35,
        isPublished,
      });

      if (!res.success || !res.courseId) {
        setErrorMsg(res.error || "Failed to import LearnDash course.");
        return;
      }

      setImportedResult({
        courseId: res.courseId,
        quizCount: res.quizCount || 0,
      });
      setStep("DONE");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Unexpected error during import.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-[#EAD7E0]"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-[#1D0B14] text-white flex items-center justify-between shrink-0 border-b border-[#3E1A29]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">
              Course Package Migration &amp; Importer
            </span>
            <h3 className="text-lg font-serif font-bold text-white mt-0.5">
              Import Course from LearnDash or SCORM Package
            </h3>
            <p className="text-[11px] text-gray-300">
              Supports SCORM 1.2 / 2004 (.zip / imsmanifest.xml), WordPress LearnDash WXR XML (.xml), JSON (.json), and Export Bundles (.zip).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close importer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD */}
          {step === "UPLOAD" && (
            <div className="space-y-5">
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="block border-2 border-dashed border-[#7F3D59]/40 hover:border-[#7F3D59] bg-[#FDF8F9] rounded-2xl p-8 text-center cursor-pointer transition-colors space-y-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#7F3D59]/10 text-[#7F3D59] flex items-center justify-center mx-auto">
                  <FileUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-serif font-bold text-gray-900">
                    {isParsing
                      ? `Unpacking & Parsing ${uploadedFileName}...`
                      : "Drop your SCORM (.zip) or LearnDash export file here, or click to browse"}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Accepts SCORM 1.2 / 2004 (.zip / imsmanifest.xml), WordPress LearnDash (.xml), or JSON (.json) up to 80 MB
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#7F3D59] text-white rounded-xl font-bold shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Select Package or Export File</span>
                </span>
                <input
                  type="file"
                  accept=".xml,.json,.zip"
                  disabled={isParsing}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  className="hidden"
                />
              </label>

              {/* How it maps + Test Sample Strip */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-gray-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>What gets populated automatically?</span>
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Manifest metadata, lessons, modules, sub-topics, embedded videos &amp; documents, interactive launchers, learning objectives, and quizzes populate automatically.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200">
                  <button
                    type="button"
                    disabled={isParsing}
                    onClick={() => handleLoadSample("learndash")}
                    className="px-3.5 py-2 bg-white hover:bg-[#FDF8F9] text-[#7F3D59] border border-[#7F3D59]/30 rounded-xl font-bold transition-colors"
                  >
                    Try Sample LearnDash Export
                  </button>
                  <button
                    type="button"
                    disabled={isParsing}
                    onClick={() => handleLoadSample("scorm")}
                    className="px-3.5 py-2 bg-white hover:bg-[#FDF8F9] text-[#7F3D59] border border-[#7F3D59]/30 rounded-xl font-bold transition-colors"
                  >
                    Try Sample SCORM Manifest
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSampleXml}
                    className="px-3.5 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl font-bold inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Sample .XML</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & CONFIGURE */}
          {step === "PREVIEW" && activeCourse && (
            <div className="space-y-5">
              {/* Multi-course selector if XML had multiple */}
              {parsedCourses.length > 1 && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
                  <span className="font-bold text-amber-900">
                    {parsedCourses.length} courses detected in {uploadedFileName}:
                  </span>
                  <select
                    value={selectedCourseIdx}
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      setSelectedCourseIdx(idx);
                      applySelectedCourseDefaults(parsedCourses[idx]);
                    }}
                    className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-bold text-gray-900"
                  >
                    {parsedCourses.map((c, idx) => (
                      <option key={idx} value={idx}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Warnings if any */}
              {activeCourse.warnings.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                  <p className="font-bold">Package Extraction Notes:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {activeCourse.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-[#FDF8F9] border border-[#EAD7E0]">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">
                    Source Package ID
                  </span>
                  <span className="font-mono font-bold text-[#7F3D59] break-all">
                    {activeCourse.learndashSourceId}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#FDF8F9] border border-[#EAD7E0]">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">
                    Modules Extracted
                  </span>
                  <span className="font-serif font-bold text-gray-900">
                    {activeCourse.modules.length} Modules
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#FDF8F9] border border-[#EAD7E0]">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">
                    Objectives
                  </span>
                  <span className="font-serif font-bold text-gray-900">
                    {activeCourse.learningObjectives.length} Items
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#FDF8F9] border border-[#EAD7E0]">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">
                    Quizzes Detected
                  </span>
                  <span className="font-serif font-bold text-emerald-700">
                    {activeCourse.quizzes.length} (
                    {activeCourse.quizzes.reduce((a, q) => a + q.questions.length, 0)} Qs)
                  </span>
                </div>
              </div>

              {/* Editable Commercial & Metadata Fields */}
              <div className="p-4 rounded-2xl border border-[#EAD7E0] space-y-3">
                <h4 className="font-bold text-[#7F3D59] uppercase tracking-wider text-[11px]">
                  Confirm Course Details &amp; Commercial Terms
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-gray-700 mb-1">Course Title *</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Category</label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Faculty Author Name</label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Author Role</label>
                    <input
                      type="text"
                      value={authorRole}
                      onChange={(e) => setAuthorRole(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Author Royalty (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={royaltyRate}
                      onChange={(e) => setRoyaltyRate(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-5 pt-2">
                  <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFree}
                      onChange={(e) => setIsFree(e.target.checked)}
                      className="rounded border-gray-300 text-[#7F3D59]"
                    />
                    <span>Free / Sponsored Masterclass</span>
                  </label>
                  <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      className="rounded border-gray-300 text-[#7F3D59]"
                    />
                    <span>Publish Immediately</span>
                  </label>
                </div>

                {!isFree && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Price (ZAR)</label>
                      <input
                        type="number"
                        value={priceZar}
                        onChange={(e) => setPriceZar(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Price (USD)</label>
                      <input
                        type="number"
                        value={priceUsd}
                        onChange={(e) => setPriceUsd(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modules & Quizzes Preview */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-bold text-gray-800 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#7F3D59]" />
                    <span>Extracted Curriculum Preview</span>
                  </h4>
                  {activeCourse.scormPath && (
                    <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-mono text-[10px]">
                      Interactive Entrypoint: {activeCourse.scormPath}
                    </span>
                  )}
                </div>
                <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                  {activeCourse.modules.map((m, idx) => (
                    <div
                      key={m.id || idx}
                      className="p-3 rounded-xl bg-[#FDF8F9] border border-[#EAD7E0] space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-gray-900">{m.title}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {m.videoUrl && (
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold inline-flex items-center gap-1">
                              <Video className="w-3 h-3" /> Video
                            </span>
                          )}
                          {m.attachedQuizIndex !== undefined && (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold inline-flex items-center gap-1">
                              <HelpCircle className="w-3 h-3" /> Quiz
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-600 line-clamp-1">{m.summary}</p>
                      {m.topics && m.topics.length > 0 && (
                        <p className="text-[10px] text-[#7F3D59] font-semibold">
                          Topics: {m.topics.map((t) => t.title).join(" • ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DONE */}
          {step === "DONE" && importedResult && (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-serif font-bold text-gray-900">
                  {activeCourse?.sourceFormat === "SCORM_PACKAGE"
                    ? "SCORM Course Package Imported!"
                    : "LearnDash Course Successfully Imported!"}
                </h4>
                <p className="text-gray-600 max-w-md mx-auto">
                  <strong>{title}</strong> is now live in AWIEF Academy with{" "}
                  <strong>{activeCourse?.modules.length || 0} modules</strong> and{" "}
                  <strong>{importedResult.quizCount} linked assessments</strong>.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onImported(importedResult.courseId)}
                  className="px-6 py-2.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl font-bold shadow-md"
                >
                  Open Imported Course Workspace →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== "DONE" && (
          <div className="px-6 py-4 bg-[#FDF8F9] border-t border-[#EAD7E0] flex items-center justify-between shrink-0">
            {step === "PREVIEW" ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setStep("UPLOAD");
                    setErrorMsg(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-bold text-gray-700 bg-white"
                >
                  ← Choose Another File
                </button>
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={handleConfirmImport}
                  className="px-6 py-2.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl font-bold shadow-md disabled:opacity-50"
                >
                  {isImporting ? "Importing Course..." : "Import Masterclass into Academy"}
                </button>
              </>
            ) : (
              <div className="w-full flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-bold text-gray-700 bg-white"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
