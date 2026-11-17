const test = require("node:test");
const assert = require("node:assert/strict");
const { createJiti } = require("jiti");

const jiti = createJiti(__filename);
const {
  summarizeCourseReviews,
  extractCourseSkills,
} = jiti("./courseReviews.ts");

test("summarizeCourseReviews handles empty lists cleanly", () => {
  const result = summarizeCourseReviews([]);
  assert.equal(result.averageRating, 0);
  assert.equal(result.totalReviews, 0);
  assert.deepEqual(result.distribution, { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
});

test("summarizeCourseReviews aggregates ratings and distribution accurately", () => {
  const result = summarizeCourseReviews([
    { rating: 5 },
    { rating: 5 },
    { rating: 4 },
  ]);
  assert.equal(result.totalReviews, 3);
  assert.equal(result.averageRating, 4.7);
  assert.deepEqual(result.distribution, { 5: 2, 4: 1, 3: 0, 2: 0, 1: 0 });
});

test("extractCourseSkills deduplicates category and domain competency skills", () => {
  const skills = extractCourseSkills(
    {
      category: "Capital Raising",
      title: "Investment Readiness & Valuation",
      learningObjectives: JSON.stringify([
        "Build SAFE note cap tables and prepare an investor data room",
        "Manage rolling cashflow runway and unit economics",
      ]),
    },
    [{ title: "Module 1: Investor Due Diligence", summary: "Gender-lens DFI syndicates" }]
  );

  assert.ok(skills.includes("Capital Raising"));
  assert.ok(skills.includes("Valuation & Cap Table Modeling"));
  assert.ok(skills.includes("Investor Data Room Readiness"));
  assert.ok(skills.includes("Cashflow & Runway Governance"));
  assert.equal(new Set(skills).size, skills.length);
});
