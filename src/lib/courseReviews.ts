export interface CourseReviewRecord {
  id: string;
  userId: string;
  courseId: string;
  rating: number;
  title?: string | null;
  comment: string;
  isVerified: boolean;
  createdAt: string | Date;
  updatedAt?: string | Date;
  user?: {
    name?: string | null;
    profession?: string | null;
    organization?: string | null;
    country?: string | null;
  } | null;
}

export interface CourseReviewSummary {
  averageRating: number;
  totalReviews: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

/**
 * Computes aggregate average rating, review count, and star distribution
 * from a list of verified course reviews.
 *
 * @param reviews - Array of review records for a course.
 * @returns Aggregated rating summary metrics.
 */
export function summarizeCourseReviews(
  reviews: Array<{ rating: number }>
): CourseReviewSummary {
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  if (!reviews || reviews.length === 0) {
    return { averageRating: 0, totalReviews: 0, distribution };
  }

  let sum = 0;
  let validCount = 0;
  for (const r of reviews) {
    const clamped = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 0))) as
      | 1
      | 2
      | 3
      | 4
      | 5;
    if (clamped >= 1 && clamped <= 5) {
      distribution[clamped] += 1;
      sum += clamped;
      validCount += 1;
    }
  }

  return {
    averageRating: validCount > 0 ? Number((sum / validCount).toFixed(1)) : 0,
    totalReviews: validCount,
    distribution,
  };
}

const DOMAIN_SKILL_MAP: Array<[RegExp, string]> = [
  [/valuation|cap table|equity|safe|seed|investor/i, "Valuation & Cap Table Modeling"],
  [/due diligence|data room/i, "Investor Data Room Readiness"],
  [/pitch|storytelling|deck/i, "Executive Pitch Storytelling"],
  [/cashflow|working capital|runway|liquidity/i, "Cashflow & Runway Governance"],
  [/unit economics|cac|ltv|margin/i, "Unit Economics & Margin Analysis"],
  [/afcfta|export|customs|rules of origin|tariff/i, "AfCFTA Cross-Border Trade"],
  [/supply chain|logistics|procurement/i, "Pan-African Supply Chain Scaling"],
  [/esg|impact|gender|sustainability/i, "ESG & Gender-Lens Reporting"],
  [/governance|board|compliance|tax|legal/i, "Corporate & Board Governance"],
  [/digital|ai|marketing|funnel|brand/i, "AI-Enabled Digital Growth"],
  [/papss|payment|currency|fx/i, "Cross-Border Settlement & FX"],
  [/grant|dfi|concessional|blended finance/i, "DFI & Blended Finance Strategy"],
];

/**
 * Extracts curated Coursera-style skill tags from course metadata and modules
 * so prospective learners can quickly scan competencies gained.
 *
 * @param course - Course metadata object.
 * @param modules - Parsed curriculum modules array.
 * @returns Deduplicated array of concise skill pill labels.
 */
export function extractCourseSkills(
  course: { category?: string | null; learningObjectives?: string | null; title?: string | null },
  modules: Array<{ title?: string; summary?: string; keyTakeaways?: string[] }> = []
): string[] {
  const skills = new Set<string>();
  if (course.category) {
    skills.add(course.category);
  }

  const corpusParts = [
    course.title || "",
    course.learningObjectives || "",
    ...modules.flatMap((m) => [m.title || "", m.summary || "", ...(m.keyTakeaways || [])]),
  ];
  const corpus = corpusParts.join(" ");

  for (const [pattern, label] of DOMAIN_SKILL_MAP) {
    if (pattern.test(corpus)) {
      skills.add(label);
    }
  }

  // Fallback generic competencies from concise module titles if fewer than 5 matched
  if (skills.size < 5) {
    for (const mod of modules) {
      if (!mod.title) continue;
      const cleanTitle = mod.title.replace(/^Module\s*\d+\s*[:.-]\s*/i, "").trim();
      if (cleanTitle && cleanTitle.length <= 42) {
        skills.add(cleanTitle);
      }
      if (skills.size >= 8) break;
    }
  }

  return Array.from(skills).slice(0, 10);
}
