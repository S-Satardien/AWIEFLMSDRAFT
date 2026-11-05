"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  HelpCircle,
  CheckCircle2,
  X,
  BookOpen,
  ExternalLink,
  Check
} from "lucide-react";
import {
  QuizItem,
  QuestionItem,
  getQuizzesForManagement,
  updateQuizMetadata,
  createNewQuiz,
  saveQuestion,
  deleteQuestion,
  deleteQuiz
} from "./quizActions";

interface QuizManagementTabProps {
  courses?: any[];
  initialCourseId?: string | null;
}

/**
 * Helper to strip HTML tags for clean display in preview fields
 */
function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, "").trim();
}

/**
 * Interactive Quiz & Assessment Manager component for AWIEF Masterclasses.
 * Embeds quizzes directly within the context of specific commercial courses,
 * supporting course filtering, question editing, multiple-choice options, and live previews.
 *
 * @param {QuizManagementTabProps} props - Courses dataset and optional initial course filter.
 * @returns {JSX.Element} The rendered quiz management component.
 */
export default function QuizManagementTab({
  courses = [],
  initialCourseId = null
}: QuizManagementTabProps) {
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>(
    initialCourseId || "ALL"
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Quiz Metadata Edit State
  const [isEditingQuizMeta, setIsEditingQuizMeta] = useState<boolean>(false);
  const [quizName, setQuizName] = useState<string>("");
  const [quizIntro, setQuizIntro] = useState<string>("");
  const [quizCourseId, setQuizCourseId] = useState<string>("");
  const [isSavingMeta, setIsSavingMeta] = useState<boolean>(false);

  // Create Quiz Modal State
  const [isCreateQuizModalOpen, setIsCreateQuizModalOpen] = useState<boolean>(false);
  const [newQuizName, setNewQuizName] = useState<string>("");
  const [newQuizIntro, setNewQuizIntro] = useState<string>("");
  const [newQuizCourseId, setNewQuizCourseId] = useState<string>(
    initialCourseId || (courses[0]?.id ?? "")
  );
  const [isCreatingQuiz, setIsCreatingQuiz] = useState<boolean>(false);

  // Question Editor Modal State
  const [editingQuestion, setEditingQuestion] = useState<{
    id?: number;
    name?: string;
    questiontext: string;
    answers: { id?: number; text: string; isCorrect: boolean }[];
  } | null>(null);
  const [isSavingQuestion, setIsSavingQuestion] = useState<boolean>(false);
  const [questionModalError, setQuestionModalError] = useState<string | null>(null);

  // Load quizzes on initial render
  useEffect(() => {
    loadQuizzes();
  }, []);

  // Update filter if initialCourseId changes from outside
  useEffect(() => {
    if (initialCourseId) {
      setSelectedCourseFilter(initialCourseId);
    }
  }, [initialCourseId]);

  const loadQuizzes = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await getQuizzesForManagement();
      setQuizzes(data);
      if (data.length > 0) {
        setSelectedQuizId((prev) =>
          prev !== null && data.some((q) => q.id === prev) ? prev : data[0].id
        );
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load quiz list.");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter quizzes by selected course
  const filteredQuizzes = useMemo(() => {
    if (selectedCourseFilter === "ALL") return quizzes;
    return quizzes.filter((q) => q.courseId === selectedCourseFilter);
  }, [quizzes, selectedCourseFilter]);

  // Keep selected quiz aligned with filtered list
  useEffect(() => {
    if (filteredQuizzes.length > 0) {
      if (!filteredQuizzes.some((q) => q.id === selectedQuizId)) {
        setSelectedQuizId(filteredQuizzes[0].id);
      }
    } else {
      setSelectedQuizId(null);
    }
  }, [filteredQuizzes, selectedQuizId]);

  const selectedQuiz = quizzes.find((q) => q.id === selectedQuizId);

  // Synchronize metadata edit state when selected quiz changes
  useEffect(() => {
    if (selectedQuiz) {
      setQuizName(selectedQuiz.name || "");
      setQuizIntro(selectedQuiz.intro || "");
      setQuizCourseId(selectedQuiz.courseId || "");
      setIsEditingQuizMeta(false);
    }
  }, [selectedQuizId, quizzes]);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  const handleSaveQuizMetadata = async () => {
    if (!selectedQuizId || !quizName.trim()) return;
    setIsSavingMeta(true);
    setErrorMsg(null);
    try {
      const updated = await updateQuizMetadata(selectedQuizId, {
        name: quizName,
        intro: quizIntro,
        courseId: quizCourseId || null
      });
      setQuizzes((prev) => prev.map((q) => (q.id === selectedQuizId ? updated : q)));
      setIsEditingQuizMeta(false);
      showNotification("Quiz details updated successfully!");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update quiz.");
    } finally {
      setIsSavingMeta(false);
    }
  };

  const handleCreateNewQuiz = async () => {
    if (!newQuizName.trim()) return;
    setIsCreatingQuiz(true);
    setErrorMsg(null);
    try {
      const created = await createNewQuiz({
        name: newQuizName,
        intro: newQuizIntro,
        courseId: newQuizCourseId || null
      });
      setQuizzes((prev) => [...prev, created]);
      setSelectedQuizId(created.id);
      setIsCreateQuizModalOpen(false);
      setNewQuizName("");
      setNewQuizIntro("");
      showNotification("New quiz created successfully!");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create quiz.");
    } finally {
      setIsCreatingQuiz(false);
    }
  };

  const handleDeleteQuiz = async (quizId: number) => {
    if (!confirm("Are you sure you want to permanently delete this quiz?")) return;
    setErrorMsg(null);
    try {
      await deleteQuiz(quizId);
      const remaining = quizzes.filter((q) => q.id !== quizId);
      setQuizzes(remaining);
      if (selectedQuizId === quizId) {
        setSelectedQuizId(remaining.length > 0 ? remaining[0].id : null);
      }
      showNotification("Quiz removed successfully.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete quiz.");
    }
  };

  const handleOpenAddQuestion = () => {
    if (!selectedQuiz) return;
    const nextQNum = (selectedQuiz.questions?.length || 0) + 1;
    setEditingQuestion({
      name: `Question ${nextQNum}`,
      questiontext: "",
      answers: [
        { text: "", isCorrect: true },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false }
      ]
    });
    setQuestionModalError(null);
  };

  const handleOpenEditQuestion = (q: QuestionItem) => {
    setEditingQuestion({
      id: q.id,
      name: q.name,
      questiontext: stripHtml(q.questiontext),
      answers: q.answers.map((a) => ({
        id: a.id,
        text: a.text,
        isCorrect: a.isCorrect
      }))
    });
    setQuestionModalError(null);
  };

  const handleSaveQuestionModal = async () => {
    if (!selectedQuizId || !editingQuestion) return;

    if (!editingQuestion.questiontext.trim()) {
      setQuestionModalError("Please provide the question prompt text.");
      return;
    }

    const emptyAnswer = editingQuestion.answers.some((a) => !a.text.trim());
    if (emptyAnswer) {
      setQuestionModalError("All answer choice fields must have content.");
      return;
    }

    const hasCorrect = editingQuestion.answers.some((a) => a.isCorrect);
    if (!hasCorrect) {
      setQuestionModalError("Please mark at least one option as the correct answer.");
      return;
    }

    setIsSavingQuestion(true);
    setQuestionModalError(null);
    try {
      const updatedQuiz = await saveQuestion(selectedQuizId, editingQuestion);
      setQuizzes((prev) => prev.map((q) => (q.id === selectedQuizId ? updatedQuiz : q)));
      setEditingQuestion(null);
      showNotification("Question saved successfully!");
    } catch (err: unknown) {
      setQuestionModalError(err instanceof Error ? err.message : "Failed to save question.");
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (!selectedQuizId) return;
    if (!confirm("Are you sure you want to remove this question?")) return;
    setErrorMsg(null);
    try {
      const updatedQuiz = await deleteQuestion(selectedQuizId, questionId);
      setQuizzes((prev) => prev.map((q) => (q.id === selectedQuizId ? updatedQuiz : q)));
      showNotification("Question deleted.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete question.");
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-[#EAD7E0] shadow-sm flex flex-col items-center justify-center text-gray-500">
        <div className="w-10 h-10 border-4 border-[#7F3D59] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-semibold text-gray-700 font-serif">Loading Course Quizzes &amp; Assessments...</p>
      </div>
    );
  }

  const selectedCourseObj = courses.find((c) => c.id === selectedQuiz?.courseId);

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium flex items-center shadow-sm text-xs"
          >
            <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Error Banner */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium flex items-center shadow-sm text-xs">
          <X className="w-4 h-4 mr-2 text-red-600 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Course Context Header & Action Strip */}
      <div className="bg-gradient-to-r from-[#1D0B14] to-[#3E1A29] rounded-2xl shadow-md p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#D4AF37]/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#D4AF37]">
              Course Assessments &amp; Competency Quizzes
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight">
            Curriculum Quizzes &amp; Knowledge Checks
          </h2>
          <p className="text-gray-300 text-xs">
            Manage assessment questions, set correct answers, and bind tests directly to specific masterclasses.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setNewQuizCourseId(
              selectedCourseFilter !== "ALL" ? selectedCourseFilter : courses[0]?.id || ""
            );
            setIsCreateQuizModalOpen(true);
          }}
          className="px-4 py-2.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm text-xs self-start md:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Author New Quiz</span>
        </button>
      </div>

      {/* Course Filter Bar (Puts Quizzes within the Specific Course) */}
      <div className="bg-white p-4 rounded-2xl border border-[#EAD7E0] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#7F3D59]" />
          <span className="text-xs font-bold text-gray-800">Masterclass Scope:</span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 bg-[#FDF8F9] border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-[#7F3D59] focus:outline-none"
          >
            <option value="ALL">All Masterclasses ({quizzes.length} total quizzes)</option>
            {courses.map((c) => {
              const count = quizzes.filter((q) => q.courseId === c.id).length;
              return (
                <option key={c.id} value={c.id}>
                  {c.title} ({count} {count === 1 ? "quiz" : "quizzes"})
                </option>
              );
            })}
          </select>

          {selectedCourseFilter !== "ALL" && (
            <button
              type="button"
              onClick={() => setSelectedCourseFilter("ALL")}
              className="text-[11px] font-bold text-[#7F3D59] hover:underline whitespace-nowrap"
            >
              Show All
            </button>
          )}
        </div>
      </div>

      {/* Quiz Selector Navigation Tabs */}
      {filteredQuizzes.length > 0 ? (
        <div className="bg-white p-2 rounded-2xl border border-[#EAD7E0] shadow-xs flex items-center gap-2 overflow-x-auto">
          {filteredQuizzes.map((quiz) => {
            const courseMatch = courses.find((c) => c.id === quiz.courseId);
            const isSelected = selectedQuizId === quiz.id;
            return (
              <button
                key={quiz.id}
                type="button"
                onClick={() => setSelectedQuizId(quiz.id)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap flex items-center gap-2 ${
                  isSelected
                    ? "bg-[#7F3D59] text-white shadow-sm"
                    : "text-gray-700 hover:bg-[#FDF8F9] hover:text-[#7F3D59]"
                }`}
              >
                <span>Quiz {quiz.id}</span>
                {courseMatch && selectedCourseFilter === "ALL" && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-gray-100 text-[#7F3D59]"
                    }`}
                  >
                    {courseMatch.category || "Course"}
                  </span>
                )}
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {quiz.questions?.length || 0} Qs
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl border border-[#EAD7E0] text-center text-gray-500 space-y-3">
          <p className="text-xs">
            No quizzes currently assigned to this masterclass.
          </p>
          <button
            type="button"
            onClick={() => {
              setNewQuizCourseId(selectedCourseFilter !== "ALL" ? selectedCourseFilter : "");
              setIsCreateQuizModalOpen(true);
            }}
            className="px-4 py-2 bg-[#7F3D59] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Quiz for this Masterclass</span>
          </button>
        </div>
      )}

      {selectedQuiz && (
        <div className="space-y-6">
          {/* Selected Quiz Overview & Metadata Card */}
          <div className="bg-white rounded-2xl p-6 border border-[#EAD7E0] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7F3D59] bg-[#FDF8F9] px-2.5 py-0.5 rounded border border-[#7F3D59]/20 font-mono">
                    Quiz ID: {selectedQuiz.id}
                  </span>
                  {selectedCourseObj && (
                    <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded">
                      Linked to: {selectedCourseObj.title}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-serif font-bold text-gray-900 mt-1">
                  {selectedQuiz.name}
                </h3>
                {selectedQuiz.intro && (
                  <p className="text-gray-500 text-xs mt-1 italic">{selectedQuiz.intro}</p>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/quiz/${selectedQuiz.id}`}
                  target="_blank"
                  className="px-3 py-1.5 bg-[#FDF8F9] hover:bg-[#EAD7E0] text-[#7F3D59] font-bold rounded-lg text-xs transition-colors inline-flex items-center gap-1 border border-[#7F3D59]/30"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Test Learner View</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsEditingQuizMeta(!isEditingQuizMeta)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs transition-colors inline-flex items-center gap-1"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>{isEditingQuizMeta ? "Cancel Edit" : "Edit Metadata"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteQuiz(selectedQuiz.id)}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg text-xs transition-colors inline-flex items-center gap-1"
                  title="Delete Entire Quiz"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Quiz</span>
                </button>
              </div>
            </div>

            {/* Inline Metadata Edit Form */}
            {isEditingQuizMeta && (
              <div className="p-4 bg-[#FDF8F9] border border-[#EAD7E0] rounded-xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Quiz Title *
                    </label>
                    <input
                      type="text"
                      value={quizName}
                      onChange={(e) => setQuizName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-[#7F3D59] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Attached Masterclass
                    </label>
                    <select
                      value={quizCourseId}
                      onChange={(e) => setQuizCourseId(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-[#7F3D59] focus:outline-none"
                    >
                      <option value="">No course assigned</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Introduction / Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={quizIntro}
                    onChange={(e) => setQuizIntro(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-800 focus:ring-2 focus:ring-[#7F3D59] focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingQuizMeta(false)}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-bold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveQuizMetadata}
                    disabled={isSavingMeta}
                    className="px-4 py-1.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white text-xs font-bold rounded-lg disabled:opacity-50"
                  >
                    {isSavingMeta ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}

            {/* Questions Header */}
            <div className="flex items-center justify-between pt-2">
              <h4 className="text-sm font-serif font-bold text-gray-900 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-[#7F3D59]" />
                <span>Assessment Questions ({selectedQuiz.questions?.length || 0})</span>
              </h4>

              <button
                type="button"
                onClick={handleOpenAddQuestion}
                className="px-3.5 py-1.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-lg text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Question</span>
              </button>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {(!selectedQuiz.questions || selectedQuiz.questions.length === 0) ? (
                <div className="p-8 text-center text-gray-400 text-xs bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  No questions currently added. Click &quot;Add Question&quot; to author your first assessment item.
                </div>
              ) : (
                selectedQuiz.questions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-5 rounded-xl border border-[#EAD7E0] bg-[#FDF8F9]/50 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#7F3D59] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-mono font-bold text-[#7F3D59] mb-0.5">
                            {q.name}
                          </p>
                          <div className="text-xs font-medium text-gray-900 leading-relaxed">
                            {stripHtml(q.questiontext)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditQuestion(q)}
                          className="p-1.5 text-gray-600 hover:text-[#7F3D59] rounded hover:bg-white transition-colors"
                          title="Edit Question"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-white transition-colors"
                          title="Delete Question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Answers List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-gray-200/50">
                      {q.answers?.map((ans, aidx) => (
                        <div
                          key={ans.id || aidx}
                          className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                            ans.isCorrect
                              ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold"
                              : "bg-white border-gray-200 text-gray-700"
                          }`}
                        >
                          {ans.isCorrect ? (
                            <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                          ) : (
                            <span className="w-3.5 h-3.5 rounded-full border border-gray-300 shrink-0 mt-0.5"></span>
                          )}
                          <span className="line-clamp-2">{ans.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit / Add Question Modal */}
      <AnimatePresence>
        {editingQuestion && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-[#EAD7E0] max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-[#FDF8F9]">
                <h3 className="text-base font-serif font-bold text-gray-900">
                  {editingQuestion.id ? `Edit ${editingQuestion.name}` : "Author Assessment Question"}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {questionModalError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
                    {questionModalError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Question Identifier
                  </label>
                  <input
                    type="text"
                    value={editingQuestion.name || ""}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, name: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#7F3D59] focus:outline-none"
                    placeholder="e.g. Question 1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Question Text Prompt *
                  </label>
                  <textarea
                    rows={3}
                    value={editingQuestion.questiontext}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, questiontext: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#7F3D59] focus:outline-none resize-none"
                    placeholder="Enter the question scenario..."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase">
                      Answer Choices *
                    </label>
                    <span className="text-[11px] text-gray-500">
                      Select the radio button for the correct answer
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {editingQuestion.answers.map((answer, aIdx) => (
                      <div
                        key={aIdx}
                        className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                          answer.isCorrect
                            ? "bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-300"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name="correctAnswerOption"
                          checked={answer.isCorrect}
                          onChange={() => {
                            const updatedAnswers = editingQuestion.answers.map((a, idx) => ({
                              ...a,
                              isCorrect: idx === aIdx
                            }));
                            setEditingQuestion({ ...editingQuestion, answers: updatedAnswers });
                          }}
                          className="h-4 w-4 text-[#7F3D59] focus:ring-[#7F3D59]"
                        />

                        <input
                          type="text"
                          value={answer.text}
                          onChange={(e) => {
                            const updatedAnswers = [...editingQuestion.answers];
                            updatedAnswers[aIdx].text = e.target.value;
                            setEditingQuestion({ ...editingQuestion, answers: updatedAnswers });
                          }}
                          placeholder={`Option ${aIdx + 1} description...`}
                          className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#7F3D59] focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#FDF8F9] border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuestionModal}
                  disabled={isSavingQuestion}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#7F3D59] hover:bg-[#5E2C41] rounded-xl shadow-sm disabled:opacity-50"
                >
                  {isSavingQuestion ? "Saving..." : "Save Question"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create New Quiz Modal */}
      <AnimatePresence>
        {isCreateQuizModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-[#EAD7E0] max-w-lg w-full overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-[#FDF8F9]">
                <h3 className="text-base font-serif font-bold text-gray-900">
                  Author New Assessment Quiz
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreateQuizModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Quiz Title *
                  </label>
                  <input
                    type="text"
                    value={newQuizName}
                    onChange={(e) => setNewQuizName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#7F3D59] focus:outline-none"
                    placeholder="e.g. Due Diligence & Valuation Essentials"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Target Masterclass
                  </label>
                  <select
                    value={newQuizCourseId}
                    onChange={(e) => setNewQuizCourseId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#7F3D59] focus:outline-none"
                  >
                    <option value="">No specific course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Instructions / Description
                  </label>
                  <textarea
                    rows={3}
                    value={newQuizIntro}
                    onChange={(e) => setNewQuizIntro(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#7F3D59] focus:outline-none resize-none"
                    placeholder="Guidance for entrepreneurs before attempting this test..."
                  />
                </div>
              </div>

              <div className="p-4 bg-[#FDF8F9] border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateQuizModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewQuiz}
                  disabled={isCreatingQuiz || !newQuizName.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#7F3D59] hover:bg-[#5E2C41] rounded-xl shadow-sm disabled:opacity-50"
                >
                  {isCreatingQuiz ? "Creating..." : "Create Quiz"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
