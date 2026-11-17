import { extractZipEntries } from "./zipUtils";

export interface ImportedQuizQuestion {
  name: string;
  questiontext: string;
  answers: {
    text: string;
    isCorrect: boolean;
  }[];
}

export interface ImportedQuiz {
  sourceId?: string;
  lessonSourceId?: string;
  name: string;
  intro: string;
  passingPercentage?: number;
  questions: ImportedQuizQuestion[];
}

export interface ImportedTopic {
  id: string;
  title: string;
  duration: string;
  summary: string;
  videoUrl?: string;
  documentName?: string;
  documentUrl?: string;
}

export interface ImportedModule {
  id: string;
  sourceId?: string;
  title: string;
  duration: string;
  summary: string;
  videoUrl?: string;
  caseStudy?: string;
  keyTakeaways: string[];
  templateName?: string;
  templateUrl?: string;
  quizPrompt?: string;
  topics?: ImportedTopic[];
  attachedQuizIndex?: number;
}

export interface ParsedLearnDashCourse {
  learndashSourceId: string;
  title: string;
  slug: string;
  category: string;
  duration: string;
  shortDescription: string;
  description: string;
  targetAudience: string;
  learningObjectives: string[];
  isFree: boolean;
  priceZar: number;
  priceUsd: number;
  authorName: string;
  authorRole: string;
  authorEmail: string;
  thumbnailUrl: string;
  scormPath?: string;
  isNative?: boolean;
  modules: ImportedModule[];
  quizzes: ImportedQuiz[];
  warnings: string[];
  sourceFormat: "LEARNDASH_WXR_XML" | "LEARNDASH_JSON" | "LEARNDASH_ZIP" | "SCORM_PACKAGE";
}

/**
 * Decodes common XML/HTML entities and strips WordPress block comments and tags into clean text.
 */
function decodeHtmlEntities(input: string): string {
  if (!input) return "";
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
}

/**
 * Strips WordPress Gutenberg block comments and HTML tags into readable plain text.
 */
export function stripHtmlAndBlocks(html: string): string {
  if (!html) return "";
  const decoded = decodeHtmlEntities(html);
  return decoded
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|li|h[1-6]|br|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

/**
 * Extracts text inside a single XML tag (handling CDATA).
 */
export function extractXmlTag(block: string, tagName: string): string {
  const escaped = tagName.replace(/[:]/g, "\\:");
  const regex = new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "i");
  const match = block.match(regex);
  if (!match) return "";
  return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

/**
 * Extracts all values for a repeated XML tag.
 */
export function extractAllXmlTags(block: string, tagName: string): string[] {
  const escaped = tagName.replace(/[:]/g, "\\:");
  const regex = new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "gi");
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(block)) !== null) {
    results.push(match[1]);
  }
  return results;
}

/**
 * Extracts `<wp:postmeta>` key/value pairs from a WordPress WXR item block.
 */
function extractPostMeta(itemXml: string): Record<string, string> {
  const metaMap: Record<string, string> = {};
  const metaBlocks = extractAllXmlTags(itemXml, "wp:postmeta");
  for (const meta of metaBlocks) {
    const key = extractXmlTag(meta, "wp:meta_key");
    const val = extractXmlTag(meta, "wp:meta_value");
    if (key) {
      metaMap[key] = val;
    }
  }
  return metaMap;
}

/**
 * Extracts a string or numeric property from a PHP serialized string (best-effort) or JSON string.
 */
function extractMetaField(rawValue: string | undefined, fieldName: string): string | undefined {
  if (!rawValue) return undefined;
  const trimmed = rawValue.trim();

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && fieldName in parsed) {
        return String(parsed[fieldName] ?? "");
      }
    } catch {
      // fall through to PHP serialized regex
    }
  }

  const escapedKey = fieldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const strRegex = new RegExp(`s:\\d+:"${escapedKey}";s:\\d+:"([\\s\\S]*?)";`);
  const strMatch = trimmed.match(strRegex);
  if (strMatch) return strMatch[1];

  const numRegex = new RegExp(`s:\\d+:"${escapedKey}";(?:i|d):([\\d.]+);`);
  const numMatch = trimmed.match(numRegex);
  if (numMatch) return numMatch[1];

  return undefined;
}

/**
 * Extracts embedded video URL (MP4, YouTube, Vimeo, or iframe src) from HTML or Gutenberg blocks.
 */
export function extractVideoUrl(html: string, meta: Record<string, string>): string | undefined {
  const metaVideo =
    meta["lesson_video_url"] ||
    extractMetaField(meta["_sfwd-lessons"], "sfwd-lessons_lesson_video_url") ||
    extractMetaField(meta["_sfwd-topic"], "sfwd-topic_lesson_video_url");
  if (metaVideo && metaVideo.startsWith("http")) {
    return metaVideo.trim();
  }

  const decoded = decodeHtmlEntities(html);

  // Gutenberg wp:embed or wp:video JSON (scoped strictly within the opening comment block)
  const wpEmbedMatch = decoded.match(/<!--\s*wp:(?:embed|video)\b[\s\S]*?(?:-->|\{(?:[\s\S]*?)\}\s*-->)/i);
  if (wpEmbedMatch?.[0]) {
    const innerUrl = wpEmbedMatch[0].match(/"(?:url|src)"\s*:\s*"([^"]+)"/i);
    if (innerUrl?.[1]) return innerUrl[1];
  }

  // <video><source src="..."> or <video src="...">
  const videoSrcMatch = decoded.match(/<(?:video|source)[^>]+src=["']([^"']+)["']/i);
  if (videoSrcMatch?.[1]) return videoSrcMatch[1];

  // <iframe src="...">
  const iframeMatch = decoded.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (iframeMatch?.[1]) return iframeMatch[1];

  // Standalone YouTube / Vimeo / MP4 URL (supports both with and without www.)
  const urlMatch = decoded.match(/https?:\/\/(?:[^\s"'<>]+\.(?:mp4|webm)|(?:www\.)?youtube\.com\/watch\?v=[^\s"'<>]+|youtu\.be\/[^\s"'<>]+|(?:www\.)?vimeo\.com\/\d+)/i);
  if (urlMatch?.[0]) return urlMatch[0];

  return undefined;
}

/**
 * Extracts list items (`<li>...</li>`) as learning objectives/key takeaways.
 */
export function extractBulletList(html: string): string[] {
  const decoded = decodeHtmlEntities(html);
  const items: string[] = [];
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = liRegex.exec(decoded)) !== null) {
    const clean = stripHtmlAndBlocks(m[1]);
    if (clean && clean.length >= 4) {
      items.push(clean);
    }
  }
  return items.slice(0, 8);
}

/**
 * Extracts downloadable resource links (PDF, DOCX, XLSX, PPTX, ZIP) from HTML.
 */
export function extractResourceLink(html: string): { templateName?: string; templateUrl?: string } {
  const decoded = decodeHtmlEntities(html);
  const linkRegex = /<a[^>]+href=["']([^"']+\.(?:pdf|docx?|xlsx?|pptx?|csv|zip)(?:\?[^"']*)?)["'][^>]*>([\s\S]*?)<\/a>/i;
  const match = decoded.match(linkRegex);
  if (!match) return {};
  const url = match[1];
  const label = stripHtmlAndBlocks(match[2]) || url.split("/").pop() || "Course Resource";
  return { templateName: label, templateUrl: url };
}

/**
 * Parses `wpProQuiz` XML questions if embedded in a LearnDash XML export.
 */
function parseProQuizXmlBlocks(xml: string): ImportedQuiz[] {
  const quizzes: ImportedQuiz[] = [];
  const quizBlocks = xml.match(/<quiz\b[^>]*>[\s\S]*?<\/quiz>/gi) || [];

  for (const qBlock of quizBlocks) {
    const title = stripHtmlAndBlocks(extractXmlTag(qBlock, "title")) || "Imported Quiz";
    const intro = stripHtmlAndBlocks(extractXmlTag(qBlock, "text"));
    const questionBlocks = qBlock.match(/<question\b[^>]*>[\s\S]*?<\/question>/gi) || [];
    const questions: ImportedQuizQuestion[] = [];

    for (let i = 0; i < questionBlocks.length; i++) {
      const qb = questionBlocks[i];
      const qTitle = stripHtmlAndBlocks(extractXmlTag(qb, "title")) || `Question ${i + 1}`;
      const qText = stripHtmlAndBlocks(extractXmlTag(qb, "questionText")) || qTitle;
      const answerBlocks = qb.match(/<answer\b[^>]*>[\s\S]*?<\/answer>/gi) || [];
      const answers = answerBlocks.map((ab) => {
        const isCorrect = /correct=["'](?:true|1)["']/i.test(ab);
        const answerText = stripHtmlAndBlocks(extractXmlTag(ab, "answerText")) || stripHtmlAndBlocks(ab);
        return { text: answerText, isCorrect };
      }).filter((a) => a.text.length > 0);

      if (qText && answers.length >= 2) {
        if (!answers.some((a) => a.isCorrect)) {
          answers[0].isCorrect = true;
        }
        questions.push({
          name: qTitle,
          questiontext: qText,
          answers,
        });
      }
    }

    if (questions.length > 0 || title) {
      quizzes.push({
        name: title,
        intro,
        questions,
      });
    }
  }

  return quizzes;
}

/**
 * Generates a URL-safe slug from a course title.
 */
export function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || `course-${Date.now()}`;
}

/**
 * Parses a WordPress / LearnDash WXR XML export string into one or more normalized courses.
 *
 * @param {string} xmlContent - Raw XML file text from WordPress / LearnDash export.
 * @returns {ParsedLearnDashCourse[]} Array of normalized course objects ready for preview and import.
 */
export function parseLearnDashWxrXml(xmlContent: string): ParsedLearnDashCourse[] {
  const items = extractAllXmlTags(xmlContent, "item");

  interface WxrItem {
    postType: string;
    postId: string;
    title: string;
    slug: string;
    menuOrder: number;
    contentHtml: string;
    excerptHtml: string;
    creator: string;
    categories: string[];
    meta: Record<string, string>;
  }

  const parsedItems: WxrItem[] = items.map((raw) => {
    const postType = extractXmlTag(raw, "wp:post_type");
    const postId = extractXmlTag(raw, "wp:post_id");
    const title = decodeHtmlEntities(extractXmlTag(raw, "title"));
    const slug = extractXmlTag(raw, "wp:post_name");
    const menuOrder = parseInt(extractXmlTag(raw, "wp:menu_order") || "0", 10) || 0;
    const contentHtml = extractXmlTag(raw, "content:encoded");
    const excerptHtml = extractXmlTag(raw, "excerpt:encoded");
    const creator = decodeHtmlEntities(extractXmlTag(raw, "dc:creator"));
    const meta = extractPostMeta(raw);

    const catMatches = raw.match(/<category\b[^>]*domain=["'](?:ld_course_category|category)["'][^>]*>([\s\S]*?)<\/category>/gi) || [];
    const categories = catMatches.map((c) => stripHtmlAndBlocks(c)).filter(Boolean);

    return {
      postType,
      postId,
      title,
      slug,
      menuOrder,
      contentHtml,
      excerptHtml,
      creator,
      categories,
      meta,
    };
  });

  const courses = parsedItems.filter((i) => i.postType === "sfwd-courses");
  const lessons = parsedItems.filter((i) => i.postType === "sfwd-lessons");
  const topics = parsedItems.filter((i) => i.postType === "sfwd-topic");
  const quizzes = parsedItems.filter((i) => i.postType === "sfwd-quiz");
  const questions = parsedItems.filter((i) => i.postType === "sfwd-question");
  const proQuizzes = parseProQuizXmlBlocks(xmlContent);

  if (courses.length === 0) {
    // Check if standalone ProQuiz XML or lesson-only export
    if (lessons.length === 0 && proQuizzes.length === 0) {
      throw new Error(
        "No LearnDash course items (sfwd-courses or sfwd-lessons) were found in this XML file."
      );
    }

    // Build a single course shell from orphan lessons/quizzes
    const fallbackTitle = lessons[0]?.title || proQuizzes[0]?.name || "Imported LearnDash Course";
    courses.push({
      postType: "sfwd-courses",
      postId: `orphan-${Date.now()}`,
      title: fallbackTitle,
      slug: toSlug(fallbackTitle),
      menuOrder: 0,
      contentHtml: "",
      excerptHtml: "",
      creator: "AWIEF Faculty",
      categories: ["Masterclass"],
      meta: {},
    });
  }

  return courses.map((courseItem) => {
    const warnings: string[] = [];
    const coursePostId = courseItem.postId;

    // Extract step IDs from ld_course_steps (LearnDash Shared Course Steps serialized metadata)
    const rawSteps = courseItem.meta["ld_course_steps"] || courseItem.meta["_ld_course_steps"] || "";
    const stepIdSet = new Set<string>();
    if (rawSteps) {
      const idMatches = rawSteps.match(/i:(\d+);/g) || [];
      for (const m of idMatches) {
        const num = m.replace(/[^0-9]/g, "");
        if (num) stepIdSet.add(num);
      }
      const strIdMatches = rawSteps.match(/s:\d+:"(\d+)";/g) || [];
      for (const m of strIdMatches) {
        const num = m.match(/"(\d+)"/)?.[1];
        if (num) stepIdSet.add(num);
      }
    }

    // Filter lessons belonging to this course (via course_id, _sfwd-lessons, ld_course_steps, or single-course fallback)
    const courseLessons = lessons
      .filter((l) => {
        const linkedId =
          l.meta["course_id"] ||
          extractMetaField(l.meta["_sfwd-lessons"], "sfwd-lessons_course");
        return linkedId === coursePostId || stepIdSet.has(l.postId) || courses.length === 1;
      })
      .sort((a, b) => a.menuOrder - b.menuOrder);

    // Price & Access Mode from _sfwd-courses
    const rawPriceType = extractMetaField(courseItem.meta["_sfwd-courses"], "sfwd-courses_course_price_type");
    const rawPrice = extractMetaField(courseItem.meta["_sfwd-courses"], "sfwd-courses_course_price");
    const parsedPrice = rawPrice ? parseFloat(rawPrice.replace(/[^0-9.]/g, "")) : 0;
    const isFree =
      rawPriceType === "open" ||
      rawPriceType === "free" ||
      !parsedPrice ||
      isNaN(parsedPrice);

    // Course materials & short description
    const materialsHtml = extractMetaField(courseItem.meta["_sfwd-courses"], "sfwd-courses_course_materials") || "";
    const shortDescMeta = extractMetaField(courseItem.meta["_sfwd-courses"], "sfwd-courses_course_short_description") || "";

    const descriptionText = stripHtmlAndBlocks(courseItem.contentHtml) || stripHtmlAndBlocks(courseItem.excerptHtml);
    const shortDescription =
      stripHtmlAndBlocks(shortDescMeta) ||
      stripHtmlAndBlocks(courseItem.excerptHtml) ||
      descriptionText.slice(0, 220);

    const courseObjectives = extractBulletList(courseItem.contentHtml);

    // Build Quizzes for this course
    const courseQuizzes: ImportedQuiz[] = [];
    const matchedQuizItems = quizzes.filter((q) => {
      const linkedCourse =
        q.meta["course_id"] ||
        extractMetaField(q.meta["_sfwd-quiz"], "sfwd-quiz_course");
      return linkedCourse === coursePostId || stepIdSet.has(q.postId) || courses.length === 1;
    });

    for (const qItem of matchedQuizItems) {
      const linkedLessonId =
        qItem.meta["lesson_id"] ||
        extractMetaField(qItem.meta["_sfwd-quiz"], "sfwd-quiz_lesson");

      // Find sfwd-question items attached to this quiz
      const qQuestions = questions
        .filter((qu) => qu.meta["quiz_id"] === qItem.postId)
        .map((qu, idx): ImportedQuizQuestion | null => {
          let answers: { text: string; isCorrect: boolean }[] = [];
          const rawAnswers = qu.meta["_question_answers"] || qu.meta["answers_json"];
          if (rawAnswers) {
            try {
              const parsed = JSON.parse(rawAnswers) as Array<Record<string, unknown>>;
              if (Array.isArray(parsed)) {
                answers = parsed.map((a) => ({
                  text: stripHtmlAndBlocks(String(a.text || a.answer || "")),
                  isCorrect: Boolean(a.isCorrect || a.correct),
                }));
              }
            } catch {
              // ignore invalid JSON
            }
          }
          if (answers.length < 2) {
            const listItems = extractBulletList(qu.contentHtml);
            if (listItems.length >= 2) {
              answers = listItems.map((txt, aIdx) => ({
                text: txt.replace(/^\*+/, "").trim(),
                isCorrect: txt.startsWith("*") || aIdx === 0,
              }));
            }
          }
          if (answers.length < 2) return null;
          if (!answers.some((a) => a.isCorrect)) answers[0].isCorrect = true;

          return {
            name: qu.title || `Question ${idx + 1}`,
            questiontext: stripHtmlAndBlocks(qu.contentHtml) || qu.title,
            answers,
          };
        })
        .filter((x): x is ImportedQuizQuestion => x !== null);

      // Also check matching ProQuiz block by title
      const proMatch = proQuizzes.find(
        (pq) => pq.name.toLowerCase() === qItem.title.toLowerCase()
      );

      const finalQuestions = qQuestions.length > 0 ? qQuestions : proMatch?.questions || [];
      if (finalQuestions.length === 0) {
        warnings.push(
          `Quiz "${qItem.title}" had no embedded multiple-choice answer XML; you can add questions in the Course Builder or Course Quizzes tab.`
        );
      }

      courseQuizzes.push({
        sourceId: qItem.postId,
        lessonSourceId: linkedLessonId || undefined,
        name: qItem.title || "Imported Assessment",
        intro: stripHtmlAndBlocks(qItem.contentHtml) || "Imported from LearnDash assessment.",
        questions: finalQuestions,
      });
    }

    // Add any unmatched ProQuiz XML blocks if single course
    if (matchedQuizItems.length === 0 && proQuizzes.length > 0 && courses.length === 1) {
      courseQuizzes.push(...proQuizzes);
    }

    // Map Lessons -> AWIEF Modules (preserving Topics inside each Module)
    const modules: ImportedModule[] = courseLessons.map((lesson, idx) => {
      const lessonTopics = topics
        .filter((t) => {
          const tLessonId =
            t.meta["lesson_id"] ||
            extractMetaField(t.meta["_sfwd-topic"], "sfwd-topic_lesson");
          return tLessonId === lesson.postId;
        })
        .sort((a, b) => a.menuOrder - b.menuOrder)
        .map((t, tIdx) => ({
          id: `topic-${idx + 1}-${tIdx + 1}`,
          title: t.title || `Topic ${tIdx + 1}`,
          duration: "10 mins",
          summary: stripHtmlAndBlocks(t.contentHtml) || stripHtmlAndBlocks(t.excerptHtml),
          videoUrl: extractVideoUrl(t.contentHtml, t.meta),
        }));

      const takeaways = extractBulletList(lesson.contentHtml);
      const resource = extractResourceLink(lesson.contentHtml + "\n" + materialsHtml);
      const videoUrl = extractVideoUrl(lesson.contentHtml, lesson.meta);
      const attachedQuizIdx = courseQuizzes.findIndex(
        (q) => q.lessonSourceId && q.lessonSourceId === lesson.postId
      );

      const cleanSummary =
        stripHtmlAndBlocks(lesson.excerptHtml) ||
        stripHtmlAndBlocks(lesson.contentHtml).slice(0, 600) ||
        `Imported LearnDash lesson: ${lesson.title}`;

      return {
        id: `mod-${idx + 1}`,
        sourceId: lesson.postId,
        title: lesson.title.startsWith("Module") ? lesson.title : `Module ${idx + 1}: ${lesson.title}`,
        duration: `${Math.max(15, 20 + lessonTopics.length * 5)} mins`,
        summary: cleanSummary,
        videoUrl,
        keyTakeaways:
          takeaways.length > 0
            ? takeaways
            : lessonTopics.length > 0
            ? lessonTopics.map((t) => t.title)
            : [`Complete "${lesson.title}" core lesson concepts.`],
        templateName: resource.templateName,
        templateUrl: resource.templateUrl,
        topics: lessonTopics.length > 0 ? lessonTopics : undefined,
        attachedQuizIndex: attachedQuizIdx >= 0 ? attachedQuizIdx : undefined,
      };
    });

    if (modules.length === 0) {
      modules.push({
        id: "mod-1",
        title: `Module 1: ${courseItem.title}`,
        duration: "30 mins",
        summary: descriptionText || "Course overview and foundational concepts.",
        keyTakeaways: courseObjectives.length > 0 ? courseObjectives : ["Master core masterclass concepts."],
      });
      warnings.push("No separate LearnDash lessons were found; created a default Module 1 from the course description.");
    }

    const totalMins = modules.length * 25;
    const hoursStr = totalMins >= 60 ? `${(totalMins / 60).toFixed(1).replace(/\.0$/, "")} Hours` : `${totalMins} Mins`;

    return {
      learndashSourceId: coursePostId ? `LD-${coursePostId}` : `LD-${Date.now()}`,
      title: courseItem.title || "Imported LearnDash Masterclass",
      slug: courseItem.slug || toSlug(courseItem.title || "imported-masterclass"),
      category: courseItem.categories[0] || "Masterclass",
      duration: `${hoursStr} (${modules.length} ${modules.length === 1 ? "Module" : "Modules"})`,
      shortDescription: shortDescription || `Imported from LearnDash (${modules.length} modules).`,
      description: descriptionText || shortDescription || "Masterclass imported from LearnDash.",
      targetAudience: "African women founders, SME leaders, and aspiring entrepreneurs.",
      learningObjectives:
        courseObjectives.length > 0
          ? courseObjectives
          : modules.flatMap((m) => m.keyTakeaways.slice(0, 1)).slice(0, 5),
      isFree,
      priceZar: isFree ? 0 : Math.round(parsedPrice * 18),
      priceUsd: isFree ? 0 : Math.round(parsedPrice),
      authorName: courseItem.creator || "AWIEF Faculty",
      authorRole: "Lead Practitioner & Course Author",
      authorEmail: "",
      thumbnailUrl: "/images/investment-readiness.png",
      modules,
      quizzes: courseQuizzes,
      warnings,
      sourceFormat: "LEARNDASH_WXR_XML",
    };
  });
}

/**
 * Parses a LearnDash or AWIEF JSON export string into normalized courses.
 *
 * @param {string} jsonContent - Raw JSON string.
 * @returns {ParsedLearnDashCourse[]} Array of normalized courses.
 */
export function parseLearnDashJson(jsonContent: string): ParsedLearnDashCourse[] {
  type JsonObj = Record<string, unknown>;
  const rawParsed = JSON.parse(jsonContent) as unknown;
  const isStandaloneCourseArray =
    Array.isArray(rawParsed) &&
    rawParsed.some(
      (item) =>
        item !== null &&
        typeof item === "object" &&
        ("modulesJson" in item || "modules" in item)
    );
  const data: JsonObj = isStandaloneCourseArray
    ? { courses: rawParsed }
    : Array.isArray(rawParsed)
    ? {}
    : (rawParsed as JsonObj);
  const warnings: string[] = [];

  // Format A: AWIEF Platform Export or { courses: [...] } or standalone course array [...]
  if (data && Array.isArray(data.courses)) {
    return (data.courses as JsonObj[]).map((c, idx: number) => {
      let mods: ImportedModule[] = [];
      try {
        const rawMods = typeof c.modulesJson === "string" ? JSON.parse(c.modulesJson) : c.modules || [];
        if (Array.isArray(rawMods)) {
          mods = (rawMods as JsonObj[]).map((m, mIdx: number) => {
            const caseStudyObj = m.caseStudy as JsonObj | string | undefined;
            return {
              id: typeof m.id === "string" ? m.id : `mod-${mIdx + 1}`,
              title: typeof m.title === "string" ? m.title : `Module ${mIdx + 1}`,
              duration: typeof m.duration === "string" ? m.duration : "25 mins",
              summary: typeof m.summary === "string" ? m.summary : "",
              videoUrl: typeof m.videoUrl === "string" ? m.videoUrl : undefined,
              caseStudy:
                typeof caseStudyObj === "string"
                  ? caseStudyObj
                  : typeof caseStudyObj?.summary === "string"
                  ? caseStudyObj.summary
                  : undefined,
              keyTakeaways: Array.isArray(m.keyTakeaways) ? m.keyTakeaways.map(String) : [],
              templateName: typeof m.templateName === "string" ? m.templateName : undefined,
              templateUrl: typeof m.templateUrl === "string" ? m.templateUrl : undefined,
              topics: Array.isArray(m.topics) ? (m.topics as ImportedTopic[]) : undefined,
            };
          });
        }
      } catch {
        mods = [];
      }

      let objectives: string[] = [];
      try {
        objectives =
          typeof c.learningObjectives === "string"
            ? JSON.parse(c.learningObjectives)
            : Array.isArray(c.learningObjectives)
            ? c.learningObjectives.map(String)
            : [];
      } catch {
        objectives = [];
      }

      const rawQuizzes = Array.isArray(c.quizzes) ? (c.quizzes as JsonObj[]) : [];
      const quizzes: ImportedQuiz[] = rawQuizzes.map((q) => ({
        name: String(q.name || q.title || "Course Quiz"),
        intro: String(q.intro || ""),
        questions: Array.isArray(q.questions) ? (q.questions as ImportedQuizQuestion[]) : [],
      }));

      const titleStr = String(c.title || "Imported Masterclass");
      return {
        learndashSourceId: String(c.learndashSourceId || `LD-JSON-${idx + 1}`),
        title: titleStr,
        slug: String(c.slug || toSlug(c.title ? titleStr : `imported-${idx + 1}`)),
        category: String(c.category || "Masterclass"),
        duration: String(c.duration || `${mods.length || 1} Modules`),
        shortDescription: String(c.shortDescription || ""),
        description: String(c.description || c.shortDescription || ""),
        targetAudience: String(c.targetAudience || "African women founders and SME executives."),
        learningObjectives: objectives,
        isFree: Boolean(c.isFree),
        priceZar: Number(c.priceZar) || 0,
        priceUsd: Number(c.priceUsd) || 0,
        authorName: String(c.authorName || c.instructor || "AWIEF Faculty"),
        authorRole: String(c.authorRole || c.instructorRole || "Course Author"),
        authorEmail: String(c.authorEmail || ""),
        thumbnailUrl: String(c.thumbnailUrl || "/images/investment-readiness.png"),
        modules: mods,
        quizzes,
        warnings,
        sourceFormat: "LEARNDASH_JSON",
      };
    });
  }

  // Format B: Single LearnDash JSON Export { course, lessons/modules, quizzes } or { title, modules, quizzes }
  const courseObj = ((data?.course as JsonObj) || data) as JsonObj;
  if (!courseObj || (!courseObj.title && !Array.isArray(data?.lessons) && !Array.isArray(data?.modules))) {
    throw new Error("Unrecognized JSON structure. Expected LearnDash course JSON or AWIEF export JSON.");
  }

  const rawLessons = (data?.lessons || data?.modules || courseObj?.modules || []) as JsonObj[];
  const rawTopics = (data?.topics || []) as JsonObj[];
  const rawQuizzes = (data?.quizzes || []) as JsonObj[];
  const rawQuestions = (data?.questions || []) as JsonObj[];

  const quizzes: ImportedQuiz[] = rawQuizzes.map((q, qIdx: number) => {
    const qList = Array.isArray(q.questions)
      ? (q.questions as JsonObj[])
      : rawQuestions.filter((qu) => qu.quiz_id === q.id);

    const qQuestions = qList
      .map((qu, idx: number): ImportedQuizQuestion | null => {
        const answers = Array.isArray(qu.answers)
          ? (qu.answers as JsonObj[]).map((a) => ({
              text: stripHtmlAndBlocks(String(a.text || a.answer || a.title || "")),
              isCorrect: Boolean(a.isCorrect || a.correct),
            }))
          : [];
        if (answers.length < 2) return null;
        if (!answers.some((a) => a.isCorrect)) answers[0].isCorrect = true;
        return {
          name: String(qu.name || qu.title || `Question ${idx + 1}`),
          questiontext: stripHtmlAndBlocks(String(qu.questiontext || qu.question || qu.title || "")),
          answers,
        };
      })
      .filter((x): x is ImportedQuizQuestion => x !== null);

    return {
      sourceId: q.id ? String(q.id) : `quiz-${qIdx + 1}`,
      lessonSourceId: q.lesson_id ? String(q.lesson_id) : undefined,
      name: String(q.name || q.title || `Quiz ${qIdx + 1}`),
      intro: stripHtmlAndBlocks(String(q.intro || q.description || "")),
      questions: qQuestions,
    };
  });

  const modules: ImportedModule[] = rawLessons.map((m, idx: number) => {
    const lessonId = m.id ? String(m.id) : `mod-${idx + 1}`;
    const matchedTopics = rawTopics
      .filter((t) => String(t.lesson_id) === lessonId)
      .map((t, tIdx) => ({
        id: t.id ? String(t.id) : `topic-${idx + 1}-${tIdx + 1}`,
        title: String(t.title || `Topic ${tIdx + 1}`),
        duration: String(t.duration || "10 mins"),
        summary: stripHtmlAndBlocks(String(t.content || t.summary || "")),
        videoUrl: typeof (t.videoUrl || t.video_url) === "string" ? String(t.videoUrl || t.video_url) : undefined,
      }));

    const attachedQuizIndex = quizzes.findIndex((q) => q.lessonSourceId === lessonId);
    const caseObj = m.caseStudy as JsonObj | string | undefined;

    return {
      id: `mod-${idx + 1}`,
      sourceId: lessonId,
      title: String(m.title || `Module ${idx + 1}`),
      duration: String(m.duration || "25 mins"),
      summary: stripHtmlAndBlocks(String(m.summary || m.content || m.description || "")),
      videoUrl: typeof (m.videoUrl || m.video_url) === "string" ? String(m.videoUrl || m.video_url) : undefined,
      caseStudy:
        typeof caseObj === "string"
          ? caseObj
          : typeof caseObj?.summary === "string"
          ? caseObj.summary
          : undefined,
      keyTakeaways: Array.isArray(m.keyTakeaways)
        ? m.keyTakeaways.map(String)
        : Array.isArray(m.learningObjectives)
        ? m.learningObjectives.map(String)
        : extractBulletList(String(m.content || "")),
      templateName: typeof m.templateName === "string" ? m.templateName : undefined,
      templateUrl: typeof m.templateUrl === "string" ? m.templateUrl : undefined,
      topics:
        matchedTopics.length > 0
          ? matchedTopics
          : Array.isArray(m.topics)
          ? (m.topics as ImportedTopic[])
          : undefined,
      attachedQuizIndex: attachedQuizIndex >= 0 ? attachedQuizIndex : undefined,
    };
  });

  const titleField = courseObj.title as { rendered?: string } | string | undefined;
  const contentField = courseObj.content as { rendered?: string } | string | undefined;
  const title = stripHtmlAndBlocks(
    String(
      typeof titleField === "object" && titleField !== null
        ? titleField.rendered || ""
        : titleField || "Imported LearnDash Course"
    )
  );
  const rawDesc =
    courseObj.description ||
    (typeof contentField === "object" && contentField !== null ? contentField.rendered : contentField) ||
    "";

  return [
    {
      learndashSourceId: courseObj.id ? `LD-${courseObj.id}` : `LD-JSON-${Date.now()}`,
      title,
      slug: String(courseObj.slug || toSlug(title)),
      category: String(courseObj.category || "Masterclass"),
      duration: String(
        courseObj.duration || `${Math.max(1, modules.length) * 25} Mins (${modules.length} Modules)`
      ),
      shortDescription: stripHtmlAndBlocks(String(courseObj.shortDescription || courseObj.excerpt || "")),
      description: stripHtmlAndBlocks(String(rawDesc)),
      targetAudience: String(courseObj.targetAudience || "African women founders and SME executives."),
      learningObjectives: Array.isArray(courseObj.learningObjectives)
        ? courseObj.learningObjectives.map(String)
        : extractBulletList(String(rawDesc)),
      isFree: courseObj.isFree !== undefined ? Boolean(courseObj.isFree) : !courseObj.price || Number(courseObj.price) === 0,
      priceZar: Number(courseObj.priceZar) || Math.round((Number(courseObj.price) || 0) * 18),
      priceUsd: Number(courseObj.priceUsd) || Number(courseObj.price) || 0,
      authorName: String(courseObj.authorName || courseObj.author || "AWIEF Faculty"),
      authorRole: String(courseObj.authorRole || "Course Author"),
      authorEmail: String(courseObj.authorEmail || ""),
      thumbnailUrl: String(courseObj.thumbnailUrl || "/images/investment-readiness.png"),
      modules,
      quizzes,
      warnings,
      sourceFormat: "LEARNDASH_JSON",
    },
  ];
}

/**
 * Extracts text files (.xml, .json) from a standard ZIP archive Buffer using the shared ZIP helper.
 *
 * @param {Buffer} zipBuffer - Raw bytes of the uploaded `.zip` file.
 * @returns {Record<string, string>} Map of filename to decoded UTF-8 text content.
 */
export function extractTextFilesFromZipBuffer(zipBuffer: Buffer): Record<string, string> {
  const entries = extractZipEntries(zipBuffer, {
    filter: (name) => /\.(xml|json)$/i.test(name),
  });
  const files: Record<string, string> = {};
  for (const entry of entries) {
    files[entry.name] = entry.data.toString("utf8");
  }
  return files;
}

/**
 * Parses a LearnDash `.zip` export bundle containing `.xml` or `.json` course definitions.
 *
 * @param {Buffer} zipBuffer - Raw ZIP file buffer.
 * @returns {ParsedLearnDashCourse[]} Array of normalized courses.
 */
export function parseLearnDashZip(zipBuffer: Buffer): ParsedLearnDashCourse[] {
  const files = extractTextFilesFromZipBuffer(zipBuffer);
  const fileNames = Object.keys(files);
  if (fileNames.length === 0) {
    throw new Error("No .xml or .json course export files were found inside this ZIP bundle.");
  }

  // Prefer XML export if present
  const xmlFiles = fileNames.filter((n) => n.toLowerCase().endsWith(".xml"));
  for (const xmlName of xmlFiles) {
    try {
      const parsed = parseLearnDashWxrXml(files[xmlName]);
      if (parsed.length > 0) {
        return parsed.map((c) => ({ ...c, sourceFormat: "LEARNDASH_ZIP" }));
      }
    } catch {
      // try next file
    }
  }

  // Otherwise check JSON files (e.g. LearnDash 4.x separate courses/lessons/quizzes JSONs or single bundle)
  const jsonFiles = fileNames.filter((n) => n.toLowerCase().endsWith(".json"));
  if (jsonFiles.length > 0) {
    // Check if there is a single combined JSON first
    for (const jName of jsonFiles) {
      try {
        const parsed = parseLearnDashJson(files[jName]);
        if (parsed.length > 0) {
          return parsed.map((c) => ({ ...c, sourceFormat: "LEARNDASH_ZIP" }));
        }
      } catch {
        // might be split LearnDash JSON files (courses.json, lessons.json, etc.)
      }
    }

    // Attempt to merge split LearnDash 4.x JSON files (courses.json, lessons.json, topics.json, quizzes.json, questions.json)
    const findJsonByHint = (hint: string) => {
      const match = jsonFiles.find((n) => n.toLowerCase().includes(hint));
      if (!match) return [];
      try {
        const parsed = JSON.parse(files[match]);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [];
      }
    };

    const coursesArr = findJsonByHint("course");
    const lessonsArr = findJsonByHint("lesson");
    const topicsArr = findJsonByHint("topic");
    const quizzesArr = findJsonByHint("quiz");
    const questionsArr = findJsonByHint("question");

    if (coursesArr.length > 0 || lessonsArr.length > 0) {
      const combined = JSON.stringify({
        course: coursesArr[0] || { title: "Imported LearnDash Course" },
        lessons: lessonsArr,
        topics: topicsArr,
        quizzes: quizzesArr,
        questions: questionsArr,
      });
      const parsed = parseLearnDashJson(combined);
      return parsed.map((c) => ({ ...c, sourceFormat: "LEARNDASH_ZIP" }));
    }
  }

  throw new Error("Could not find valid LearnDash course data inside the uploaded ZIP archive.");
}

/**
 * Returns a realistic sample WordPress/LearnDash WXR XML export string for testing and demonstration.
 *
 * @returns {string} Sample LearnDash XML document.
 */
export function getSampleLearnDashXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:wp="http://wordpress.org/export/1.2/">
<channel>
  <title>AWIEF LearnDash Legacy Academy</title>
  <item>
    <title>Venture Debt &amp; Blended Finance for African Growth SMEs</title>
    <dc:creator><![CDATA[Nomsa Dlamini]]></dc:creator>
    <content:encoded><![CDATA[
      <p>Master non-dilutive venture debt structuring, DFI blended finance facilities, and working capital covenant negotiation for growth-stage women-led enterprises across Africa.</p>
      <ul>
        <li>Structure non-dilutive venture debt alongside equity seed/Series A rounds</li>
        <li>Evaluate DFI concessional guarantees and first-loss facilities</li>
        <li>Negotiate debt service coverage ratios (DSCR) and collateral covenants</li>
      </ul>
    ]]></content:encoded>
    <excerpt:encoded><![CDATA[Learn how to raise non-dilutive venture debt and DFI blended finance without sacrificing founder equity.]]></excerpt:encoded>
    <wp:post_id>4021</wp:post_id>
    <wp:post_name>venture-debt-blended-finance-smes</wp:post_name>
    <wp:post_type>sfwd-courses</wp:post_type>
    <category domain="ld_course_category"><![CDATA[Investment Readiness]]></category>
    <wp:postmeta>
      <wp:meta_key>_sfwd-courses</wp:meta_key>
      <wp:meta_value><![CDATA[a:2:{s:30:"sfwd-courses_course_price_type";s:5:"paynow";s:25:"sfwd-courses_course_price";s:3:"120";}]]></wp:meta_value>
    </wp:postmeta>
  </item>

  <item>
    <title>Foundations of Non-Dilutive Venture Debt</title>
    <content:encoded><![CDATA[
      <!-- wp:video -->
      <figure class="wp-block-video"><video controls src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"></video></figure>
      <!-- /wp:video -->
      <p>Understand when venture debt accelerates runway without diluting founder equity, and compare commercial bank facilities against specialist impact debt funds.</p>
      <ul>
        <li>Distinguish venture debt warrants from straight senior term loans</li>
        <li>Calculate optimal debt-to-equity runway extension ratios</li>
      </ul>
      <p><a href="https://academy.awieforum.org/toolkits/venture-debt-term-comparison.xlsx">Venture Debt Facility Comparison Matrix (.xlsx)</a></p>
    ]]></content:encoded>
    <wp:post_id>4022</wp:post_id>
    <wp:menu_order>1</wp:menu_order>
    <wp:post_type>sfwd-lessons</wp:post_type>
    <wp:postmeta>
      <wp:meta_key>course_id</wp:meta_key>
      <wp:meta_value>4021</wp:meta_value>
    </wp:postmeta>
  </item>

  <item>
    <title>Calculating Debt Service Coverage Ratio (DSCR)</title>
    <content:encoded><![CDATA[
      <p>Walk through a live working-capital spreadsheet to verify your 1.25x DSCR cushion before approaching lenders.</p>
    ]]></content:encoded>
    <wp:post_id>4023</wp:post_id>
    <wp:menu_order>1</wp:menu_order>
    <wp:post_type>sfwd-topic</wp:post_type>
    <wp:postmeta>
      <wp:meta_key>lesson_id</wp:meta_key>
      <wp:meta_value>4022</wp:meta_value>
    </wp:postmeta>
  </item>

  <item>
    <title>DFI Blended Finance &amp; Risk-Sharing Guarantees</title>
    <content:encoded><![CDATA[
      <p>Explore how development finance institutions deploy first-loss guarantees to unlock local commercial bank credit lines for women-owned businesses.</p>
      <ul>
        <li>Identify gender-lens credit guarantee programs in SADC, ECOWAS, and EAC</li>
        <li>Prepare audited ESG and impact metrics required for blended finance approval</li>
      </ul>
      <p><a href="https://academy.awieforum.org/toolkits/blended-finance-readiness-checklist.pdf">Blended Finance Readiness Checklist (.pdf)</a></p>
    ]]></content:encoded>
    <wp:post_id>4024</wp:post_id>
    <wp:menu_order>2</wp:menu_order>
    <wp:post_type>sfwd-lessons</wp:post_type>
    <wp:postmeta>
      <wp:meta_key>course_id</wp:meta_key>
      <wp:meta_value>4021</wp:meta_value>
    </wp:postmeta>
  </item>

  <item>
    <title>Venture Debt &amp; Covenant Competency Check</title>
    <content:encoded><![CDATA[Verify your mastery of venture debt instruments, DSCR cushions, and blended finance guarantees.]]></content:encoded>
    <wp:post_id>4025</wp:post_id>
    <wp:post_type>sfwd-quiz</wp:post_type>
    <wp:postmeta>
      <wp:meta_key>course_id</wp:meta_key>
      <wp:meta_value>4021</wp:meta_value>
    </wp:postmeta>
    <wp:postmeta>
      <wp:meta_key>lesson_id</wp:meta_key>
      <wp:meta_value>4022</wp:meta_value>
    </wp:postmeta>
  </item>

  <item>
    <title>What is the primary benefit of pairing venture debt with a recent equity round?</title>
    <content:encoded><![CDATA[
      <p>What is the primary benefit of pairing venture debt with a recent equity round?</p>
      <ul>
        <li>*Extends cash runway by 6–12 months with minimal additional equity dilution</li>
        <li>Eliminates all obligations to repay principal</li>
        <li>Transfers 51% of common shares to the lender immediately</li>
        <li>Waives annual audited financial statement requirements</li>
      </ul>
    ]]></content:encoded>
    <wp:post_id>4026</wp:post_id>
    <wp:post_type>sfwd-question</wp:post_type>
    <wp:postmeta>
      <wp:meta_key>quiz_id</wp:meta_key>
      <wp:meta_value>4025</wp:meta_value>
    </wp:postmeta>
  </item>

  <item>
    <title>How does a DFI first-loss guarantee help African women-led SMEs access commercial loans?</title>
    <content:encoded><![CDATA[
      <p>How does a DFI first-loss guarantee help African women-led SMEs access commercial loans?</p>
      <ul>
        <li>*It absorbs initial credit default risk, reducing traditional collateral demands from local banks</li>
        <li>It sets interest rates at 0% forever regardless of inflation</li>
        <li>It replaces company registration certificates</li>
        <li>It forbids businesses from exporting across borders</li>
      </ul>
    ]]></content:encoded>
    <wp:post_id>4027</wp:post_id>
    <wp:post_type>sfwd-question</wp:post_type>
    <wp:postmeta>
      <wp:meta_key>quiz_id</wp:meta_key>
      <wp:meta_value>4025</wp:meta_value>
    </wp:postmeta>
  </item>
</channel>
</rss>`;
}
