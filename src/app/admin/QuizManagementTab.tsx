"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
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

/**
 * Helper to strip HTML tags for clean display in preview fields
 */
function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, "").trim();
}

export default function QuizManagementTab() {
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Quiz Metadata Edit State
  const [isEditingQuizMeta, setIsEditingQuizMeta] = useState<boolean>(false);
  const [quizName, setQuizName] = useState<string>("");
  const [quizIntro, setQuizIntro] = useState<string>("");
  const [isSavingMeta, setIsSavingMeta] = useState<boolean>(false);

  // Create Quiz Modal State
  const [isCreateQuizModalOpen, setIsCreateQuizModalOpen] = useState<boolean>(false);
  const [newQuizName, setNewQuizName] = useState<string>("");
  const [newQuizIntro, setNewQuizIntro] = useState<string>("");
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

  const loadQuizzes = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await getQuizzesForManagement();
      setQuizzes(data);
      if (data.length > 0) {
        setSelectedQuizId((prev) => (prev !== null && data.some((q) => q.id === prev) ? prev : data[0].id));
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load quiz list.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedQuiz = quizzes.find((q) => q.id === selectedQuizId);

  // Synchronize metadata edit state when selected quiz changes
  useEffect(() => {
    if (selectedQuiz) {
      setQuizName(selectedQuiz.name || "");
      setQuizIntro(selectedQuiz.intro || "");
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
        intro: quizIntro
      });
      setQuizzes((prev) => prev.map((q) => (q.id === selectedQuizId ? updated : q)));
      setIsEditingQuizMeta(false);
      showNotification("Quiz metadata updated successfully!");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update quiz.");
    } finally {
      setIsSavingMeta(false);
    }
  };

  const handleCreateNewQuiz = async () => {
    if (!newQuizName.trim()) {
      setErrorMsg("Please enter a title for the new quiz.");
      return;
    }
    setIsCreatingQuiz(true);
    setErrorMsg(null);
    try {
      const created = await createNewQuiz({
        name: newQuizName,
        intro: newQuizIntro
      });
      setQuizzes((prev) => [...prev, created]);
      setSelectedQuizId(created.id);
      setIsCreateQuizModalOpen(false);
      setNewQuizName("");
      setNewQuizIntro("");
      showNotification(`Created ${created.name} successfully!`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create quiz.");
    } finally {
      setIsCreatingQuiz(false);
    }
  };

  const handleDeleteQuiz = async (quizId: number) => {
    const qToDelete = quizzes.find((q) => q.id === quizId);
    if (!qToDelete) return;
    if (!confirm(`Are you sure you want to delete "${qToDelete.name}"? This action cannot be undone.`)) {
      return;
    }
    setErrorMsg(null);
    try {
      const updatedList = await deleteQuiz(quizId);
      setQuizzes(updatedList);
      if (updatedList.length > 0) {
        setSelectedQuizId(updatedList[0].id);
      } else {
        setSelectedQuizId(null);
      }
      showNotification("Quiz deleted successfully.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete quiz.");
    }
  };

  const handleOpenNewQuestionModal = () => {
    setEditingQuestion({
      name: `Question ${(selectedQuiz?.questions.length || 0) + 1}`,
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

  const handleOpenEditQuestionModal = (question: QuestionItem) => {
    setEditingQuestion({
      id: question.id,
      name: question.name,
      questiontext: stripHtml(question.questiontext),
      answers: question.answers.map((a) => ({
        id: a.id,
        text: stripHtml(a.text),
        isCorrect: a.isCorrect
      }))
    });
    setQuestionModalError(null);
  };

  const handleSaveQuestion = async () => {
    if (!selectedQuizId || !editingQuestion) return;

    // Validation
    if (!editingQuestion.questiontext.trim()) {
      setQuestionModalError("Please enter the question text.");
      return;
    }
    const emptyAnswers = editingQuestion.answers.some((a) => !a.text.trim());
    if (emptyAnswers) {
      setQuestionModalError("All answer option fields must be filled out.");
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
      <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-gray-500">
        <div className="w-10 h-10 border-4 border-vacfa-red border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-semibold text-gray-700">Loading Quiz Manager...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium flex items-center shadow-sm"
          >
            <svg className="w-5 h-5 mr-3 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Error Banner */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium flex items-center shadow-sm">
          <svg className="w-5 h-5 mr-3 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          {errorMsg}
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-vacfa-charcoal to-indigo-950 rounded-2xl shadow-md p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Interactive Quiz Manager</h2>
          <p className="text-gray-300 text-sm mt-1">
            Create, edit, or customize quiz questions, point structures, and answer choices.
          </p>
        </div>
        <button
          onClick={() => setIsCreateQuizModalOpen(true)}
          className="px-4 py-2.5 bg-vacfa-red hover:bg-[#8B171C] text-white font-bold rounded-lg transition-colors flex items-center shadow-sm self-start md:self-auto text-sm"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Create New Quiz
        </button>
      </div>

      {/* Quiz Selector Navigation Tabs */}
      <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm flex items-center gap-2 overflow-x-auto">
        {quizzes.map((quiz) => (
          <button
            key={quiz.id}
            onClick={() => setSelectedQuizId(quiz.id)}
            className={`px-4 py-2.5 rounded-lg font-bold text-sm transition-all whitespace-nowrap flex items-center gap-2 ${
              selectedQuizId === quiz.id
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <span>Quiz {quiz.id}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                selectedQuizId === quiz.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              {quiz.questions?.length || 0} Qs
            </span>
          </button>
        ))}
      </div>

      {selectedQuiz ? (
        <div className="space-y-6">
          {/* Selected Quiz Overview & Metadata Card */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                  Quiz ID: {selectedQuiz.id}
                </span>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{selectedQuiz.name}</h3>
                {selectedQuiz.intro && (
                  <p className="text-gray-500 text-sm mt-1 italic">{selectedQuiz.intro}</p>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/quiz/${selectedQuiz.id}`}
                  target="_blank"
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-xs transition-colors flex items-center border border-gray-300"
                >
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                  </svg>
                  Preview Quiz
                </Link>
                <Link
                  href={`/quiz/${selectedQuiz.id}?mode=review`}
                  target="_blank"
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-lg text-xs transition-colors flex items-center border border-emerald-200"
                >
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                  </svg>
                  Review Mode
                </Link>
                <button
                  onClick={() => setIsEditingQuizMeta(!isEditingQuizMeta)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs transition-colors border border-indigo-200"
                >
                  {isEditingQuizMeta ? "Close Edit" : "Edit Title"}
                </button>
                {selectedQuiz.id > 6 && (
                  <button
                    onClick={() => handleDeleteQuiz(selectedQuiz.id)}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-lg text-xs transition-colors border border-red-200"
                  >
                    Delete Quiz
                  </button>
                )}
              </div>
            </div>

            {/* Quiz Title & Intro Inline Editor */}
            {isEditingQuizMeta && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-5 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Quiz Title</label>
                  <input
                    type="text"
                    value={quizName}
                    onChange={(e) => setQuizName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. Overview of Vaccinology"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Instructions / Description (Optional)</label>
                  <textarea
                    rows={2}
                    value={quizIntro}
                    onChange={(e) => setQuizIntro(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                    placeholder="Provide context or instructions for participants..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditingQuizMeta(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveQuizMetadata}
                    disabled={isSavingMeta}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
                  >
                    {isSavingMeta ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Questions Section Header */}
            <div className="mt-6 flex items-center justify-between">
              <div>
                <h4 className="text-lg font-bold text-gray-900">Questions ({selectedQuiz.questions.length})</h4>
                <p className="text-xs text-gray-500 mt-0.5">Manage multiple-choice questions and correct answer keys.</p>
              </div>
              <button
                onClick={handleOpenNewQuestionModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center shadow-sm"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Add Question
              </button>
            </div>

            {/* Questions List */}
            <div className="mt-6 space-y-4">
              {selectedQuiz.questions.length === 0 ? (
                <div className="p-10 border-2 border-dashed border-gray-200 rounded-xl text-center text-gray-400">
                  <p className="font-semibold text-sm">No questions in this quiz yet.</p>
                  <button
                    onClick={handleOpenNewQuestionModal}
                    className="mt-3 px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-xs hover:bg-indigo-100"
                  >
                    Create First Question
                  </button>
                </div>
              ) : (
                selectedQuiz.questions.map((question, idx) => (
                  <div
                    key={question.id}
                    className="p-5 bg-gray-50/70 hover:bg-white rounded-xl border border-gray-200 transition-all hover:shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-xs shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-900 text-sm">{question.name || `Question ${idx + 1}`}</h5>
                          <p className="text-gray-700 text-sm mt-1 leading-relaxed font-medium">
                            {stripHtml(question.questiontext)}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <button
                          onClick={() => handleOpenEditQuestionModal(question)}
                          className="px-3 py-1.5 bg-white hover:bg-gray-100 text-indigo-600 font-bold rounded-lg text-xs border border-gray-200 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 font-bold rounded-lg text-xs border border-gray-200 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Answers List */}
                    <div className="mt-4 pl-10 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {question.answers.map((answer, aIdx) => (
                        <div
                          key={answer.id || aIdx}
                          className={`p-2.5 rounded-lg border text-xs flex items-start justify-between gap-2 ${
                            answer.isCorrect
                              ? "bg-emerald-50/80 border-emerald-300 text-emerald-900 font-semibold"
                              : "bg-white border-gray-200 text-gray-600"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="font-bold uppercase text-gray-400">{String.fromCharCode(65 + aIdx)}.</span>
                            <span>{stripHtml(answer.text)}</span>
                          </div>
                          {answer.isCorrect && (
                            <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                              Correct
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center text-gray-500">
          <p className="font-semibold">Select or create a quiz to begin managing questions.</p>
        </div>
      )}

      {/* Edit / Add Question Modal */}
      <AnimatePresence>
        {editingQuestion && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingQuestion.id ? `Edit ${editingQuestion.name}` : "Add New Question"}
                </h3>
                <button
                  onClick={() => setEditingQuestion(null)}
                  className="text-gray-400 hover:text-gray-600 rounded-lg p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {questionModalError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg">
                    {questionModalError}
                  </div>
                )}

                {/* Question Label / Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Question Identifier</label>
                  <input
                    type="text"
                    value={editingQuestion.name || ""}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. Question 1"
                  />
                </div>

                {/* Question Prompt */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Question Text <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={editingQuestion.questiontext}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, questiontext: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none font-medium text-gray-800"
                    placeholder="Enter the question prompt..."
                  />
                </div>

                {/* Answer Choices */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase">
                      Answer Choices <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-gray-500">Select the radio button for the correct answer</span>
                  </div>

                  <div className="space-y-3">
                    {editingQuestion.answers.map((answer, aIdx) => (
                      <div
                        key={aIdx}
                        className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                          answer.isCorrect ? "bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-300" : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        {/* Radio selection for correct answer */}
                        <label className="flex items-center cursor-pointer shrink-0">
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
                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                          />
                        </label>

                        <span className="font-bold text-xs text-gray-500 uppercase">{String.fromCharCode(65 + aIdx)}.</span>

                        {/* Answer text input */}
                        <input
                          type="text"
                          value={answer.text}
                          onChange={(e) => {
                            const updatedAnswers = [...editingQuestion.answers];
                            updatedAnswers[aIdx].text = e.target.value;
                            setEditingQuestion({ ...editingQuestion, answers: updatedAnswers });
                          }}
                          className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          placeholder={`Option ${String.fromCharCode(65 + aIdx)} text...`}
                        />

                        {/* Remove Choice button */}
                        {editingQuestion.answers.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const wasCorrect = answer.isCorrect;
                              const updatedAnswers = editingQuestion.answers.filter((_, idx) => idx !== aIdx);
                              if (wasCorrect && updatedAnswers.length > 0) {
                                updatedAnswers[0].isCorrect = true;
                              }
                              setEditingQuestion({ ...editingQuestion, answers: updatedAnswers });
                            }}
                            className="text-gray-400 hover:text-red-600 p-1"
                            title="Remove choice"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {editingQuestion.answers.length < 6 && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingQuestion({
                          ...editingQuestion,
                          answers: [...editingQuestion.answers, { text: "", isCorrect: false }]
                        });
                      }}
                      className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                      </svg>
                      Add Option {String.fromCharCode(65 + editingQuestion.answers.length)}
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuestion}
                  disabled={isSavingQuestion}
                  className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50 flex items-center"
                >
                  {isSavingQuestion && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  )}
                  Save Question
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create New Quiz Modal */}
      <AnimatePresence>
        {isCreateQuizModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="text-lg font-bold text-gray-900">Create New Quiz</h3>
                <button
                  onClick={() => setIsCreateQuizModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 rounded-lg p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Quiz Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newQuizName}
                    onChange={(e) => setNewQuizName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. Clinical Vaccine Trials"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Instructions / Description</label>
                  <textarea
                    rows={3}
                    value={newQuizIntro}
                    onChange={(e) => setNewQuizIntro(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                    placeholder="Instructions for participants before starting..."
                  />
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateQuizModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewQuiz}
                  disabled={isCreatingQuiz || !newQuizName.trim()}
                  className="px-5 py-2 text-sm font-bold text-white bg-vacfa-red hover:bg-[#8B171C] rounded-lg shadow-sm disabled:opacity-50 flex items-center"
                >
                  {isCreatingQuiz && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  )}
                  Create Quiz
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
