'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
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
  getCourseQuizzesAndGrades,
  submitCourseQuizAttempt,
} from './actions';
import {
  addReviewComment,
  getCourseReviewComments,
  updateReviewComment,
  deleteReviewComment,
} from './reviewActions';
import {
  Wifi,
  Zap,
  Award,
  Check,
  CheckCircle2,
  Mic,
  Globe,
  Download,
  X,
  BookOpen,
  FileText,
  HelpCircle,
  PlayCircle,
  Layers,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  ArrowRight
} from '@/components/Icons';

interface ModuleData {
  id: string;
  title: string;
  duration: string;
  videoUrl?: string;
  summary: string;
  keyTakeaways?: string[];
  learningObjectives?: string[];
  caseStudy?: string;
  templateName?: string;
  quizPrompt?: string;
}

/**
 * Coursera-Style Masterclass Course Shell.
 * Features a collapsible navigation drawer, structured module curriculum,
 * interactive digital workshops, downloadable business toolkits, and
 * graded module assessments embedded directly within each course.
 *
 * @returns {JSX.Element} The rendered course player.
 */
export default function CoursePlayerPage() {
  const { data: session } = useSession();
  const params = useParams();
  const searchParams = useSearchParams();
  const isReviewMode = searchParams.get('mode') === 'review';
  const initialTab = searchParams.get('tab');

  const [course, setCourse] = useState<any>(null);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const scormStateRef = useRef<Record<string, string>>({});

  // Coursera Navigation State
  const [activeView, setActiveView] = useState<'MODULE' | 'SYLLABUS' | 'GRADES' | 'RESOURCES'>(
    initialTab === 'grades' ? 'GRADES' : 'MODULE'
  );
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [expandedModules, setExpandedModules] = useState<Record<number, boolean>>({ 0: true });
  const [activeLessonMode, setActiveLessonMode] = useState<'NATIVE' | 'SIMULATION'>('NATIVE');
  const [isLowBandwidth, setIsLowBandwidth] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  // Curriculum data
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [completedModules, setCompletedModules] = useState<string[]>([]);

  // Embedded Course Quizzes & Grades
  const [courseQuizzes, setCourseQuizzes] = useState<any[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const [activeQuizIndex, setActiveQuizIndex] = useState<number | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<{ score: number; maxScore: number; passed: boolean } | null>(null);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);

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

  // Expose Runtime API for Interactive Simulation packages
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
      GetLastError: () => "0",
      GetErrorString: () => "",
      GetDiagnostic: () => ""
    };
  }, [enrollmentId]);

  // Load course details, enrollment & quizzes
  useEffect(() => {
    async function initCourse() {
      if (!params.id) return;
      const courseId = params.id as string;
      const courseData = await getCourseDetails(courseId);
      setCourse(courseData);

      if (courseData?.modulesJson) {
        try {
          const parsed = JSON.parse(courseData.modulesJson);
          if (Array.isArray(parsed)) {
            setModules(parsed);
          }
        } catch (e) {
          console.error("Failed to parse modulesJson:", e);
        }
      }

      const userId = (session?.user as any)?.id;
      const quizRes = await getCourseQuizzesAndGrades(courseId, userId);
      setCourseQuizzes(quizRes.quizzes || []);
      setQuizAttempts(quizRes.attempts || []);

      if (userId) {
        const eId = await getEnrollmentId(userId, courseId, true);
        if (eId) {
          setEnrollmentId(eId);
          const state = await getScormState(eId);
          scormStateRef.current = state;

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
      }

      if (isReviewMode) {
        refreshComments();
      }
    }

    initCourse();
  }, [session, params.id, isReviewMode]);

  // Handle module completion
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

    // Advance to next module
    if (activeModuleIndex < modules.length - 1) {
      setActiveModuleIndex(activeModuleIndex + 1);
      setExpandedModules(prev => ({ ...prev, [activeModuleIndex + 1]: true }));
      setQuizSubmitted(false);
      setQuizAnswers({});
      setQuizScore(null);
    }
  };

  // Practical Business Template Download
  const handleDownloadTemplate = (templateName: string) => {
    const content = `
================================================================================
AWIEF DIGITAL LEARNING ACADEMY | PRACTICAL BUSINESS TOOLKIT
Course: ${course?.title || "AWIEF Masterclass"}
Module: ${modules[activeModuleIndex]?.title || "Executive Module"}
Template: ${templateName}
Learner: ${session?.user?.name || session?.user?.email || "AWIEF Pan-African Founder"}
Date Generated: ${new Date().toLocaleDateString()}
Accreditation: United Nations ECOSOC Special Consultative Status
================================================================================

1. EXECUTIVE SUMMARY & OBJECTIVE:
This institutional framework was authored by AWIEF Faculty to guide women entrepreneurs
through investor due diligence, cashflow runway modeling, and cross-border trade compliance.

2. CORE OPERATING SECTIONS:
- Section 1: Executive Governance, Entity Structuring & Shareholding
- Section 2: 3-Year Integrated P&L, Balance Sheet & Working Capital Forecasts
- Section 3: Pan-African Unit Economics, Customer Acquisition & Gross Margin Targets
- Section 4: Target Capital Requirements, Valuation Benchmarks & Use of Proceeds

3. PRACTICAL ACTION STEPS:
[ ] Step 1: Input your audited or management accounts for the trailing 12 months.
[ ] Step 2: Assemble company incorporation papers, tax clearances, and AfCFTA certificates of origin.
[ ] Step 3: Present this completed document to your AWIEF mentor or investor relations lead.

(c) ${new Date().getFullYear()} Africa Women Innovation & Entrepreneurship Forum (AWIEF NPC). All rights reserved.
    `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${templateName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_awief.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Submit Embedded Module Assessment
  const handleSubmitQuiz = async (quiz: any) => {
    if (!quiz || !session?.user) return;
    setIsSubmittingQuiz(true);

    let correctCount = 0;
    const questions = quiz.questions || [];
    const details: Record<string, any> = {};

    questions.forEach((q: any, qIdx: number) => {
      const selectedAnswerIdx = quizAnswers[qIdx];
      const selectedAnswer = q.answers ? q.answers[selectedAnswerIdx] : null;
      const isCorrect = selectedAnswer ? Boolean(selectedAnswer.isCorrect) : false;

      if (isCorrect) correctCount++;
      details[q.id.toString()] = {
        isCorrect,
        selectedAnswerId: selectedAnswer?.id || null
      };
    });

    const max = questions.length;
    const res = await submitCourseQuizAttempt(
      (session.user as any).id,
      quiz.id,
      correctCount,
      max,
      JSON.stringify(details)
    );

    setQuizScore({ score: correctCount, maxScore: max, passed: res.passed });
    setQuizSubmitted(true);
    setIsSubmittingQuiz(false);

    // Refresh attempts
    const updated = await getCourseQuizzesAndGrades(course.id, (session.user as any).id);
    setQuizAttempts(updated.attempts || []);
  };

  const currentModule = modules[activeModuleIndex];

  // Map module to its embedded quiz
  const currentModuleQuiz = useMemo(() => {
    if (courseQuizzes.length === 0) return null;
    // Match by module index or return course quiz
    const idx = activeModuleIndex % courseQuizzes.length;
    return courseQuizzes[idx] || courseQuizzes[0];
  }, [courseQuizzes, activeModuleIndex]);

  // Find attempt for current quiz
  const currentQuizBestAttempt = useMemo(() => {
    if (!currentModuleQuiz) return null;
    return quizAttempts.find(a => a.quizId === currentModuleQuiz.id && a.passed) ||
           quizAttempts.find(a => a.quizId === currentModuleQuiz.id) || null;
  }, [currentModuleQuiz, quizAttempts]);

  return (
    <div className="min-h-screen bg-[#FDF8F9] flex flex-col selection:bg-[#7F3D59] selection:text-white">
      {/* 1. COURSERA-STYLE TOP NAVIGATION STRIP */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 truncate">
            <Link
              href="/dashboard/courses"
              className="p-2 text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors shrink-0"
              title="Return to My Masterclasses"
            >
              ← Back
            </Link>
            <div className="h-6 w-[1px] bg-gray-200 shrink-0"></div>
            <div className="truncate">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7F3D59] block">
                {course?.category || "Executive Masterclass"}
              </span>
              <h1 className="text-sm sm:text-base font-serif font-bold text-gray-900 truncate">
                {course?.title || "Loading Masterclass..."}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Low-Bandwidth Mode Toggle */}
            <button
              onClick={() => setIsLowBandwidth(!isLowBandwidth)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                isLowBandwidth
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              title="Toggle Low-Bandwidth Data Saver mode for mobile connections"
            >
              <Wifi className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Data Saver</span>
            </button>

            {/* Overall Progress Pill */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-[#FDF8F9] border border-[#EAD7E0] rounded-xl text-xs">
              <span className="text-gray-500 font-medium">Curriculum:</span>
              <span className="font-bold text-[#7F3D59] font-mono">{progressPercent}%</span>
            </div>

            {/* Certificate Quick Link if 100% */}
            {progressPercent >= 100 && (
              <Link
                href={`/certificate/${course?.id}`}
                className="px-3 py-1.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="hidden sm:inline">Credential</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 2. COURSERA-STYLE TWO-COLUMN WORKSPACE */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full flex flex-col lg:flex-row gap-6">
        
        {/* LEFT COURSE NAVIGATION DRAWER (COURSERA SIDEBAR) */}
        <aside className="w-full lg:w-80 shrink-0 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-[#EAD7E0] shadow-sm space-y-4">
            
            {/* Primary View Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1 bg-[#FDF8F9] p-1 rounded-2xl border border-[#EAD7E0] text-xs font-bold">
              <button
                onClick={() => setActiveView('MODULE')}
                className={`py-2 px-3 rounded-xl transition-colors ${
                  activeView === 'MODULE'
                    ? 'bg-[#7F3D59] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Curriculum
              </button>
              <button
                onClick={() => setActiveView('GRADES')}
                className={`py-2 px-3 rounded-xl transition-colors ${
                  activeView === 'GRADES'
                    ? 'bg-[#7F3D59] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Grades &amp; Quizzes
              </button>
            </div>

            {/* Additional Views */}
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 border-b border-gray-100 pb-3">
              <button
                onClick={() => setActiveView('SYLLABUS')}
                className={`hover:text-[#7F3D59] transition-colors ${
                  activeView === 'SYLLABUS' ? 'text-[#7F3D59] font-bold' : ''
                }`}
              >
                Objectives &amp; Syllabus
              </button>
              <button
                onClick={() => setActiveView('RESOURCES')}
                className={`hover:text-[#7F3D59] transition-colors ${
                  activeView === 'RESOURCES' ? 'text-[#7F3D59] font-bold' : ''
                }`}
              >
                Toolkits &amp; Downloads
              </button>
            </div>

            {/* EXPANDABLE MODULE LIST */}
            {activeView === 'MODULE' && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1">
                  Bite-Sized Modules ({modules.length})
                </p>

                {modules.map((mod, idx) => {
                  const isCurrent = activeModuleIndex === idx;
                  const isDone = completedModules.includes(mod.id);
                  const isExpanded = expandedModules[idx] ?? isCurrent;

                  return (
                    <div
                      key={mod.id}
                      className={`rounded-2xl border transition-all overflow-hidden ${
                        isCurrent
                          ? "border-[#7F3D59] bg-[#FDF8F9]"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <button
                        onClick={() => {
                          setActiveModuleIndex(idx);
                          setExpandedModules({ ...expandedModules, [idx]: !isExpanded });
                        }}
                        className="w-full p-3.5 text-left flex items-start justify-between gap-2"
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold ${
                              isDone
                                ? "bg-emerald-600 text-white"
                                : isCurrent
                                ? "bg-[#7F3D59] text-white"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {isDone ? <Check className="w-3 h-3" /> : idx + 1}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                              Module {idx + 1} • {mod.duration}
                            </span>
                            <h4 className="text-xs font-serif font-bold text-gray-900 leading-snug">
                              {mod.title.replace(/^Module \d+:\s*/, '')}
                            </h4>
                          </div>
                        </div>

                        <span className="text-gray-400 pt-1">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </span>
                      </button>

                      {/* Expandable Module Sub-steps */}
                      {isExpanded && (
                        <div className="px-4 pb-3 pt-1 space-y-1.5 border-t border-gray-100 text-xs bg-white/60">
                          <div className="flex items-center gap-2 text-gray-700 py-1 font-medium">
                            <Sparkles className="w-3.5 h-3.5 text-[#7F3D59]" />
                            <span>Learning Objectives</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-700 py-1 font-medium">
                            <PlayCircle className="w-3.5 h-3.5 text-[#7F3D59]" />
                            <span>Interactive Video &amp; Simulation</span>
                          </div>
                          {mod.templateName && (
                            <div className="flex items-center gap-2 text-gray-700 py-1 font-medium">
                              <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
                              <span className="truncate">{mod.templateName}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-gray-700 py-1 font-medium">
                            <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Graded Module Quiz</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT MAIN LEARNING STAGE */}
        <main className="flex-1 space-y-6 min-w-0">
          
          {/* VIEW 1: MODULE LEARNING STAGE */}
          {activeView === 'MODULE' && currentModule && (
            <div className="space-y-6">
              
              {/* Module Header & Learning Objectives Banner */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAD7E0] shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <span className="px-3 py-1 bg-[#7F3D59]/10 text-[#7F3D59] rounded-full text-xs font-bold uppercase tracking-wider">
                    Module {activeModuleIndex + 1} of {modules.length}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    Estimated Time: <strong>{currentModule.duration}</strong>
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-serif font-extrabold text-[#1D0B14]">
                  {currentModule.title}
                </h2>

                <p className="text-sm text-gray-600 leading-relaxed font-light">
                  {currentModule.summary}
                </p>

                {/* Specific Learning Objectives Callout */}
                {currentModule.keyTakeaways && currentModule.keyTakeaways.length > 0 && (
                  <div className="p-5 rounded-2xl bg-[#FDF8F9] border border-[#EAD7E0] space-y-2">
                    <h3 className="text-xs font-serif font-bold uppercase tracking-wider text-[#7F3D59] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Key Learning Objectives &amp; Executive Competencies</span>
                    </h3>
                    <ul className="space-y-1.5 text-xs text-gray-700">
                      {currentModule.keyTakeaways.map((takeaway, tIdx) => (
                        <li key={tIdx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span>{takeaway}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Lesson Delivery Stage (Interactive Simulation vs Native Video) */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAD7E0] shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-[#7F3D59]/10 text-[#7F3D59] rounded-xl">
                      <PlayCircle className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-base font-serif font-bold text-gray-900">
                        Lesson Delivery Mode
                      </h3>
                      <p className="text-xs text-gray-500">
                        Choose between structured video analysis or interactive simulation workshop.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-[#FDF8F9] p-1 rounded-xl border border-[#EAD7E0] text-xs font-bold self-start sm:self-auto">
                    <button
                      onClick={() => setActiveLessonMode('NATIVE')}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${
                        activeLessonMode === 'NATIVE'
                          ? 'bg-[#7F3D59] text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Video &amp; Case Study
                    </button>
                    <button
                      onClick={() => setActiveLessonMode('SIMULATION')}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${
                        activeLessonMode === 'SIMULATION'
                          ? 'bg-[#7F3D59] text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Interactive Workshop
                    </button>
                  </div>
                </div>

                {/* MODE A: Native Video & Case Study */}
                {activeLessonMode === 'NATIVE' && (
                  <div className="space-y-6">
                    {isLowBandwidth ? (
                      /* Low-Bandwidth Data Saver Card */
                      <div className="p-6 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
                        <div className="flex items-center gap-2 text-amber-900 font-serif font-bold text-sm">
                          <Wifi className="w-4 h-4 text-amber-700" />
                          <span>Data Saver Audio &amp; Executive Summary Active</span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          Video streaming has been paused to conserve bandwidth. You are accessing optimized executive audio notes and offline-persisted case summaries.
                        </p>
                        <div className="pt-2">
                          <audio controls className="w-full h-10 rounded-lg">
                            <source src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" type="audio/mpeg" />
                            Your browser does not support audio playback.
                          </audio>
                        </div>
                      </div>
                    ) : (
                      /* Video Lesson Player */
                      <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-md relative">
                        <video
                          controls
                          className="w-full h-full object-cover"
                          poster="/images/investment-readiness.png"
                        >
                          <source src={currentModule.videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"} type="video/mp4" />
                          Your browser does not support HTML5 video playback.
                        </video>
                      </div>
                    )}

                    {/* Pan-African Founder Case Study */}
                    {currentModule.caseStudy && (
                      <div className="p-6 rounded-2xl bg-[#FDF8F9] border border-[#EAD7E0] space-y-2">
                        <div className="flex items-center gap-2 text-[#7F3D59] font-serif font-bold text-xs uppercase tracking-wider">
                          <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                          <span>Pan-African Founder Case Study</span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-800 leading-relaxed font-light">
                          {currentModule.caseStudy}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* MODE B: Interactive Workshop Simulation */}
                {activeLessonMode === 'SIMULATION' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Interactive Digital Simulation Workshop (Auto-saves progress)</span>
                      <button
                        onClick={() => setIsTheaterMode(!isTheaterMode)}
                        className="text-[#7F3D59] hover:underline font-bold"
                      >
                        {isTheaterMode ? "Standard View" : "Theater Mode"}
                      </button>
                    </div>

                    <div
                      className={`w-full rounded-2xl overflow-hidden border border-gray-300 shadow-md bg-white transition-all ${
                        isTheaterMode ? "h-[750px]" : "h-[500px]"
                      }`}
                    >
                      <iframe
                        src={course?.scormPath || "/course/scormdriver/indexAPI.html"}
                        title="Interactive Simulation Workshop"
                        className="w-full h-full border-0"
                        allowFullScreen
                      ></iframe>
                    </div>
                  </div>
                )}

                {/* Practical Business Toolkit Download */}
                {currentModule.templateName && (
                  <div className="p-5 rounded-2xl border border-[#D4AF37]/50 bg-amber-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7F3D59]">
                        Practical Business Toolkit
                      </span>
                      <h4 className="text-sm font-serif font-bold text-gray-900">
                        {currentModule.templateName}
                      </h4>
                      <p className="text-xs text-gray-600">
                        Institutional template formatted for investor due diligence and African commercial banking.
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownloadTemplate(currentModule.templateName!)}
                      className="px-5 py-2.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-auto"
                    >
                      <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Download Toolkit</span>
                    </button>
                  </div>
                )}
              </div>

              {/* EMBEDDED GRADED MODULE QUIZ (LIVING INSIDE THIS COURSE) */}
              {currentModuleQuiz && (
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAD7E0] shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                        <HelpCircle className="w-5 h-5 text-emerald-700" />
                      </span>
                      <div>
                        <h3 className="text-base font-serif font-bold text-gray-900">
                          Module Graded Assessment: {currentModuleQuiz.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          Scenario evaluation testing practical decision-making. Passing threshold is 80%.
                        </p>
                      </div>
                    </div>

                    {currentQuizBestAttempt && (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          currentQuizBestAttempt.passed
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {currentQuizBestAttempt.passed ? "Passed (80%+)" : "Needs Retake"}
                      </span>
                    )}
                  </div>

                  {/* Quiz Score Banner if just submitted */}
                  {quizSubmitted && quizScore && (
                    <div
                      className={`p-5 rounded-2xl border text-xs font-medium space-y-1 ${
                        quizScore.passed
                          ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                          : "bg-red-50 text-red-900 border-red-200"
                      }`}
                    >
                      <h4 className="font-serif font-bold text-sm">
                        {quizScore.passed ? "Assessment Passed!" : "Assessment Needs Review"}
                      </h4>
                      <p>
                        You scored <strong>{quizScore.score}</strong> out of{" "}
                        <strong>{quizScore.maxScore}</strong> (
                        {Math.round((quizScore.score / quizScore.maxScore) * 100)}%).
                        {quizScore.passed
                          ? " Your executive score has been recorded in your course transcript."
                          : " Review the module materials and retake the assessment to earn your passing grade."}
                      </p>
                    </div>
                  )}

                  {/* Quiz Questions Form */}
                  <div className="space-y-6">
                    {(currentModuleQuiz.questions || []).map((q: any, qIdx: number) => {
                      return (
                        <div key={q.id || qIdx} className="p-5 rounded-2xl bg-[#FDF8F9] border border-[#EAD7E0] space-y-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7F3D59]">
                            Question {qIdx + 1}
                          </span>
                          <div
                            className="text-xs sm:text-sm font-semibold text-gray-900 leading-snug"
                            dangerouslySetInnerHTML={{ __html: q.questiontext || q.name }}
                          ></div>

                          <div className="space-y-2 pt-2">
                            {(q.answers || []).map((ans: any, aIdx: number) => {
                              const isSelected = quizAnswers[qIdx] === aIdx;

                              return (
                                <button
                                  key={ans.id || aIdx}
                                  type="button"
                                  onClick={() => setQuizAnswers({ ...quizAnswers, [qIdx]: aIdx })}
                                  className={`w-full p-3 rounded-xl text-left text-xs transition-all flex items-start gap-2.5 ${
                                    isSelected
                                      ? "bg-[#7F3D59] text-white font-semibold shadow-xs"
                                      : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                                  }`}
                                >
                                  <span
                                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                                      isSelected
                                        ? "bg-white text-[#7F3D59]"
                                        : "bg-gray-100 text-gray-600"
                                    }`}
                                  >
                                    {String.fromCharCode(65 + aIdx)}
                                  </span>
                                  <span className="pt-0.5">{ans.text}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {Object.keys(quizAnswers).length} of {(currentModuleQuiz.questions || []).length} answered
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSubmitQuiz(currentModuleQuiz)}
                        disabled={isSubmittingQuiz || Object.keys(quizAnswers).length < (currentModuleQuiz.questions || []).length}
                        className="px-6 py-2.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                      >
                        {isSubmittingQuiz ? "Grading..." : "Submit Module Assessment"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step Navigation Controls */}
              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  disabled={activeModuleIndex === 0}
                  onClick={() => setActiveModuleIndex(activeModuleIndex - 1)}
                  className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  ← Previous Module
                </button>

                <button
                  type="button"
                  onClick={handleCompleteCurrentModule}
                  className="px-6 py-2.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                >
                  <span>
                    {activeModuleIndex < modules.length - 1
                      ? "Complete Module & Next →"
                      : "Finish Masterclass Curriculum"}
                  </span>
                </button>
              </div>

            </div>
          )}

          {/* VIEW 2: COURSERA-STYLE GRADES & ASSESSMENTS VIEW */}
          {activeView === 'GRADES' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAD7E0] shadow-sm space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-2xl font-serif font-bold text-[#1D0B14]">
                  Grades &amp; Course Assessments
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Track your evaluation results across all embedded scenario quizzes for this masterclass. Passing mark is 80%.
                </p>
              </div>

              {courseQuizzes.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-500">
                  No graded assessments configured for this course yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead>
                      <tr className="bg-[#FDF8F9]">
                        <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">
                          Assessment Title
                        </th>
                        <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">
                          Passing Score
                        </th>
                        <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">
                          Highest Grade
                        </th>
                        <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right font-bold text-gray-700 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {courseQuizzes.map((quiz, qIdx) => {
                        const attempts = quizAttempts.filter(a => a.quizId === quiz.id);
                        const passedAttempt = attempts.find(a => a.passed);
                        const bestAttempt = passedAttempt || attempts[0];
                        const bestPct = bestAttempt ? Math.round((bestAttempt.score / bestAttempt.maxScore) * 100) : null;

                        return (
                          <tr key={quiz.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4">
                              <div className="font-serif font-bold text-gray-900">{quiz.name}</div>
                              <div className="text-[11px] text-gray-500">{quiz.intro}</div>
                            </td>
                            <td className="px-4 py-4 font-semibold text-gray-600">80%</td>
                            <td className="px-4 py-4 font-bold font-mono">
                              {bestPct !== null ? `${bestPct}%` : "—"}
                            </td>
                            <td className="px-4 py-4">
                              {passedAttempt ? (
                                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                                  Passed
                                </span>
                              ) : attempts.length > 0 ? (
                                <span className="px-2.5 py-0.5 bg-red-100 text-red-800 rounded-full font-bold text-[10px]">
                                  Needs Retake
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full font-bold text-[10px]">
                                  Not Started
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <button
                                onClick={() => {
                                  setActiveView('MODULE');
                                  setActiveModuleIndex(qIdx % modules.length);
                                }}
                                className="px-3.5 py-1.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl font-bold transition-all"
                              >
                                {passedAttempt ? "Retake Assessment" : "Start Assessment"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: OBJECTIVES & SYLLABUS */}
          {activeView === 'SYLLABUS' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAD7E0] shadow-sm space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-2xl font-serif font-bold text-[#1D0B14]">
                  Learning Objectives &amp; Executive Syllabus
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Full curriculum blueprint and institutional competencies certified upon completion.
                </p>
              </div>

              <div className="space-y-4">
                {modules.map((m, idx) => (
                  <div key={m.id} className="p-5 rounded-2xl bg-[#FDF8F9] border border-[#EAD7E0] space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#7F3D59]">
                      Module {idx + 1} • {m.duration}
                    </span>
                    <h3 className="text-base font-serif font-bold text-gray-900">{m.title}</h3>
                    <p className="text-xs text-gray-600">{m.summary}</p>
                    {m.keyTakeaways && (
                      <ul className="pt-2 space-y-1 text-xs text-gray-700">
                        {m.keyTakeaways.map((item, iIdx) => (
                          <li key={iIdx} className="flex items-start gap-1.5">
                            <span className="text-[#D4AF37] font-bold">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 4: TOOLKITS & DOWNLOADS */}
          {activeView === 'RESOURCES' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EAD7E0] shadow-sm space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-2xl font-serif font-bold text-[#1D0B14]">
                  Practical Business Toolkits &amp; Frameworks
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Download institutional financial models, pitch deck templates, and compliance matrices for your enterprise.
                </p>
              </div>

              <div className="space-y-3">
                {modules
                  .filter((m) => m.templateName)
                  .map((m, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl border border-[#EAD7E0] bg-[#FDF8F9] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          From Module {idx + 1}
                        </span>
                        <h4 className="text-sm font-serif font-bold text-gray-900">{m.templateName}</h4>
                      </div>
                      <button
                        onClick={() => handleDownloadTemplate(m.templateName!)}
                        className="px-4 py-2 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
                      >
                        <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Download (.txt / .docx)</span>
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
