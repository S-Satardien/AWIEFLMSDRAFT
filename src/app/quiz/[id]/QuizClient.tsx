"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { submitQuizAttempt, submitQuizReviewComment, getQuizComments, updateQuizComment, deleteQuizComment } from "./actions";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function QuizClient({ quiz, userId, role, reviewMode = false }: { quiz: any, userId: string, role?: string, reviewMode?: boolean }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ passed: boolean, percentage: number } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const router = useRouter();

  // Load saved progress
  useEffect(() => {
    const savedState = localStorage.getItem(`vacfa-quiz-state-${userId}-${quiz.id}`);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.currentQuestionIndex !== undefined) setCurrentQuestionIndex(parsed.currentQuestionIndex);
        if (parsed.selectedAnswers) setSelectedAnswers(parsed.selectedAnswers);
      } catch (e) {}
    }
    setIsLoaded(true);
  }, [userId, quiz.id]);

  // Save progress
  useEffect(() => {
    if (isLoaded && !result) {
      localStorage.setItem(`vacfa-quiz-state-${userId}-${quiz.id}`, JSON.stringify({
        currentQuestionIndex,
        selectedAnswers
      }));
    }
  }, [currentQuestionIndex, selectedAnswers, userId, quiz.id, isLoaded, result]);

  // Review Mode State
  const isReviewer = (role === "ADMIN" || role === "REVIEWER") && reviewMode;
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [allComments, setAllComments] = useState<any[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);

  useEffect(() => {
    if (isReviewer) {
      loadComments();
    }
  }, [isReviewer]);

  const loadComments = async () => {
    try {
      const data = await getQuizComments(quiz.id.toString());
      setAllComments(data);
    } catch (e) {
      console.error(e);
    }
  };

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;
  
  const handleSelect = (questionId: number, answerId: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answerId
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    let score = 0;
    const detailsObj: Record<string, { isCorrect: boolean, selectedAnswerId: number | null }> = {};
    
    // Calculate score and build details
    quiz.questions.forEach((q: any) => {
      const selectedId = selectedAnswers[q.id] || null;
      const correctAns = q.answers.find((a: any) => a.isCorrect);
      const isCorrect = correctAns && selectedId === correctAns.id;
      
      if (isCorrect) {
        score += 1;
      }
      
      detailsObj[q.id.toString()] = {
        isCorrect: !!isCorrect,
        selectedAnswerId: selectedId,
      };
    });

    try {
      const detailsStr = JSON.stringify(detailsObj);
      const res = await submitQuizAttempt(userId, quiz.id.toString(), score, totalQuestions, detailsStr);
      setResult(res);
      // Clear saved progress
      localStorage.removeItem(`vacfa-quiz-state-${userId}-${quiz.id}`);
    } catch (e) {
      console.error(e);
      alert("Failed to save quiz attempt.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewComment.trim()) return;
    setIsSubmittingReview(true);
    try {
      if (editingCommentId) {
        await updateQuizComment(editingCommentId, reviewComment, userId);
        alert("Review comment updated successfully!");
      } else {
        const cleanQuestionText = currentQuestion.questiontext.replace(/<[^>]+>/g, '');
        await submitQuizReviewComment(userId, quiz.id.toString(), currentQuestionIndex + 1, reviewComment, cleanQuestionText.substring(0, 50) + "...");
        alert("Review comment submitted successfully!");
      }
      setReviewComment("");
      setEditingCommentId(null);
      setIsReviewing(false);
      loadComments();
    } catch (e: any) {
      alert(e.message || "Failed to submit review.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleEditClick = (comment: any) => {
    setEditingCommentId(comment.id);
    setReviewComment(comment.comment);
    setIsReviewing(true);
  };

  const handleDeleteComment = async (id: string) => {
    if (confirm("Are you sure you want to delete this comment?")) {
      try {
        await deleteQuizComment(id, userId);
        loadComments();
        if (editingCommentId === id) {
          setEditingCommentId(null);
          setReviewComment("");
          setIsReviewing(false);
        }
      } catch (e: any) {
        alert(e.message || "Failed to delete comment.");
      }
    }
  };

  const currentQuestionComments = allComments.filter(c => c.lessonHash === `Question ${currentQuestionIndex + 1}`);

  if (result) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl overflow-hidden p-8 text-center border border-gray-100"
      >
        <div className={`mx-auto flex items-center justify-center h-24 w-24 rounded-full ${result.passed ? 'bg-green-100' : 'bg-red-100'} mb-6`}>
          {result.passed ? (
            <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {result.passed ? "Congratulations!" : "Keep Trying!"}
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          You scored <span className="font-bold text-vacfa-charcoal">{Math.round(result.percentage)}%</span> on this module.
          {result.passed ? " You have successfully passed this quiz." : " A score of 80% is required to pass."}
        </p>
        
        <div className="flex justify-center gap-4">
          {!result.passed && (
            <button 
              onClick={() => {
                setResult(null);
                setCurrentQuestionIndex(0);
                setSelectedAnswers({});
              }}
              className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Retry Quiz
            </button>
          )}
          <Link 
            href="/dashboard"
            className="px-6 py-3 bg-vacfa-red text-white font-medium rounded-lg hover:bg-[#8B171C] transition-colors shadow-md hover:shadow-lg"
          >
            Return to Dashboard
          </Link>
        </div>
      </motion.div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vacfa-red"></div>
      </div>
    );
  }

  // Calculate progress %
  const progressPercent = ((currentQuestionIndex) / totalQuestions) * 100;

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 relative">
      {/* Progress Bar */}
      <div className="h-2 w-full bg-gray-100">
        <motion.div 
          className="h-full bg-vacfa-red"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="p-8">
        {/* Top Controls: Back & Status */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <Link 
            href="/dashboard"
            className="flex items-center text-sm font-medium text-gray-500 hover:text-vacfa-red transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 font-medium">
              {Object.keys(selectedAnswers).length} of {totalQuestions} Answered
            </span>
          </div>
        </div>

        {/* Question Navigator */}
        <div className="flex flex-wrap gap-2 mb-10 pb-6 border-b border-gray-100 justify-center">
          {quiz.questions.map((_: any, index: number) => {
            const isAnswered = selectedAnswers[quiz.questions[index].id] !== undefined;
            const isCurrent = currentQuestionIndex === index;
            
            return (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                  isCurrent 
                    ? 'bg-vacfa-charcoal text-white ring-2 ring-offset-2 ring-vacfa-charcoal'
                    : isAnswered 
                      ? 'bg-vacfa-red text-white hover:bg-[#8B171C]'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>

        <div className="flex justify-between items-center mb-6">
          <span className="text-sm font-semibold tracking-wider text-vacfa-red uppercase">
            Question {currentQuestionIndex + 1}
          </span>
          {isReviewer && (
            <button
              onClick={() => setIsReviewing(!isReviewing)}
              className="px-4 py-1.5 bg-indigo-50 text-indigo-700 font-bold text-xs uppercase tracking-wider rounded-md hover:bg-indigo-100 transition-colors border border-indigo-200"
            >
              {isReviewing ? "Cancel Review" : "Leave Feedback"}
            </button>
          )}
        </div>

        {isReviewing && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-8 p-6 bg-indigo-50 border border-indigo-200 rounded-xl"
          >
            <h4 className="text-sm font-bold text-indigo-900 mb-2">Reviewer Feedback for Q{currentQuestionIndex + 1}</h4>
            <textarea 
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="What needs to be changed in this question?"
              className="w-full h-24 p-3 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
            <div className="flex justify-end mt-3">
              <button 
                onClick={handleReviewSubmit}
                disabled={isSubmittingReview || !reviewComment.trim()}
                className="px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isSubmittingReview ? "Saving..." : "Save Comment"}
              </button>
            </div>
          </motion.div>
        )}

        {isReviewer && currentQuestionComments.length > 0 && (
          <div className="mb-8 space-y-4">
            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-100 pb-2">Existing Feedback</h4>
            {currentQuestionComments.map(comment => (
              <div key={comment.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900">{comment.user?.name || comment.user?.email}</span>
                    <span className="text-xs text-gray-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                    {comment.status === 'RESOLVED' && <span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-bold">RESOLVED</span>}
                  </div>
                  {comment.userId === userId && comment.status === 'OPEN' && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEditClick(comment)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">Edit</button>
                      <button onClick={() => handleDeleteComment(comment.id)} className="text-xs font-bold text-red-600 hover:text-red-800">Delete</button>
                    </div>
                  )}
                </div>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{comment.comment}</p>
              </div>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Question Text */}
            <div 
              className="text-2xl font-medium text-gray-900 mb-8 prose prose-lg max-w-none prose-p:my-2"
              dangerouslySetInnerHTML={{ __html: currentQuestion.questiontext }}
            />

            {/* Answers */}
            <div className="space-y-3">
              {currentQuestion.answers.map((ans: any) => {
                const isSelected = selectedAnswers[currentQuestion.id] === ans.id;
                return (
                  <button
                    key={ans.id}
                    onClick={() => handleSelect(currentQuestion.id, ans.id)}
                    className={`w-full text-left px-6 py-4 rounded-xl border-2 transition-all duration-200 ${
                      isSelected 
                        ? 'border-vacfa-red bg-red-50/30' 
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 h-5 w-5 rounded-full border flex items-center justify-center mr-4 ${
                        isSelected ? 'border-vacfa-red' : 'border-gray-300'
                      }`}>
                        {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-vacfa-red" />}
                      </div>
                      <div 
                        className={`text-lg prose prose-p:my-0 ${isSelected ? 'text-vacfa-red font-medium' : 'text-gray-700'}`}
                        dangerouslySetInnerHTML={{ __html: ans.text }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Footer Navigation */}
        <div className="mt-12 flex justify-between items-center border-t border-gray-100 pt-6">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="px-6 py-2.5 text-gray-600 font-medium rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          {currentQuestionIndex === totalQuestions - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || Object.keys(selectedAnswers).length < totalQuestions}
              className="px-8 py-2.5 bg-vacfa-red text-white font-bold rounded-lg hover:bg-[#8B171C] disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-colors"
            >
              {isSubmitting ? "Submitting..." : "Submit Quiz"}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-8 py-2.5 bg-vacfa-charcoal text-white font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
            >
              Next Question
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
