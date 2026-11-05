'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getEnrollmentId,
  getScormState,
  setScormState,
  getCourseDetails,
  updateNativeModuleProgress,
} from './actions';
import {
  addReviewComment,
  getCourseReviewComments,
  updateReviewComment,
  deleteReviewComment,
} from './reviewActions';
import { Wifi, Zap, Award, Check, Mic, Globe, Download, X } from 'lucide-react';

interface ModuleData {
  id: string;
  title: string;
  duration: string;
  videoUrl?: string;
  summary: string;
  topics?: string[];
  caseStudy?: {
    title: string;
    founder?: string;
    country?: string;
    summary?: string;
    keyTakeaway?: string;
  };
  practicalTemplate?: {
    title: string;
    format: string;
    content?: string;
  };
  quiz?: {
    title: string;
    questionCount: number;
    questions?: Array<{
      id: string;
      question: string;
      options: string[];
      correctAnswer: number;
      explanation: string;
    }>;
  };
}

/**
 * Hybrid Course Player supporting both Native Bite-Sized Modular Masterclasses
 * and legacy SCORM 1.2 / 2004 interactive packages.
 * Includes low-bandwidth data saver mode, downloadable practical business templates,
 * inline module quick-checks, and reviewer annotation sidebars.
 *
 * @returns {JSX.Element} The rendered course player.
 */
export default function CoursePlayerPage() {
  const { data: session } = useSession();
  const params = useParams();
  const searchParams = useSearchParams();
  const isReviewMode = searchParams.get('mode') === 'review';

  const [course, setCourse] = useState<any>(null);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isScormReady, setIsScormReady] = useState(false);
  const scormStateRef = useRef<Record<string, string>>({});

  // Native player states
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [completedModules, setCompletedModules] = useState<string[]>([]);
  const [isLowBandwidth, setIsLowBandwidth] = useState(false);
  const [quickCheckAnswers, setQuickCheckAnswers] = useState<Record<string, number>>({});
  const [quickCheckSubmitted, setQuickCheckSubmitted] = useState<Record<string, boolean>>({});

  // Review Mode State
  const [comments, setComments] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(isReviewMode);
  const [reviewContext, setReviewContext] = useState<{ text: string; hash: string } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);

  const refreshComments = async () => {
    if (!params.id) return;
    const fetched = await getCourseReviewComments(params.id as string);
    setComments(fetched);
  };

  // Expose SCORM API for legacy packages
  useEffect(() => {
    (window as any).API_1484_11 = {
      Initialize: () => "true",
      Terminate: () => "true",
      GetValue: (element: string) => scormStateRef.current[element] || "",
      SetValue: (element: string, value: string) => {
        scormStateRef.current[element] = value;
        if (enrollmentId) {
          setScormState(enrollmentId, element, value).catch(() => {});
        }
        return "true";
      },
      Commit: () => "true",
      GetLastError: () => "0",
      GetErrorString: () => "",
      GetDiagnostic: () => ""
    };

    (window as any).API = {
      LMSInitialize: () => "true",
      LMSFinish: () => "true",
      LMSGetValue: (element: string) => scormStateRef.current[element] || "",
      LMSSetValue: (element: string, value: string) => {
        scormStateRef.current[element] = value;
        if (enrollmentId) {
          setScormState(enrollmentId, element, value).catch(() => {});
        }
        return "true";
      },
      LMSCommit: () => "true",
      LMSGetLastError: () => "0",
      LMSGetErrorString: () => "",
      LMSGetDiagnostic: () => ""
    };
  }, [enrollmentId]);

  // Load course details and enrollment
  useEffect(() => {
    async function initCourse() {
      if (!params.id) return;
      const courseData = await getCourseDetails(params.id as string);
      setCourse(courseData);

      if (courseData?.modulesJson) {
        try {
          const parsed = JSON.parse(courseData.modulesJson);
          setModules(parsed);
        } catch (e) {
          console.error("Failed to parse modulesJson:", e);
        }
      }

      if (!session?.user?.id) {
        setIsScormReady(true);
        return;
      }

      const eId = await getEnrollmentId(session.user.id as string, params.id as string, true);
      if (eId) {
        setEnrollmentId(eId);
        const state = await getScormState(eId);
        scormStateRef.current = state;

        // Restore native completed modules
        if (state['awief.native.completed_modules']) {
          try {
            const completed = JSON.parse(state['awief.native.completed_modules']);
            setCompletedModules(completed);
          } catch (e) {}
        }

        const measure = parseFloat(state['cmi.progress_measure'] || '0');
        const pVal = Math.round(measure <= 1.0 ? measure * 100 : measure);
        setProgressPercent(pVal);

        if (
          state['cmi.completion_status'] === 'completed' ||
          state['cmi.core.lesson_status'] === 'completed' ||
          pVal >= 100
        ) {
          setIsCompleted(true);
        }
      }

      if (isReviewMode) {
        refreshComments();
      }
      setIsScormReady(true);
    }

    initCourse();
  }, [session, params.id, isReviewMode]);

  // Native module completion handler
  const handleCompleteCurrentModule = async () => {
    const currentModule = modules[activeModuleIndex];
    if (!currentModule || !enrollmentId) return;

    let updated = completedModules;
    if (!completedModules.includes(currentModule.id)) {
      updated = [...completedModules, currentModule.id];
      setCompletedModules(updated);
    }

    const res = await updateNativeModuleProgress(enrollmentId, updated, modules.length);
    setProgressPercent(res.progress);
    if (res.progress >= 100) {
      setIsCompleted(true);
    }

    // Advance to next module if available
    if (activeModuleIndex < modules.length - 1) {
      setActiveModuleIndex(activeModuleIndex + 1);
    }
  };

  // Download practical business template
  const handleDownloadTemplate = (template: any) => {
    const content = `
================================================================================
AWIEF DIGITAL LEARNING ACADEMY | PRACTICAL BUSINESS TEMPLATE
Course: ${course?.title || "AWIEF Masterclass"}
Module: ${modules[activeModuleIndex]?.title}
Template: ${template.title} (${template.format})
Date Generated: ${new Date().toLocaleDateString()}
Learner: ${session?.user?.name || session?.user?.email || "AWIEF Entrepreneur"}
================================================================================

1. EXECUTIVE OVERVIEW:
This institutional framework was synthesized for African women entrepreneurs to accelerate readiness for investor due diligence, commercial banking covenants, and AfCFTA cross-border trade compliance.

2. CORE FRAMEWORK SECTIONS:
- Section A: Corporate Governance & Legal Entity Verification
- Section B: 3-Year Audited/Management Cashflows & Working Capital Forecasts
- Section C: Product-Market Fit & Pan-African Unit Economics
- Section D: Capital Requirements, Pre-Money Valuation & Use of Proceeds

3. PRACTICAL ACTION STEPS:
[ ] Step 1: Populate all historical EBITDA and gross margin actuals.
[ ] Step 2: Assemble company incorporation papers, tax clearances, and AfCFTA certificates of origin.
[ ] Step 3: Present this completed document to your AWIEF mentor or investor relations lead.

(c) ${new Date().getFullYear()} Africa Women Innovation & Entrepreneurship Forum (AWIEF NPC). All rights reserved.
    `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_template.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Quick check answer handler
  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setQuickCheckAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleCheckQuestion = (questionId: string) => {
    setQuickCheckSubmitted((prev) => ({ ...prev, [questionId]: true }));
  };

  if (!course) {
    return (
      <div className="min-h-screen bg-[#1D0B14] text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-gray-300">Loading AWIEF Masterclass Engine...</p>
        </div>
      </div>
    );
  }

  const isNative = course.isNative && modules.length > 0;
  const currentModule = modules[activeModuleIndex];

  return (
    <div className="min-h-screen bg-[#1D0B14] text-gray-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="h-16 bg-[#16070E] border-b border-[#3E1A29] px-4 sm:px-6 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
          >
            <span>←</span>
            <span className="hidden sm:inline">My Academy</span>
          </Link>
          <div className="h-5 w-px bg-gray-800 hidden sm:block"></div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] bg-[#7F3D59]/40 px-2.5 py-1 rounded-full border border-[#D4AF37]/30 hidden md:inline">
              AWIEF Academy
            </span>
            <h1 className="text-sm sm:text-base font-serif font-bold text-white truncate max-w-xs sm:max-w-md lg:max-w-lg">
              {course.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Low Bandwidth Toggle */}
          {isNative && (
            <button
              onClick={() => setIsLowBandwidth(!isLowBandwidth)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 border ${
                isLowBandwidth
                  ? "bg-amber-900/60 text-amber-200 border-amber-500/50"
                  : "bg-white/10 text-gray-300 hover:text-white border-white/10"
              }`}
              title="Toggle Low-Bandwidth Mode for slower mobile connections"
            >
              {isLowBandwidth ? (
                <span className="flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-amber-300" />
                  <span>Low-Data Active (-90% Data)</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Full Media Mode</span>
                </span>
              )}
            </button>
          )}

          {/* Progress Pill */}
          <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full text-xs">
            <div className="w-16 bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#D4AF37] h-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <span className="font-mono text-[#D4AF37] font-bold">{progressPercent}%</span>
          </div>

          {/* Survey / Certificate CTA when complete */}
          {(isCompleted || progressPercent >= 100) && (
            <Link
              href={`/course/${course.id}/survey`}
              className="px-3.5 py-1.5 bg-[#D4AF37] hover:bg-[#B89628] text-[#1D0B14] font-serif font-bold text-xs rounded-full shadow-md transition-all animate-pulse inline-flex items-center gap-1.5"
            >
              <Award className="w-3.5 h-3.5 text-[#1D0B14]" />
              <span>Claim Verifiable Certificate →</span>
            </Link>
          )}

          {/* Review Mode Toggle (for Admin/Reviewer) */}
          {session?.user && ((session.user as any).role === 'ADMIN' || (session.user as any).role === 'REVIEWER') && (
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-[#7F3D59] hover:bg-[#5E2C41] text-white font-medium transition-colors"
            >
              {isSidebarOpen ? "Hide Reviewer Panel" : "Reviewer Annotations"}
            </button>
          )}
        </div>
      </header>

      {/* Main Player Body */}
      {isNative ? (
        /* NATIVE MODULAR PLAYER */
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Module Syllabus Sidebar */}
          <aside className="w-full md:w-80 lg:w-96 bg-[#16070E] border-r border-[#3E1A29] flex flex-col shrink-0 overflow-y-auto">
            <div className="p-4 border-b border-[#3E1A29]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Curriculum Syllabus</span>
                <span className="text-xs text-[#D4AF37] font-mono">{completedModules.length} / {modules.length} Done</span>
              </div>
              <p className="text-xs text-gray-500">20–30 min bite-sized entrepreneur modules</p>
            </div>

            <div className="divide-y divide-[#3E1A29]/60">
              {modules.map((m, idx) => {
                const isActive = idx === activeModuleIndex;
                const isDone = completedModules.includes(m.id);

                return (
                  <button
                    key={m.id || idx}
                    onClick={() => setActiveModuleIndex(idx)}
                    className={`w-full p-4 text-left transition-colors flex items-start gap-3 ${
                      isActive
                        ? "bg-[#7F3D59]/30 border-l-4 border-[#D4AF37]"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        isDone
                          ? "bg-emerald-600 text-white"
                          : isActive
                          ? "bg-[#D4AF37] text-[#1D0B14]"
                          : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      {isDone ? <Check className="w-3 h-3 text-white" /> : idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs text-gray-400 font-mono">Module {idx + 1}</span>
                        <span className="text-[11px] text-[#D4AF37] font-medium">{m.duration}</span>
                      </div>
                      <p className={`text-sm font-medium leading-snug line-clamp-2 ${isActive ? "text-white font-bold" : "text-gray-300"}`}>
                        {m.title}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Offline Auto-Save Status Badge */}
            <div className="mt-auto p-4 border-t border-[#3E1A29] bg-[#1D0B14]/60 text-[11px] text-gray-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Auto-Save Active (SQLite &amp; Cloud)</span>
              </span>
              <span className="font-mono text-gray-500">v2.0</span>
            </div>
          </aside>

          {/* Main Module Content Viewport */}
          <main className="flex-1 bg-[#1D0B14] overflow-y-auto p-6 lg:p-10 space-y-8">
            {currentModule ? (
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Module Header */}
                <div className="space-y-2 border-b border-[#3E1A29] pb-6">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                      Module {activeModuleIndex + 1} of {modules.length}
                    </span>
                    <span className="text-gray-600">•</span>
                    <span className="text-xs text-gray-400 font-medium">Estimated Duration: {currentModule.duration}</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
                    {currentModule.title}
                  </h2>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {currentModule.summary}
                  </p>
                </div>

                {/* Media Presentation: Video vs Low-Bandwidth Audio Mode */}
                <div className="bg-[#16070E] rounded-3xl border border-[#3E1A29] overflow-hidden shadow-2xl">
                  {isLowBandwidth ? (
                    /* Low-Bandwidth Audio + Transcript Mode */
                    <div className="p-8 space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b border-[#3E1A29]">
                        <div className="flex items-center gap-3">
                          <span className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center">
                            <Mic className="w-5 h-5 text-amber-300" />
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-white">Low-Bandwidth Audio Lecture</h4>
                            <p className="text-xs text-amber-300/80">Using compressed low-bitrate audio (Saves ~90% mobile data)</p>
                          </div>
                        </div>
                        <span className="text-xs font-mono text-gray-400">Adaptive Pan-African Streaming</span>
                      </div>

                      {/* Simulated Audio Player */}
                      <div className="bg-[#1D0B14] p-4 rounded-2xl border border-gray-800 flex items-center gap-4">
                        <button className="w-10 h-10 rounded-full bg-[#D4AF37] text-[#1D0B14] flex items-center justify-center font-bold text-sm shadow-md">
                          ▶
                        </button>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                            <span>04:12</span>
                            <span>{currentModule.duration}</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-[#D4AF37] h-full w-1/4"></div>
                          </div>
                        </div>
                        <span className="text-xs font-mono text-gray-400">1x</span>
                      </div>

                      {/* Executive Bullet Summary */}
                      <div className="space-y-3">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                          Executive Lecture Notes:
                        </h5>
                        <ul className="space-y-2 text-xs text-gray-300 list-disc list-inside">
                          {currentModule.topics?.map((topic, tidx) => (
                            <li key={tidx} className="leading-relaxed">{topic}</li>
                          )) || (
                            <li>Detailed review of core principles and financial covenants for growth.</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    /* Full Video Player Mode */
                    <div className="relative aspect-video bg-black flex items-center justify-center group">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 z-10 pointer-events-none"></div>
                      <img
                        src={course.thumbnailUrl || "/images/courses/investment-readiness.png"}
                        alt={currentModule.title}
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-75 transition-opacity"
                      />
                      <div className="absolute z-20 text-center space-y-3 p-4">
                        <button
                          type="button"
                          className="w-16 h-16 rounded-full bg-[#7F3D59] hover:bg-[#5E2C41] text-white flex items-center justify-center text-2xl mx-auto shadow-2xl hover:scale-105 transition-transform border-2 border-[#D4AF37]"
                          aria-label="Play video lesson"
                        >
                          ▶
                        </button>
                        <div>
                          <p className="text-sm font-serif font-bold text-white">{currentModule.title}</p>
                          <p className="text-xs text-[#D4AF37]">{currentModule.duration} • 1080p Full HD Video Lecture</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pan-African Case Study Card */}
                {currentModule.caseStudy && (
                  <div className="bg-gradient-to-br from-[#16070E] to-[#250D18] rounded-3xl p-6 sm:p-8 border border-[#7F3D59]/40 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Pan-African Case Study</span>
                      </span>
                      {currentModule.caseStudy.country && (
                        <span className="text-xs font-mono text-gray-400 bg-black/40 px-2.5 py-0.5 rounded-full border border-white/10">
                          {currentModule.caseStudy.country}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg sm:text-xl font-serif font-bold text-white">
                      {currentModule.caseStudy.title}
                    </h3>
                    {currentModule.caseStudy.founder && (
                      <p className="text-xs text-gray-400 font-medium">
                        Spotlight Founder: <span className="text-gray-200">{currentModule.caseStudy.founder}</span>
                      </p>
                    )}
                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-light">
                      {currentModule.caseStudy.summary}
                    </p>
                    {currentModule.caseStudy.keyTakeaway && (
                      <div className="p-4 bg-black/30 rounded-2xl border border-[#D4AF37]/20 text-xs text-[#D4AF37] space-y-1">
                        <span className="font-bold uppercase tracking-wider text-[10px]">Strategic Takeaway:</span>
                        <p className="text-gray-200">{currentModule.caseStudy.keyTakeaway}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Downloadable Practical Template Generator */}
                {currentModule.practicalTemplate && (
                  <div className="bg-[#16070E] rounded-3xl p-6 border border-[#3E1A29] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                          Ready-to-Use Asset
                        </span>
                        <span className="text-xs text-gray-400 font-mono">{currentModule.practicalTemplate.format}</span>
                      </div>
                      <h4 className="text-base font-bold text-white font-serif">
                        {currentModule.practicalTemplate.title}
                      </h4>
                      <p className="text-xs text-gray-400">
                        Synthesized framework template with formulas, covenants, and checklists.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownloadTemplate(currentModule.practicalTemplate)}
                      className="px-5 py-3 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4 text-white" />
                      <span>Download Practical Template</span>
                    </button>
                  </div>
                )}

                {/* Module Knowledge Quick-Check */}
                {currentModule.quiz?.questions && currentModule.quiz.questions.length > 0 && (
                  <div className="bg-[#16070E] rounded-3xl p-6 sm:p-8 border border-[#3E1A29] space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-[#3E1A29]">
                      <h4 className="text-base font-serif font-bold text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-[#D4AF37]" />
                        <span>Module Competency Quick-Check</span>
                      </h4>
                      <span className="text-xs text-gray-400 font-mono">
                        {currentModule.quiz.questions.length} Scenario Questions
                      </span>
                    </div>

                    <div className="space-y-6">
                      {currentModule.quiz.questions.map((q, qidx) => {
                        const selected = quickCheckAnswers[q.id];
                        const submitted = quickCheckSubmitted[q.id];
                        const isCorrect = selected === q.correctAnswer;

                        return (
                          <div key={q.id || qidx} className="space-y-3 p-4 rounded-2xl bg-[#1D0B14] border border-[#3E1A29]">
                            <p className="text-xs sm:text-sm font-semibold text-white">
                              {qidx + 1}. {q.question}
                            </p>

                            <div className="space-y-2">
                              {q.options.map((opt, optIdx) => {
                                const isSelected = selected === optIdx;
                                let btnClasses = "w-full text-left p-3 rounded-xl text-xs transition-colors border ";
                                if (submitted) {
                                  if (optIdx === q.correctAnswer) {
                                    btnClasses += "bg-emerald-950/80 border-emerald-500 text-emerald-200 font-bold";
                                  } else if (isSelected && !isCorrect) {
                                    btnClasses += "bg-red-950/80 border-red-500 text-red-200";
                                  } else {
                                    btnClasses += "bg-black/30 border-gray-800 text-gray-400";
                                  }
                                } else if (isSelected) {
                                  btnClasses += "bg-[#7F3D59]/40 border-[#D4AF37] text-white font-bold";
                                } else {
                                  btnClasses += "bg-black/30 border-gray-800 text-gray-300 hover:border-gray-700";
                                }

                                return (
                                  <button
                                    key={optIdx}
                                    type="button"
                                    disabled={submitted}
                                    onClick={() => handleSelectOption(q.id, optIdx)}
                                    className={btnClasses}
                                  >
                                    <span className="font-mono text-gray-500 mr-2">
                                      {String.fromCharCode(65 + optIdx)}.
                                    </span>
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>

                            {!submitted && selected !== undefined && (
                              <button
                                type="button"
                                onClick={() => handleCheckQuestion(q.id)}
                                className="px-4 py-2 bg-[#D4AF37] text-[#1D0B14] font-bold text-xs rounded-lg shadow-sm"
                              >
                                Check Answer
                              </button>
                            )}

                            {submitted && (
                              <div
                                className={`p-3 rounded-xl text-xs ${
                                  isCorrect ? "bg-emerald-950/60 border border-emerald-800 text-emerald-300" : "bg-red-950/60 border border-red-800 text-red-300"
                                }`}
                              >
                                <div className="font-bold mb-1 flex items-center gap-1.5">
                                  {isCorrect ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>Correct!</span>
                                    </>
                                  ) : (
                                    <>
                                      <X className="w-3.5 h-3.5 text-red-400" />
                                      <span>Review Rationale:</span>
                                    </>
                                  )}
                                </div>
                                <p className="text-gray-300">{q.explanation}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Module Progression Footer */}
                <div className="pt-6 border-t border-[#3E1A29] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeModuleIndex > 0) setActiveModuleIndex(activeModuleIndex - 1);
                    }}
                    disabled={activeModuleIndex === 0}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl border border-gray-700 hover:border-gray-500 text-xs text-gray-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    ← Previous Module
                  </button>

                  <button
                    type="button"
                    onClick={handleCompleteCurrentModule}
                    className="w-full sm:w-auto px-8 py-3.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <span>
                      {completedModules.includes(currentModule.id)
                        ? "Marked Done • Advance to Next →"
                        : "Mark Module Complete & Continue →"}
                    </span>
                  </button>
                </div>
              </div>
            ) : null}
          </main>
        </div>
      ) : (
        /* SCORM 1.2 / 2004 IFRAME PLAYER */
        <div className="flex-1 relative flex">
          <iframe
            src={course.packagePath || "/course/scormdriver/indexAPI.html"}
            className="flex-1 w-full h-full border-0 bg-white"
            title={course.title}
          />
        </div>
      )}

      {/* Reviewer Commenting Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: 350, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 350, opacity: 0 }}
            className="fixed top-16 right-0 bottom-0 w-80 sm:w-96 bg-[#16070E] border-l border-[#3E1A29] shadow-2xl z-30 flex flex-col"
          >
            <div className="p-4 border-b border-[#3E1A29] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-serif font-bold text-white">Reviewer Annotations</h3>
                <p className="text-xs text-gray-400">Content Quality &amp; Pedagogical Feedback</p>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
                aria-label="Close reviewer drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-[#3E1A29] space-y-3">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Enter feedback or editorial recommendation on this module..."
                className="w-full h-24 p-3 bg-[#1D0B14] border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
              <button
                type="button"
                disabled={isSubmittingComment || !commentText.trim()}
                onClick={async () => {
                  if (!commentText.trim() || !session?.user?.id) return;
                  setIsSubmittingComment(true);
                  try {
                    await addReviewComment(
                      params.id as string,
                      session.user.id as string,
                      `Module-${activeModuleIndex + 1}`,
                      modules[activeModuleIndex]?.title || "Course Review",
                      "EDITORIAL",
                      commentText
                    );
                    setCommentText("");
                    refreshComments();
                  } catch (e) {
                    console.error("Error adding review comment:", e);
                  } finally {
                    setIsSubmittingComment(false);
                  }
                }}
                className="w-full py-2 bg-[#7F3D59] hover:bg-[#5E2C41] text-white font-bold text-xs rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmittingComment ? "Saving..." : "Submit Reviewer Feedback"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {comments.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-6">
                  No reviewer annotations recorded yet.
                </p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-[#1D0B14] border border-[#3E1A29] space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-gray-400 text-[11px]">
                      <span className="font-bold text-[#D4AF37]">{c.user?.name || "Reviewer"}</span>
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-gray-200">{c.comment}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
