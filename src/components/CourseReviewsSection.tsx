"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  submitCourseReview,
  deleteOwnCourseReview,
} from "@/app/courses/[id]/reviewActions";
import {
  summarizeCourseReviews,
  type CourseReviewRecord,
} from "@/lib/courseReviews";
import {
  Star,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Award,
} from "@/components/Icons";

/**
 * Renders a row of 5 crisp SVG stars indicating rating value.
 *
 * @param rating - Numeric rating out of 5.
 * @param sizeClass - Tailwind size utility for stars.
 * @returns Star row element.
 */
export function StarRatingDisplay({
  rating,
  sizeClass = "w-4 h-4",
}: {
  rating: number;
  sizeClass?: string;
}) {
  const rounded = Math.round(rating);
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${
            star <= rounded
              ? "text-[#D4AF37] fill-[#D4AF37]"
              : "text-gray-300 fill-transparent"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Interactive review composer shared across Course Overview, Course Player, and Certificate pages.
 * Enforces that only 100%-completed graduates see and submit the form.
 */
export function CourseReviewComposer({
  courseId,
  courseTitle,
  existingReview,
  onSaved,
}: {
  courseId: string;
  courseTitle?: string;
  existingReview?: {
    id?: string;
    rating: number;
    title?: string | null;
    comment: string;
  } | null;
  onSaved?: (review: {
    id: string;
    rating: number;
    title: string | null;
    comment: string;
    createdAt: string;
  }) => void;
}) {
  const router = useRouter();
  const [rating, setRating] = useState<number>(existingReview?.rating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [title, setTitle] = useState<string>(existingReview?.title || "");
  const [comment, setComment] = useState<string>(existingReview?.comment || "");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    const res = await submitCourseReview(courseId, {
      rating,
      title,
      comment,
    });

    setSubmitting(false);
    if (!res.success || !res.review) {
      setFeedback({ type: "error", text: res.error || "Unable to save review." });
      return;
    }

    setFeedback({
      type: "success",
      text: existingReview
        ? "Your verified graduate review has been updated."
        : "Thank you. Your verified graduate review is now published.",
    });
    if (onSaved) {
      onSaved(res.review);
    }
    router.refresh();
  };

  const handleDelete = async () => {
    setDeleting(true);
    setFeedback(null);
    const res = await deleteOwnCourseReview(courseId);
    setDeleting(false);
    if (!res.success) {
      setFeedback({ type: "error", text: res.error || "Unable to remove review." });
      return;
    }
    setTitle("");
    setComment("");
    setRating(5);
    setFeedback({ type: "success", text: "Your review has been removed." });
    router.refresh();
  };

  const activeStars = hoverRating || rating;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#FDF8F9] rounded-2xl p-6 border border-[#EAD7E0] space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% Completion Verified</span>
          </span>
          <h4 className="text-base font-serif font-bold text-[#1D0B14] mt-0.5">
            {existingReview
              ? "Update Your Graduate Review"
              : `Rate & Review${courseTitle ? `: ${courseTitle}` : ""}`}
          </h4>
        </div>
        {existingReview && (
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
          >
            {deleting ? "Removing..." : "Remove Review"}
          </button>
        )}
      </div>

      {/* Interactive Star Picker */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-gray-700">
          Your Overall Rating ({rating} / 5)
        </label>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
              aria-label={`Rate ${star} stars`}
              className="p-1 rounded-lg hover:bg-white transition-colors"
            >
              <Star
                className={`w-6 h-6 transition-colors ${
                  star <= activeStars
                    ? "text-[#D4AF37] fill-[#D4AF37]"
                    : "text-gray-300 fill-transparent"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-gray-700">
          Review Headline <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <input
          type="text"
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Actionable valuation templates that helped close our seed round"
          className="w-full px-3.5 py-2.5 bg-white border border-[#EAD7E0] rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7F3D59]"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-gray-700">
          Your Experience &amp; Business Outcomes <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={3}
          required
          minLength={10}
          maxLength={2000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share how this masterclass, its case studies, and practical templates impacted your venture..."
          className="w-full px-3.5 py-2.5 bg-white border border-[#EAD7E0] rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7F3D59]"
        />
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || comment.trim().length < 10}
          className="px-5 py-2.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
        >
          {submitting
            ? "Publishing Review..."
            : existingReview
            ? "Update Verified Review"
            : "Publish Verified Review"}
        </button>
      </div>
    </form>
  );
}

/**
 * Full Coursera-style Reviews section for the pre-enrollment Course Overview page.
 * Renders aggregate star breakdown, rating filters, verified graduate reviews,
 * and a 100%-completion gated submission box.
 */
export default function CourseReviewsSection({
  courseId,
  courseTitle,
  reviews,
  isLoggedIn,
  isEnrolled,
  userProgress,
  canReview,
  currentUserReview,
}: {
  courseId: string;
  courseTitle: string;
  reviews: CourseReviewRecord[];
  isLoggedIn: boolean;
  isEnrolled: boolean;
  userProgress: number;
  canReview: boolean;
  currentUserReview: CourseReviewRecord | null;
}) {
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | null>(null);
  const summary = useMemo(() => summarizeCourseReviews(reviews), [reviews]);

  const filteredReviews = useMemo(() => {
    if (!selectedStarFilter) return reviews;
    return reviews.filter((r) => Math.round(r.rating) === selectedStarFilter);
  }, [reviews, selectedStarFilter]);

  return (
    <section
      id="reviews"
      className="bg-white rounded-2xl p-8 sm:p-10 shadow-xs border border-[#EAD7E0] space-y-8 scroll-mt-32"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#7F3D59] block">
            Verified Graduate Feedback
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1D0B14] mt-1">
            Learner Reviews &amp; Ratings
          </h2>
          <p className="text-xs text-gray-600 mt-1">
            Reviews are exclusively unlocked once an enrolled founder reaches 100% curriculum completion.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>100% Completion Verified</span>
        </div>
      </div>

      {/* Coursera Rating Summary + Star Distribution Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-5">
          <div className="p-6 rounded-2xl bg-[#FDF8F9] border border-[#EAD7E0] space-y-4">
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-serif font-black text-[#1D0B14]">
                {summary.totalReviews > 0 ? summary.averageRating.toFixed(1) : "—"}
              </span>
              <div className="space-y-1">
                <StarRatingDisplay rating={summary.averageRating} sizeClass="w-4 h-4" />
                <p className="text-xs font-semibold text-gray-600">
                  {summary.totalReviews}{" "}
                  {summary.totalReviews === 1 ? "verified review" : "verified reviews"}
                </p>
              </div>
            </div>

            {/* 5 to 1 Distribution */}
            <div className="space-y-2 pt-2 border-t border-[#EAD7E0]">
              {([5, 4, 3, 2, 1] as const).map((star) => {
                const count = summary.distribution[star];
                const pct =
                  summary.totalReviews > 0
                    ? Math.round((count / summary.totalReviews) * 100)
                    : 0;
                const isSelected = selectedStarFilter === star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSelectedStarFilter(isSelected ? null : star)}
                    className={`w-full flex items-center gap-2.5 text-xs py-1 px-1.5 rounded-lg transition-colors ${
                      isSelected ? "bg-white ring-1 ring-[#7F3D59]" : "hover:bg-white/70"
                    }`}
                  >
                    <span className="w-12 text-left font-semibold text-gray-700 shrink-0">
                      {star} {star === 1 ? "star" : "stars"}
                    </span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#D4AF37] rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-9 text-right font-mono text-[11px] text-gray-500">
                      {pct}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Review Submission / Eligibility Box */}
          {canReview ? (
            <CourseReviewComposer
              courseId={courseId}
              courseTitle={courseTitle}
              existingReview={currentUserReview}
            />
          ) : isEnrolled ? (
            <div className="p-5 rounded-2xl bg-[#FDF8F9] border border-[#EAD7E0] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#7F3D59]">
                <Lock className="w-4 h-4 text-[#7F3D59] shrink-0" />
                <span>Review Locked Until 100% Completion</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                You are currently at <strong>{Math.round(userProgress)}%</strong> progress.
                Complete all modules in this masterclass to unlock verified review submission.
              </p>
              <Link
                href={`/course/${courseId}`}
                className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-xs font-bold transition-colors"
              >
                Continue Masterclass
              </Link>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                <Award className="w-4 h-4 text-[#7F3D59] shrink-0" />
                <span>Verified Graduates Only</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                {isLoggedIn
                  ? "Enroll in this masterclass and reach 100% completion to rate and review the curriculum."
                  : "Sign in, enroll, and complete 100% of the modules to submit a verified graduate review."}
              </p>
            </div>
          )}
        </div>

        {/* Right Review List */}
        <div className="lg:col-span-8 space-y-5">
          {/* Star Filter Chips */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedStarFilter(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  selectedStarFilter === null
                    ? "bg-[#7F3D59] text-white border-[#7F3D59]"
                    : "bg-white text-gray-700 border-gray-200 hover:border-[#7F3D59]"
                }`}
              >
                All Reviews ({summary.totalReviews})
              </button>
              {([5, 4, 3, 2, 1] as const)
                .filter((s) => summary.distribution[s] > 0)
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      setSelectedStarFilter(selectedStarFilter === s ? null : s)
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors inline-flex items-center gap-1 ${
                      selectedStarFilter === s
                        ? "bg-[#7F3D59] text-white border-[#7F3D59]"
                        : "bg-white text-gray-700 border-gray-200 hover:border-[#7F3D59]"
                    }`}
                  >
                    <span>{s}</span>
                    <Star className="w-3 h-3 text-[#D4AF37] fill-[#D4AF37]" />
                    <span className="text-[11px] opacity-80">
                      ({summary.distribution[s]})
                    </span>
                  </button>
                ))}
            </div>
          </div>

          {filteredReviews.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#FDF8F9] border border-dashed border-[#EAD7E0] text-center space-y-2">
              <p className="text-sm font-serif font-bold text-gray-800">
                {selectedStarFilter
                  ? `No ${selectedStarFilter}-star reviews yet`
                  : "No verified reviews yet"}
              </p>
              <p className="text-xs text-gray-500">
                Be the first AWIEF founder to complete 100% of this masterclass and publish an outcome review.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map((rev) => {
                const authorName = rev.user?.name || "AWIEF Graduate";
                const initials = authorName
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                const subtitleParts = [
                  rev.user?.profession,
                  rev.user?.organization,
                  rev.user?.country,
                ].filter(Boolean);
                const dateLabel = new Date(rev.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });

                return (
                  <article
                    key={rev.id}
                    className="p-6 rounded-2xl border border-[#EAD7E0] bg-white hover:border-[#7F3D59]/40 transition-colors space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#7F3D59]/10 text-[#7F3D59] border border-[#7F3D59]/20 flex items-center justify-center font-bold text-xs shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-[#1D0B14]">
                              {authorName}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>100% Completed</span>
                            </span>
                          </div>
                          {subtitleParts.length > 0 && (
                            <p className="text-xs text-gray-500">
                              {subtitleParts.join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 self-start sm:self-auto">
                        <StarRatingDisplay rating={rev.rating} sizeClass="w-3.5 h-3.5" />
                        <span className="text-[11px] text-gray-400">{dateLabel}</span>
                      </div>
                    </div>

                    {rev.title && (
                      <h5 className="text-sm font-serif font-bold text-[#1D0B14]">
                        {rev.title}
                      </h5>
                    )}
                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                      {rev.comment}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
