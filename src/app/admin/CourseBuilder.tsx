"use client";

import { useState, useEffect } from "react";
import { saveAdminCourse, getCourseQuizzesAdmin, type InlineQuizInput } from "./actions";
import {
  BookOpen,
  Layers,
  SlidersHorizontal,
  CheckCircle2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy,
  ChevronDown,
  ChevronRight,
  Video,
  HelpCircle,
  Download,
  Upload,
  FileUp,
  X,
  Check,
  Sparkles,
  FileText,
} from "@/components/Icons";
import type { ParsedLearnDashCourse } from "@/lib/learndashImporter";

interface TopicDraft {
  id: string;
  title: string;
  duration: string;
  summary: string;
  videoUrl?: string;
  documentName?: string;
  documentUrl?: string;
}

interface ModuleDraft {
  id: string;
  title: string;
  duration: string;
  summary: string;
  videoUrl: string;
  caseStudy: string;
  keyTakeaways: string[];
  templateName: string;
  templateUrl: string;
  topics: TopicDraft[];
  quizId?: string;
  inlineQuiz?: {
    quizKey?: string;
    name: string;
    intro: string;
    questions: {
      id?: number;
      name?: string;
      questiontext: string;
      answers: { id?: number; text: string; isCorrect: boolean }[];
    }[];
  } | null;
}

interface AdminCourseRecord {
  id: string;
  title: string;
  slug?: string | null;
  category?: string | null;
  duration?: string | null;
  priceZar?: number;
  priceUsd?: number;
  isFree?: boolean;
  authorName?: string | null;
  authorRole?: string | null;
  authorEmail?: string | null;
  authorBio?: string | null;
  instructor?: string | null;
  instructorRole?: string | null;
  royaltyRate?: number;
  shortDescription?: string | null;
  description?: string | null;
  targetAudience?: string | null;
  thumbnailUrl?: string | null;
  learningObjectives?: string | null;
  modulesJson?: string | null;
  scormPath?: string | null;
  learndashSourceId?: string | null;
  isNative?: boolean;
  isPublished?: boolean;
}

interface CourseBuilderProps {
  course?: AdminCourseRecord | null;
  onCancel: () => void;
  onSaved: (courseId: string) => void;
}

type BuilderTab = "OVERVIEW" | "CURRICULUM" | "SETTINGS" | "PUBLISH";

const THUMBNAIL_PRESETS = [
  { label: "Investment Readiness", url: "/images/investment-readiness.png" },
  { label: "Export & AfCFTA Trade", url: "/images/export-trade.png" },
  { label: "Financial Mastery", url: "/images/financial-management.png" },
  { label: "Pitch 'n Grow", url: "/images/pitch-n-grow.png" },
  { label: "AWIEF Emblem", url: "/images/awief-logo.jpg" },
];

const CATEGORY_OPTIONS = [
  "Investment Readiness",
  "Export & Trade",
  "Financial Mastery",
  "Digital & AI Growth",
  "Executive Leadership",
  "Masterclass",
];

function parseStringArray(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x));
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x));
    } catch {
      return raw.trim() ? [raw.trim()] : [];
    }
  }
  return [];
}

function createEmptyModule(index: number): ModuleDraft {
  return {
    id: `mod-${Date.now()}-${index + 1}`,
    title: `Module ${index + 1}: New Learning Module`,
    duration: "25 mins",
    summary: "",
    videoUrl: "",
    caseStudy: "",
    keyTakeaways: [""],
    templateName: "",
    templateUrl: "",
    topics: [],
    inlineQuiz: null,
  };
}

/**
 * LearnDash-Inspired Self-Service Course & Masterclass Studio.
 * Guides non-technical administrators through 4 clear stages:
 * 1. Course Page & Learning Objectives
 * 2. Hierarchical Curriculum Builder (Modules, Sub-Topics, Media, Toolkits, and Module Quizzes)
 * 3. Commercial Access, Tuition & Author Royalty Settings
 * 4. Pre-Flight Summary & Publication
 *
 * @param {CourseBuilderProps} props - Component properties.
 * @returns {JSX.Element} The rendered LearnDash-style course builder.
 */
export default function CourseBuilder({ course, onCancel, onSaved }: CourseBuilderProps) {
  const isEditMode = Boolean(course?.id);
  const [activeTab, setActiveTab] = useState<BuilderTab>("OVERVIEW");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Course overview state
  const [courseId] = useState<string>(course?.id || "");
  const [title, setTitle] = useState<string>(course?.title || "");
  const [slug, setSlug] = useState<string>(course?.slug || "");
  const [category, setCategory] = useState<string>(course?.category || "Masterclass");
  const [duration, setDuration] = useState<string>(course?.duration || "2.5 Hours");
  const [shortDescription, setShortDescription] = useState<string>(course?.shortDescription || "");
  const [description, setDescription] = useState<string>(course?.description || "");
  const [targetAudience, setTargetAudience] = useState<string>(
    course?.targetAudience ||
      "African women founders, SME managing directors, and growth-stage entrepreneurs."
  );
  const [thumbnailUrl, setThumbnailUrl] = useState<string>(
    course?.thumbnailUrl || "/images/investment-readiness.png"
  );
  const [learningObjectives, setLearningObjectives] = useState<string[]>(() => {
    const parsed = parseStringArray(course?.learningObjectives);
    return parsed.length > 0 ? parsed : [""];
  });

  // Settings & Commercial state
  const [isFree, setIsFree] = useState<boolean>(Boolean(course?.isFree));
  const [priceZar, setPriceZar] = useState<number>(course?.priceZar ?? 1850);
  const [priceUsd, setPriceUsd] = useState<number>(course?.priceUsd ?? 105);
  const [authorName, setAuthorName] = useState<string>(
    course?.authorName || course?.instructor || ""
  );
  const [authorRole, setAuthorRole] = useState<string>(
    course?.authorRole || course?.instructorRole || ""
  );
  const [authorEmail, setAuthorEmail] = useState<string>(course?.authorEmail || "");
  const [authorBio, setAuthorBio] = useState<string>(course?.authorBio || "");
  const [royaltyRate, setRoyaltyRate] = useState<number>(course?.royaltyRate ?? 35);
  const [isNative, setIsNative] = useState<boolean>(course?.isNative ?? true);
  const [scormPath, setScormPath] = useState<string>(course?.scormPath || "");
  const [isPublished, setIsPublished] = useState<boolean>(course?.isPublished ?? true);
  const [learndashSourceId, setLearndashSourceId] = useState<string>(
    course?.learndashSourceId || ""
  );
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [isAutoPopulating, setIsAutoPopulating] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Curriculum Modules state
  const [modules, setModules] = useState<ModuleDraft[]>(() => {
    if (course?.modulesJson) {
      try {
        const parsed = JSON.parse(course.modulesJson) as Array<Record<string, unknown>>;
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m, idx: number): ModuleDraft => {
            const caseObj = m.caseStudy as { summary?: string; title?: string } | string | undefined;
            const pracObj = m.practicalTemplate as { title?: string; downloadUrl?: string } | undefined;
            const rawTopics = Array.isArray(m.topics) ? m.topics : [];
            const rawTakeaways = Array.isArray(m.keyTakeaways)
              ? m.keyTakeaways.map(String)
              : rawTopics.length > 0 && typeof rawTopics[0] === "string"
              ? rawTopics.map(String)
              : [""];
            const objTopics = rawTopics.filter(
              (t): t is TopicDraft => typeof t === "object" && t !== null && "title" in t
            );

            return {
              id: typeof m.id === "string" ? m.id : `mod-${idx + 1}`,
              title: typeof m.title === "string" ? m.title : `Module ${idx + 1}`,
              duration: typeof m.duration === "string" ? m.duration : "25 mins",
              summary: typeof m.summary === "string" ? m.summary : "",
              videoUrl: typeof m.videoUrl === "string" ? m.videoUrl : "",
              caseStudy:
                typeof caseObj === "string"
                  ? caseObj
                  : caseObj?.summary || caseObj?.title || "",
              keyTakeaways: rawTakeaways,
              templateName:
                typeof m.templateName === "string" ? m.templateName : pracObj?.title || "",
              templateUrl:
                typeof m.templateUrl === "string" ? m.templateUrl : pracObj?.downloadUrl || "",
              topics: objTopics,
              quizId: m.quizId ? String(m.quizId) : undefined,
              inlineQuiz: null,
            };
          });
        }
      } catch {
        // ignore parse error
      }
    }
    return [createEmptyModule(0)];
  });

  const [expandedModuleIdx, setExpandedModuleIdx] = useState<number | null>(0);
  const [loadingQuizzes, setLoadingQuizzes] = useState<boolean>(Boolean(course?.id));
  const [detachedQuizKeys, setDetachedQuizKeys] = useState<string[]>([]);

  // Hydrate existing course quizzes into their linked modules when editing
  useEffect(() => {
    if (!course?.id) return;
    let active = true;
    getCourseQuizzesAdmin(course.id)
      .then((courseQuizzes) => {
        if (!active || !courseQuizzes || courseQuizzes.length === 0) return;
        setModules((prev) => {
          const anyExplicitQuizId = prev.some((m) => Boolean(m.quizId));
          return prev.map((mod, mIdx) => {
            const matchedQuiz = mod.quizId
              ? courseQuizzes.find((q) => q.quizKey === mod.quizId) || null
              : anyExplicitQuizId
              ? null
              : (courseQuizzes.length === prev.length ? courseQuizzes[mIdx] : null) ||
                (mIdx === 0 && courseQuizzes.length === 1 ? courseQuizzes[0] : null);

            if (!matchedQuiz) return mod;
            return {
              ...mod,
              quizId: matchedQuiz.quizKey,
              inlineQuiz: {
                quizKey: matchedQuiz.quizKey,
                name: matchedQuiz.name,
                intro: matchedQuiz.intro || "",
                questions: matchedQuiz.questions || [],
              },
            };
          });
        });
      })
      .finally(() => {
        if (active) setLoadingQuizzes(false);
      });
    return () => {
      active = false;
    };
  }, [course?.id]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
  };

  /**
   * Uploads a video, document, or image via `/api/upload` and returns its playback/download URL.
   */
  const uploadCourseFile = async (
    file: File,
    kind: "video" | "document" | "image",
    key: string
  ): Promise<{ url: string; fileName: string } | null> => {
    setErrorMsg(null);
    setStatusBanner(null);
    setUploadingKey(key);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", kind);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || `Failed to upload ${kind}.`);
        return null;
      }
      setStatusBanner(`Uploaded "${data.fileName}" successfully.`);
      return { url: data.url, fileName: data.fileName };
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : `Upload error while sending ${kind}.`);
      return null;
    } finally {
      setUploadingKey(null);
    }
  };

  /**
   * Populates all CourseBuilder form fields and modules from a parsed SCORM or LearnDash package.
   */
  const populateFromParsedCourse = (parsed: ParsedLearnDashCourse) => {
    setTitle(parsed.title || "");
    if (!isEditMode && parsed.slug) setSlug(parsed.slug);
    if (parsed.category) setCategory(parsed.category);
    if (parsed.duration) setDuration(parsed.duration);
    if (parsed.shortDescription) setShortDescription(parsed.shortDescription);
    if (parsed.description) setDescription(parsed.description);
    if (parsed.targetAudience) setTargetAudience(parsed.targetAudience);
    if (parsed.thumbnailUrl) setThumbnailUrl(parsed.thumbnailUrl);
    if (parsed.authorName) setAuthorName(parsed.authorName);
    if (parsed.authorRole) setAuthorRole(parsed.authorRole);
    if (parsed.authorEmail) setAuthorEmail(parsed.authorEmail);
    if (parsed.learndashSourceId) setLearndashSourceId(parsed.learndashSourceId);
    setIsFree(Boolean(parsed.isFree));
    if (!parsed.isFree) {
      setPriceZar(parsed.priceZar || 1850);
      setPriceUsd(parsed.priceUsd || 105);
    } else {
      setRoyaltyRate(0);
    }
    if (parsed.scormPath) {
      setScormPath(parsed.scormPath);
    }
    if (parsed.isNative !== undefined) {
      setIsNative(parsed.isNative);
    }

    setLearningObjectives(
      parsed.learningObjectives && parsed.learningObjectives.length > 0
        ? parsed.learningObjectives
        : [""]
    );

    if (parsed.modules && parsed.modules.length > 0) {
      const mappedModules: ModuleDraft[] = parsed.modules.map((m, idx) => {
        const linkedQuiz =
          typeof m.attachedQuizIndex === "number" && parsed.quizzes[m.attachedQuizIndex]
            ? parsed.quizzes[m.attachedQuizIndex]
            : null;
        return {
          id: m.id || `mod-imp-${idx + 1}`,
          title: m.title || `Module ${idx + 1}`,
          duration: m.duration || "25 mins",
          summary: m.summary || "",
          videoUrl: m.videoUrl || "",
          caseStudy: m.caseStudy || "",
          keyTakeaways: m.keyTakeaways && m.keyTakeaways.length > 0 ? m.keyTakeaways : [""],
          templateName: m.templateName || "",
          templateUrl: m.templateUrl || "",
          topics: (m.topics || []).map((t, tIdx) => ({
            id: t.id || `topic-imp-${idx + 1}-${tIdx + 1}`,
            title: t.title,
            duration: t.duration || "10 mins",
            summary: t.summary || "",
            videoUrl: t.videoUrl,
            documentName: t.documentName,
            documentUrl: t.documentUrl,
          })),
          inlineQuiz: linkedQuiz
            ? {
                name: linkedQuiz.name,
                intro: linkedQuiz.intro || "",
                questions: linkedQuiz.questions.map((q, qIdx) => ({
                  name: q.name || `Question ${qIdx + 1}`,
                  questiontext: q.questiontext,
                  answers: q.answers,
                })),
              }
            : null,
        };
      });
      setModules(mappedModules);
      setExpandedModuleIdx(0);
    }

    const extraWarnings = parsed.warnings?.length ? ` (${parsed.warnings[0]})` : "";
    setStatusBanner(
      `Auto-populated ${parsed.modules.length} module(s) and ${parsed.quizzes.length} quiz(zes) from "${parsed.title}". Review fields below and click Save.${extraWarnings}`
    );
  };

  /**
   * Parses a SCORM (.zip / imsmanifest.xml) or LearnDash (.xml / .json / .zip) package
   * via `/api/import-package` and fills all CourseBuilder fields automatically.
   */
  const handlePackageAutoFill = async (file: File) => {
    setErrorMsg(null);
    setStatusBanner(null);
    setIsAutoPopulating(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import-package", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.success || !Array.isArray(data.courses) || data.courses.length === 0) {
        setErrorMsg(data.error || "Could not extract course fields from the uploaded package.");
        return;
      }
      populateFromParsedCourse(data.courses[0] as ParsedLearnDashCourse);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to inspect course package.");
    } finally {
      setIsAutoPopulating(false);
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const uploaded = await uploadCourseFile(file, "image", "cover-image");
    if (uploaded) {
      setThumbnailUrl(uploaded.url);
    }
  };

  // Module manipulation helpers
  const addModule = () => {
    setModules((prev) => {
      const next = [...prev, createEmptyModule(prev.length)];
      setExpandedModuleIdx(next.length - 1);
      return next;
    });
  };

  const updateModule = (idx: number, patch: Partial<ModuleDraft>) => {
    setModules((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  };

  const moveModule = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= modules.length) return;
    setModules((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(target, 0, item);
      return copy;
    });
    setExpandedModuleIdx(target);
  };

  const duplicateModule = (idx: number) => {
    const source = modules[idx];
    const clone: ModuleDraft = {
      ...source,
      id: `mod-${Date.now()}`,
      title: `${source.title} (Copy)`,
      keyTakeaways: [...source.keyTakeaways],
      topics: source.topics.map((t) => ({ ...t, id: `topic-${Date.now()}-${Math.random()}` })),
      inlineQuiz: null,
      quizId: undefined,
    };
    setModules((prev) => {
      const copy = [...prev];
      copy.splice(idx + 1, 0, clone);
      return copy;
    });
    setExpandedModuleIdx(idx + 1);
  };

  const removeModule = (idx: number) => {
    if (modules.length <= 1) {
      setErrorMsg("A masterclass must have at least 1 curriculum module.");
      return;
    }
    const removed = modules[idx];
    const removedQuizKey = removed?.inlineQuiz?.quizKey || removed?.quizId;
    if (removedQuizKey) {
      setDetachedQuizKeys((prev) => (prev.includes(removedQuizKey) ? prev : [...prev, removedQuizKey]));
    }
    setModules((prev) => prev.filter((_, i) => i !== idx));
    setExpandedModuleIdx(null);
  };

  // Module inline quiz helpers
  const enableModuleQuiz = (modIdx: number) => {
    const mod = modules[modIdx];
    updateModule(modIdx, {
      inlineQuiz: {
        quizKey: mod.quizId,
        name: `${mod.title.replace(/^Module \d+:\s*/i, "")} Knowledge Check`,
        intro: "Verify your mastery of this module's key competencies (80% passing score).",
        questions: [
          {
            name: "Question 1",
            questiontext: "",
            answers: [
              { text: "", isCorrect: true },
              { text: "", isCorrect: false },
              { text: "", isCorrect: false },
              { text: "", isCorrect: false },
            ],
          },
        ],
      },
    });
  };

  const handleSaveCourse = async (publishOverride?: boolean) => {
    setErrorMsg(null);
    if (!title.trim()) {
      setActiveTab("OVERVIEW");
      setErrorMsg("Please enter a Course Title before saving.");
      return;
    }

    const cleanModules = modules.map((m, idx) => ({
      id: m.id || `mod-${idx + 1}`,
      title: m.title.trim() || `Module ${idx + 1}`,
      duration: m.duration.trim() || "25 mins",
      summary: m.summary.trim(),
      videoUrl: m.videoUrl.trim() || undefined,
      caseStudy: m.caseStudy.trim() || undefined,
      keyTakeaways: m.keyTakeaways.map((k) => k.trim()).filter(Boolean),
      templateName: m.templateName.trim() || undefined,
      templateUrl: m.templateUrl.trim() || undefined,
      topics: m.topics.filter((t) => t.title.trim()).length > 0 ? m.topics.filter((t) => t.title.trim()) : undefined,
      quizId: m.quizId,
    }));

    const inlineQuizzes: InlineQuizInput[] = [];
    for (let idx = 0; idx < modules.length; idx++) {
      const m = modules[idx];
      if (m.inlineQuiz && m.inlineQuiz.name.trim()) {
        const validQuestions = m.inlineQuiz.questions
          .filter((q) => q.questiontext.trim() && q.answers.filter((a) => a.text.trim()).length >= 2)
          .map((q, qIdx) => {
            const nonEmptyAns = q.answers.filter((a) => a.text.trim());
            if (!nonEmptyAns.some((a) => a.isCorrect)) {
              nonEmptyAns[0].isCorrect = true;
            }
            return {
              id: q.id,
              name: q.name || `Question ${qIdx + 1}`,
              questiontext: q.questiontext.trim(),
              answers: nonEmptyAns,
            };
          });

        if (validQuestions.length === 0) {
          setActiveTab("CURRICULUM");
          setExpandedModuleIdx(idx);
          setErrorMsg(
            `Module ${idx + 1}'s quiz ("${m.inlineQuiz.name}") needs at least 1 complete question with 2 answer choices, or detach the quiz.`
          );
          return;
        }

        inlineQuizzes.push({
          quizKey: m.inlineQuiz.quizKey || m.quizId,
          moduleIndex: idx,
          name: m.inlineQuiz.name.trim(),
          intro: m.inlineQuiz.intro.trim(),
          questions: validQuestions,
        });
      }
    }

    const cleanObjectives = learningObjectives.map((o) => o.trim()).filter(Boolean);
    const finalPublished = publishOverride !== undefined ? publishOverride : isPublished;

    setIsSaving(true);
    try {
      const res = await saveAdminCourse({
        id: courseId,
        title: title.trim(),
        slug: slug.trim() || undefined,
        category: category.trim() || "Masterclass",
        duration: duration.trim() || `${cleanModules.length} Modules`,
        priceZar: isFree ? 0 : Number(priceZar) || 0,
        priceUsd: isFree ? 0 : Number(priceUsd) || 0,
        isFree,
        authorName: authorName.trim() || "AWIEF Faculty",
        authorRole: authorRole.trim() || "Practitioner Expert",
        authorEmail: authorEmail.trim(),
        authorBio: authorBio.trim(),
        royaltyRate: isFree ? 0 : Number(royaltyRate) || 0,
        shortDescription: shortDescription.trim(),
        description: description.trim(),
        targetAudience: targetAudience.trim(),
        thumbnailUrl: thumbnailUrl.trim() || "/images/investment-readiness.png",
        learningObjectives: JSON.stringify(cleanObjectives),
        modulesJson: JSON.stringify(cleanModules),
        scormPath: scormPath.trim() || undefined,
        learndashSourceId: learndashSourceId.trim() || undefined,
        isNative,
        isPublished: finalPublished,
        inlineQuizzes,
        detachedQuizKeys,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to save masterclass.");
        return;
      }

      onSaved(res.courseId || courseId);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const totalTopicsCount = modules.reduce((acc, m) => acc + m.topics.length, 0);
  const totalQuizzesCount = modules.filter((m) => m.inlineQuiz?.name?.trim()).length;

  return (
    <div className="bg-white rounded-3xl border-2 border-[#7F3D59]/30 shadow-xl overflow-hidden text-xs">
      {/* Studio Top Bar */}
      <div className="bg-[#1D0B14] text-white px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3E1A29]">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">
            AWIEF Course Authoring Studio
          </span>
          <h3 className="text-lg sm:text-xl font-serif font-bold text-white mt-0.5">
            {isEditMode ? `Edit Masterclass: ${title || course?.title || ""}` : "Create New Masterclass"}
          </h3>
          <p className="text-[11px] text-gray-300 mt-0.5">
            Structured course builder with video &amp; document uploads, learning objectives, embedded assessments, and SCORM/LearnDash import.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          <label className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer">
            <FileUp className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>{isAutoPopulating ? "Extracting Package..." : "Auto-Fill from SCORM / LearnDash"}</span>
            <input
              type="file"
              accept=".zip,.xml,.json"
              disabled={isAutoPopulating}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) handlePackageAutoFill(file);
              }}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveCourse()}
            className="px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#B89628] text-[#1D0B14] font-bold inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isSaving ? "Saving..." : isEditMode ? "Save Changes" : "Publish Masterclass"}</span>
          </button>
        </div>
      </div>

      {/* LearnDash-Style 4-Step Tabs */}
      <div className="bg-[#FDF8F9] border-b border-[#EAD7E0] px-6 py-3 flex items-center gap-2 overflow-x-auto">
        {[
          { id: "OVERVIEW" as BuilderTab, label: "1. Course Page & Objectives", icon: BookOpen },
          {
            id: "CURRICULUM" as BuilderTab,
            label: `2. Curriculum Builder (${modules.length})`,
            icon: Layers,
          },
          { id: "SETTINGS" as BuilderTab, label: "3. Pricing, Author & Settings", icon: SlidersHorizontal },
          { id: "PUBLISH" as BuilderTab, label: "4. Review & Publish", icon: CheckCircle2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap inline-flex items-center gap-2 ${
                active
                  ? "bg-[#7F3D59] text-white shadow-xs"
                  : "bg-white text-gray-700 hover:bg-[#EAD7E0]/40 border border-[#EAD7E0]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {errorMsg && (
        <div className="mx-6 mt-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold flex items-center justify-between gap-2">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {statusBanner && (
        <div className="mx-6 mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center justify-between gap-2">
          <span>{statusBanner}</span>
          <button type="button" onClick={() => setStatusBanner(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab Body */}
      <div className="p-6 space-y-6">
        {/* TAB 1: COURSE PAGE & OBJECTIVES */}
        {activeTab === "OVERVIEW" && (
          <div className="space-y-6">
            {!isEditMode && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FDF8F9] to-amber-50/40 border border-[#EAD7E0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-[#7F3D59] text-xs uppercase tracking-wider">
                    Auto-Populate from Existing Course Package
                  </h4>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    Upload a SCORM package (.zip or imsmanifest.xml) or LearnDash export (.xml, .json, .zip) to pre-fill title, description, modules, objectives, quizzes, and interactive launcher.
                  </p>
                </div>
                <label className="px-4 py-2 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl font-bold cursor-pointer inline-flex items-center gap-1.5 shrink-0 shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isAutoPopulating ? "Importing..." : "Upload Package (.zip / .xml)"}</span>
                  <input
                    type="file"
                    accept=".zip,.xml,.json"
                    disabled={isAutoPopulating}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) handlePackageAutoFill(file);
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block font-bold text-gray-700 mb-1">
                  Course / Masterclass Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Venture Debt & Working Capital Governance for Women-Led SMEs"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7F3D59] focus:outline-none text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Category</label>
                <select
                  value={CATEGORY_OPTIONS.includes(category) ? category : "CUSTOM"}
                  onChange={(e) => {
                    if (e.target.value !== "CUSTOM") setCategory(e.target.value);
                  }}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl bg-white"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  {!CATEGORY_OPTIONS.includes(category) && (
                    <option value="CUSTOM">{category}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Estimated Duration</label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 2.5 Hours • 5 Bite-Sized Modules"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">URL Slug (Optional)</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="auto-generated-from-title"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Audience</label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g. African women founders and growth-stage SME leaders"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Short Catalogue Synopsis</label>
                <textarea
                  rows={3}
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="Concise 1–2 sentence overview displayed on course catalogue cards..."
                  className="w-full p-3 border border-gray-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Full Masterclass Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Comprehensive narrative explaining the commercial outcomes and faculty expertise..."
                  className="w-full p-3 border border-gray-300 rounded-xl"
                />
              </div>
            </div>

            {/* Cover Image / Thumbnail Picker & Upload */}
            <div className="p-4 rounded-2xl bg-[#FDF8F9] border border-[#EAD7E0] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-[#7F3D59] uppercase tracking-wider text-[11px]">
                    Course Cover Image
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Select an AWIEF template image, paste a URL, or upload your own cover artwork.
                  </p>
                </div>
                <label className="px-3 py-1.5 bg-white hover:bg-gray-50 border border-[#EAD7E0] rounded-xl font-bold text-[#7F3D59] cursor-pointer inline-flex items-center gap-1.5 self-start">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Image</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleThumbnailUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                {THUMBNAIL_PRESETS.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => setThumbnailUrl(preset.url)}
                    className={`px-3 py-1.5 rounded-lg font-semibold border transition-colors ${
                      thumbnailUrl === preset.url
                        ? "bg-[#7F3D59] text-white border-[#7F3D59]"
                        : "bg-white text-gray-700 border-gray-200 hover:border-[#7F3D59]"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="/images/investment-readiness.png or https://..."
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-mono text-[11px]"
              />
            </div>

            {/* Course-Level Learning Objectives */}
            <div className="p-4 rounded-2xl bg-[#FDF8F9] border border-[#EAD7E0] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-[#7F3D59] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Course Learning Objectives</span>
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Executive competencies learners will master inside this course.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLearningObjectives([...learningObjectives, ""])}
                  className="px-3 py-1.5 bg-[#7F3D59] text-white rounded-lg font-bold inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Objective</span>
                </button>
              </div>

              <div className="space-y-2">
                {learningObjectives.map((obj, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#7F3D59]/10 text-[#7F3D59] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={obj}
                      onChange={(e) => {
                        const next = [...learningObjectives];
                        next[idx] = e.target.value;
                        setLearningObjectives(next);
                      }}
                      placeholder={`Learning objective #${idx + 1}...`}
                      className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setLearningObjectives(
                          learningObjectives.length > 1
                            ? learningObjectives.filter((_, i) => i !== idx)
                            : [""]
                        )
                      }
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg"
                      title="Remove objective"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTab("CURRICULUM")}
                className="px-5 py-2.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl font-bold"
              >
                Next: Build Curriculum →
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: LEARNDASH-STYLE CURRICULUM BUILDER */}
        {activeTab === "CURRICULUM" && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FDF8F9] p-4 rounded-2xl border border-[#EAD7E0]">
              <div>
                <h4 className="font-serif font-bold text-gray-900 text-sm">
                  Modular Curriculum Builder (Sections, Lessons, Objectives &amp; Quizzes)
                </h4>
                <p className="text-[11px] text-gray-500">
                  {modules.length} {modules.length === 1 ? "Module" : "Modules"} • {totalTopicsCount}{" "}
                  Sub-Topics • {totalQuizzesCount} Embedded Quizzes
                  {loadingQuizzes && " • Loading attached quizzes..."}
                </p>
              </div>
              <button
                type="button"
                onClick={addModule}
                className="px-4 py-2 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl font-bold inline-flex items-center gap-1.5 shadow-xs self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Module</span>
              </button>
            </div>

            <div className="space-y-3">
              {modules.map((mod, mIdx) => {
                const isExpanded = expandedModuleIdx === mIdx;
                return (
                  <div
                    key={mod.id}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isExpanded ? "border-[#7F3D59] bg-white shadow-sm" : "border-[#EAD7E0] bg-[#FDF8F9]/60"
                    }`}
                  >
                    {/* Module Header Row */}
                    <div className="px-4 py-3 flex items-center justify-between gap-3 bg-[#FDF8F9]">
                      <button
                        type="button"
                        onClick={() => setExpandedModuleIdx(isExpanded ? null : mIdx)}
                        className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-[#7F3D59] shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-[#7F3D59] text-white font-bold text-[10px] shrink-0">
                          M{mIdx + 1}
                        </span>
                        <span className="font-serif font-bold text-gray-900 truncate">
                          {mod.title || `Module ${mIdx + 1}`}
                        </span>
                        <span className="text-[10px] font-mono text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 shrink-0 hidden sm:inline">
                          {mod.duration || "25 mins"}
                        </span>
                        {mod.inlineQuiz && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shrink-0">
                            Quiz ({mod.inlineQuiz.questions.length} Qs)
                          </span>
                        )}
                      </button>

                      {/* Reorder & Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={mIdx === 0}
                          onClick={() => moveModule(mIdx, -1)}
                          className="p-1.5 rounded-lg hover:bg-white text-gray-500 disabled:opacity-30"
                          title="Move Module Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={mIdx === modules.length - 1}
                          onClick={() => moveModule(mIdx, 1)}
                          className="p-1.5 rounded-lg hover:bg-white text-gray-500 disabled:opacity-30"
                          title="Move Module Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateModule(mIdx)}
                          className="p-1.5 rounded-lg hover:bg-white text-gray-500"
                          title="Duplicate Module"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeModule(mIdx)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                          title="Remove Module"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Module Body */}
                    {isExpanded && (
                      <div className="p-5 space-y-5 border-t border-[#EAD7E0]">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                            <label className="block font-bold text-gray-700 mb-1">Module Title *</label>
                            <input
                              type="text"
                              value={mod.title}
                              onChange={(e) => updateModule(mIdx, { title: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-gray-700 mb-1">Duration</label>
                            <input
                              type="text"
                              value={mod.duration}
                              onChange={(e) => updateModule(mIdx, { duration: e.target.value })}
                              placeholder="e.g. 25 mins"
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block font-bold text-gray-700 mb-1">
                            Module Summary &amp; Lesson Content
                          </label>
                          <textarea
                            rows={2}
                            value={mod.summary}
                            onChange={(e) => updateModule(mIdx, { summary: e.target.value })}
                            placeholder="Explain what learners will accomplish in this 20–30 minute lesson..."
                            className="w-full p-3 border border-gray-300 rounded-xl"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <label className="font-bold text-gray-700 flex items-center gap-1.5">
                                <Video className="w-3.5 h-3.5 text-[#7F3D59]" />
                                <span>Lesson Video (Upload or Paste URL)</span>
                              </label>
                              <label className="px-2.5 py-1 bg-[#7F3D59]/10 hover:bg-[#7F3D59]/20 text-[#7F3D59] rounded-lg font-bold cursor-pointer inline-flex items-center gap-1 transition-colors shrink-0">
                                <Upload className="w-3 h-3" />
                                <span>
                                  {uploadingKey === `mod-video-${mIdx}` ? "Uploading..." : "Upload Video"}
                                </span>
                                <input
                                  type="file"
                                  accept="video/mp4,video/webm,video/quicktime,video/x-m4v,audio/mpeg,audio/mp4"
                                  disabled={uploadingKey === `mod-video-${mIdx}`}
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    e.target.value = "";
                                    if (!file) return;
                                    const up = await uploadCourseFile(file, "video", `mod-video-${mIdx}`);
                                    if (up) updateModule(mIdx, { videoUrl: up.url });
                                  }}
                                  className="hidden"
                                />
                              </label>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={mod.videoUrl}
                                onChange={(e) => updateModule(mIdx, { videoUrl: e.target.value })}
                                placeholder="Upload MP4/WebM or paste YouTube / Vimeo / video URL"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-xl"
                              />
                              {mod.videoUrl && (
                                <button
                                  type="button"
                                  onClick={() => updateModule(mIdx, { videoUrl: "" })}
                                  className="p-2 text-gray-400 hover:text-red-600 rounded-lg border border-gray-200"
                                  title="Clear video"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            {mod.videoUrl.startsWith("/api/uploads/") && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                <Check className="w-3 h-3" /> Uploaded video ready for playback
                              </span>
                            )}
                          </div>
                          <div>
                            <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-[#7F3D59]" />
                              <span>Pan-African Case Study (Optional)</span>
                            </label>
                            <input
                              type="text"
                              value={mod.caseStudy}
                              onChange={(e) => updateModule(mIdx, { caseStudy: e.target.value })}
                              placeholder="e.g. How a Nairobi HealthTech founder structured Series A diligence..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl"
                            />
                          </div>
                        </div>

                        {/* Toolkit / Document Attachment (Upload or URL) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#FDF8F9] p-3.5 rounded-xl border border-[#EAD7E0]">
                          <div>
                            <label className="block font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                              <Download className="w-3.5 h-3.5 text-[#7F3D59]" />
                              <span>Document / Toolkit Title</span>
                            </label>
                            <input
                              type="text"
                              value={mod.templateName}
                              onChange={(e) => updateModule(mIdx, { templateName: e.target.value })}
                              placeholder="e.g. Investor Data Room Checklist (.pdf / .docx)"
                              className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <label className="font-bold text-gray-700">
                                Toolkit Document File (Upload or URL)
                              </label>
                              <label className="px-2.5 py-1 bg-white hover:bg-gray-50 text-[#7F3D59] border border-[#EAD7E0] rounded-lg font-bold cursor-pointer inline-flex items-center gap-1 transition-colors shrink-0">
                                <Upload className="w-3 h-3" />
                                <span>
                                  {uploadingKey === `mod-doc-${mIdx}` ? "Uploading..." : "Upload Document"}
                                </span>
                                <input
                                  type="file"
                                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.rtf,.zip"
                                  disabled={uploadingKey === `mod-doc-${mIdx}`}
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    e.target.value = "";
                                    if (!file) return;
                                    const up = await uploadCourseFile(file, "document", `mod-doc-${mIdx}`);
                                    if (up) {
                                      updateModule(mIdx, {
                                        templateUrl: up.url,
                                        templateName: mod.templateName.trim() || up.fileName,
                                      });
                                    }
                                  }}
                                  className="hidden"
                                />
                              </label>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={mod.templateUrl}
                                onChange={(e) => updateModule(mIdx, { templateUrl: e.target.value })}
                                placeholder="Upload PDF/DOCX/XLSX or paste document URL..."
                                className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg"
                              />
                              {mod.templateUrl && (
                                <button
                                  type="button"
                                  onClick={() => updateModule(mIdx, { templateUrl: "" })}
                                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg bg-white border border-gray-200"
                                  title="Clear document"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Module Learning Objectives (living inside the module) */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="font-bold text-gray-700">
                              Module Learning Objectives / Takeaways
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                updateModule(mIdx, { keyTakeaways: [...mod.keyTakeaways, ""] })
                              }
                              className="text-[11px] font-bold text-[#7F3D59] hover:underline inline-flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Add Objective
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            {mod.keyTakeaways.map((kt, kIdx) => (
                              <div key={kIdx} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={kt}
                                  onChange={(e) => {
                                    const copy = [...mod.keyTakeaways];
                                    copy[kIdx] = e.target.value;
                                    updateModule(mIdx, { keyTakeaways: copy });
                                  }}
                                  placeholder={`Module objective #${kIdx + 1}...`}
                                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateModule(mIdx, {
                                      keyTakeaways:
                                        mod.keyTakeaways.length > 1
                                          ? mod.keyTakeaways.filter((_, i) => i !== kIdx)
                                          : [""],
                                    })
                                  }
                                  className="p-1.5 text-gray-400 hover:text-red-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Sub-Topics inside Module (LearnDash Topic Hierarchy) */}
                        <div className="space-y-2 pt-2 border-t border-gray-100">
                          <div className="flex items-center justify-between">
                            <label className="font-bold text-gray-700">
                              Sub-Lessons / Topics inside this Module ({mod.topics.length})
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                updateModule(mIdx, {
                                  topics: [
                                    ...mod.topics,
                                    {
                                      id: `topic-${Date.now()}`,
                                      title: `Topic ${mod.topics.length + 1}`,
                                      duration: "10 mins",
                                      summary: "",
                                    },
                                  ],
                                })
                              }
                              className="text-[11px] font-bold text-[#7F3D59] hover:underline inline-flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Add Sub-Topic
                            </button>
                          </div>

                          {mod.topics.map((topic, tIdx) => (
                            <div
                              key={topic.id}
                              className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-2"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                                <input
                                  type="text"
                                  value={topic.title}
                                  onChange={(e) => {
                                    const nextTopics = [...mod.topics];
                                    nextTopics[tIdx] = { ...topic, title: e.target.value };
                                    updateModule(mIdx, { topics: nextTopics });
                                  }}
                                  placeholder="Sub-topic title"
                                  className="md:col-span-4 px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-medium"
                                />
                                <input
                                  type="text"
                                  value={topic.duration}
                                  onChange={(e) => {
                                    const nextTopics = [...mod.topics];
                                    nextTopics[tIdx] = { ...topic, duration: e.target.value };
                                    updateModule(mIdx, { topics: nextTopics });
                                  }}
                                  placeholder="10 mins"
                                  className="md:col-span-2 px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg"
                                />
                                <input
                                  type="text"
                                  value={topic.summary}
                                  onChange={(e) => {
                                    const nextTopics = [...mod.topics];
                                    nextTopics[tIdx] = { ...topic, summary: e.target.value };
                                    updateModule(mIdx, { topics: nextTopics });
                                  }}
                                  placeholder="Brief topic notes..."
                                  className="md:col-span-5 px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateModule(mIdx, {
                                      topics: mod.topics.filter((_, i) => i !== tIdx),
                                    })
                                  }
                                  className="md:col-span-1 p-1.5 text-gray-400 hover:text-red-600 justify-self-end"
                                  title="Remove sub-topic"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={topic.videoUrl || ""}
                                    onChange={(e) => {
                                      const nextTopics = [...mod.topics];
                                      nextTopics[tIdx] = {
                                        ...topic,
                                        videoUrl: e.target.value.trim() || undefined,
                                      };
                                      updateModule(mIdx, { topics: nextTopics });
                                    }}
                                    placeholder="Topic video (upload or paste URL)"
                                    className="flex-1 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-[11px]"
                                  />
                                  <label className="px-2 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-[10px] font-bold text-[#7F3D59] cursor-pointer inline-flex items-center gap-1 shrink-0">
                                    <Upload className="w-3 h-3" />
                                    <span>
                                      {uploadingKey === `topic-vid-${mIdx}-${tIdx}` ? "..." : "Video"}
                                    </span>
                                    <input
                                      type="file"
                                      accept="video/mp4,video/webm,video/quicktime,video/x-m4v,audio/mpeg,audio/mp4"
                                      disabled={uploadingKey === `topic-vid-${mIdx}-${tIdx}`}
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        e.target.value = "";
                                        if (!file) return;
                                        const up = await uploadCourseFile(
                                          file,
                                          "video",
                                          `topic-vid-${mIdx}-${tIdx}`
                                        );
                                        if (up) {
                                          const nextTopics = [...mod.topics];
                                          nextTopics[tIdx] = { ...topic, videoUrl: up.url };
                                          updateModule(mIdx, { topics: nextTopics });
                                        }
                                      }}
                                      className="hidden"
                                    />
                                  </label>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={topic.documentName || topic.documentUrl || ""}
                                    onChange={(e) => {
                                      const nextTopics = [...mod.topics];
                                      const val = e.target.value;
                                      if (/^(https?:\/\/|\/)/i.test(val.trim())) {
                                        nextTopics[tIdx] = { ...topic, documentUrl: val.trim() };
                                      } else {
                                        nextTopics[tIdx] = { ...topic, documentName: val };
                                      }
                                      updateModule(mIdx, { topics: nextTopics });
                                    }}
                                    placeholder="Topic document (upload PDF/DOCX/XLSX or paste URL)"
                                    className="flex-1 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-[11px]"
                                  />
                                  <label className="px-2 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-[10px] font-bold text-[#7F3D59] cursor-pointer inline-flex items-center gap-1 shrink-0">
                                    <Upload className="w-3 h-3" />
                                    <span>
                                      {uploadingKey === `topic-doc-${mIdx}-${tIdx}` ? "..." : "Doc"}
                                    </span>
                                    <input
                                      type="file"
                                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.rtf,.zip"
                                      disabled={uploadingKey === `topic-doc-${mIdx}-${tIdx}`}
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        e.target.value = "";
                                        if (!file) return;
                                        const up = await uploadCourseFile(
                                          file,
                                          "document",
                                          `topic-doc-${mIdx}-${tIdx}`
                                        );
                                        if (up) {
                                          const nextTopics = [...mod.topics];
                                          nextTopics[tIdx] = {
                                            ...topic,
                                            documentName: up.fileName,
                                            documentUrl: up.url,
                                          };
                                          updateModule(mIdx, { topics: nextTopics });
                                        }
                                      }}
                                      className="hidden"
                                    />
                                  </label>
                                  {topic.documentUrl && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextTopics = [...mod.topics];
                                        nextTopics[tIdx] = {
                                          ...topic,
                                          documentName: undefined,
                                          documentUrl: undefined,
                                        };
                                        updateModule(mIdx, { topics: nextTopics });
                                      }}
                                      className="p-1 text-gray-400 hover:text-red-600"
                                      title="Clear document"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Embedded Module Quiz Builder (Living inside this Module) */}
                        <div className="p-4 rounded-2xl bg-[#FDF8F9] border border-[#EAD7E0] space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <HelpCircle className="w-4 h-4 text-[#7F3D59]" />
                              <span className="font-bold text-gray-900">
                                Module Graded Assessment / Quiz
                              </span>
                            </div>

                            {!mod.inlineQuiz ? (
                              <button
                                type="button"
                                onClick={() => enableModuleQuiz(mIdx)}
                                className="px-3 py-1.5 bg-[#7F3D59] text-white rounded-lg font-bold inline-flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Quiz to Module</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  const key = mod.inlineQuiz?.quizKey || mod.quizId;
                                  if (key) {
                                    setDetachedQuizKeys((prev) =>
                                      prev.includes(key) ? prev : [...prev, key]
                                    );
                                  }
                                  updateModule(mIdx, { inlineQuiz: null, quizId: undefined });
                                }}
                                className="text-[11px] font-bold text-red-600 hover:underline"
                              >
                                Detach Inline Quiz
                              </button>
                            )}
                          </div>

                          {mod.inlineQuiz && (
                            <div className="space-y-4 pt-2 border-t border-[#EAD7E0]">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                    Quiz Title *
                                  </label>
                                  <input
                                    type="text"
                                    value={mod.inlineQuiz.name}
                                    onChange={(e) =>
                                      updateModule(mIdx, {
                                        inlineQuiz: { ...mod.inlineQuiz!, name: e.target.value },
                                      })
                                    }
                                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg font-semibold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                    Instructions
                                  </label>
                                  <input
                                    type="text"
                                    value={mod.inlineQuiz.intro}
                                    onChange={(e) =>
                                      updateModule(mIdx, {
                                        inlineQuiz: { ...mod.inlineQuiz!, intro: e.target.value },
                                      })
                                    }
                                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg"
                                  />
                                </div>
                              </div>

                              {/* Questions inside this module's quiz */}
                              <div className="space-y-3">
                                {mod.inlineQuiz.questions.map((q, qIdx) => (
                                  <div
                                    key={qIdx}
                                    className="p-3.5 rounded-xl bg-white border border-gray-200 space-y-2.5"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-bold text-[#7F3D59]">
                                        Question {qIdx + 1}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nextQs = mod.inlineQuiz!.questions.filter(
                                            (_, i) => i !== qIdx
                                          );
                                          updateModule(mIdx, {
                                            inlineQuiz: { ...mod.inlineQuiz!, questions: nextQs },
                                          });
                                        }}
                                        className="text-red-500 hover:text-red-700 text-[11px] font-bold"
                                      >
                                        Remove
                                      </button>
                                    </div>

                                    <input
                                      type="text"
                                      value={q.questiontext}
                                      onChange={(e) => {
                                        const nextQs = [...mod.inlineQuiz!.questions];
                                        nextQs[qIdx] = { ...q, questiontext: e.target.value };
                                        updateModule(mIdx, {
                                          inlineQuiz: { ...mod.inlineQuiz!, questions: nextQs },
                                        });
                                      }}
                                      placeholder="Enter question prompt..."
                                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg font-medium"
                                    />

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {q.answers.map((ans, aIdx) => (
                                        <div
                                          key={aIdx}
                                          className={`flex items-center gap-2 p-2 rounded-lg border ${
                                            ans.isCorrect
                                              ? "bg-emerald-50 border-emerald-300"
                                              : "bg-gray-50 border-gray-200"
                                          }`}
                                        >
                                          <input
                                            type="radio"
                                            name={`mod-${mIdx}-q-${qIdx}-correct`}
                                            checked={ans.isCorrect}
                                            onChange={() => {
                                              const nextQs = [...mod.inlineQuiz!.questions];
                                              nextQs[qIdx] = {
                                                ...q,
                                                answers: q.answers.map((a, idx2) => ({
                                                  ...a,
                                                  isCorrect: idx2 === aIdx,
                                                })),
                                              };
                                              updateModule(mIdx, {
                                                inlineQuiz: { ...mod.inlineQuiz!, questions: nextQs },
                                              });
                                            }}
                                            title="Mark as correct answer"
                                          />
                                          <input
                                            type="text"
                                            value={ans.text}
                                            onChange={(e) => {
                                              const nextQs = [...mod.inlineQuiz!.questions];
                                              const nextAns = [...q.answers];
                                              nextAns[aIdx] = { ...ans, text: e.target.value };
                                              nextQs[qIdx] = { ...q, answers: nextAns };
                                              updateModule(mIdx, {
                                                inlineQuiz: { ...mod.inlineQuiz!, questions: nextQs },
                                              });
                                            }}
                                            placeholder={`Option ${aIdx + 1}`}
                                            className="flex-1 bg-transparent focus:outline-none text-xs"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}

                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextQs = [
                                      ...mod.inlineQuiz!.questions,
                                      {
                                        name: `Question ${mod.inlineQuiz!.questions.length + 1}`,
                                        questiontext: "",
                                        answers: [
                                          { text: "", isCorrect: true },
                                          { text: "", isCorrect: false },
                                          { text: "", isCorrect: false },
                                          { text: "", isCorrect: false },
                                        ],
                                      },
                                    ];
                                    updateModule(mIdx, {
                                      inlineQuiz: { ...mod.inlineQuiz!, questions: nextQs },
                                    });
                                  }}
                                  className="px-3 py-1.5 bg-white hover:bg-gray-50 border border-[#EAD7E0] text-[#7F3D59] rounded-lg font-bold inline-flex items-center gap-1"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Add Question to Module Quiz</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveTab("OVERVIEW")}
                className="px-4 py-2 border border-gray-300 rounded-xl font-bold text-gray-700"
              >
                ← Back to Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("SETTINGS")}
                className="px-5 py-2.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl font-bold"
              >
                Next: Pricing &amp; Settings →
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: SETTINGS, PRICING & AUTHOR ROYALTIES */}
        {activeTab === "SETTINGS" && (
          <div className="space-y-6">
            {/* Access Mode & Pricing */}
            <div className="p-5 rounded-2xl bg-[#FDF8F9] border border-[#EAD7E0] space-y-4">
              <h4 className="font-bold uppercase tracking-wider text-[#7F3D59] text-[11px]">
                Access Mode &amp; Tuition Pricing
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsFree(false)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    !isFree
                      ? "bg-white border-[#7F3D59] ring-2 ring-[#7F3D59]/20"
                      : "bg-white/60 border-gray-200 text-gray-600"
                  }`}
                >
                  <p className="font-bold text-gray-900">Paid Commercial Masterclass</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Learners pay via PayFast (ZAR), PayPal (USD), Paystack, or Grant Voucher.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setIsFree(true)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    isFree
                      ? "bg-white border-[#7F3D59] ring-2 ring-[#7F3D59]/20"
                      : "bg-white/60 border-gray-200 text-gray-600"
                  }`}
                >
                  <p className="font-bold text-gray-900">Open / Partner-Sponsored (Free)</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Instant R0.00 enrollment for AWIEF cohort &amp; scholarship programmes.
                  </p>
                </button>
              </div>

              {!isFree && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Tuition Price (ZAR)</label>
                    <input
                      type="number"
                      min={0}
                      value={priceZar}
                      onChange={(e) => setPriceZar(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Tuition Price (USD)</label>
                    <input
                      type="number"
                      min={0}
                      value={priceUsd}
                      onChange={(e) => setPriceUsd(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Author Royalty Share (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={royaltyRate}
                      onChange={(e) => setRoyaltyRate(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Faculty Author Profile */}
            <div className="p-5 rounded-2xl bg-white border border-[#EAD7E0] space-y-4">
              <h4 className="font-bold uppercase tracking-wider text-[#7F3D59] text-[11px]">
                Faculty Author &amp; Statement Attribution
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Author Name</label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="e.g. Nomsa Dlamini"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Author Role / Title</label>
                  <input
                    type="text"
                    value={authorRole}
                    onChange={(e) => setAuthorRole(e.target.value)}
                    placeholder="e.g. Lead Syndicate Principal"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Author Email</label>
                  <input
                    type="email"
                    value={authorEmail}
                    onChange={(e) => setAuthorEmail(e.target.value)}
                    placeholder="author@awieforum.org"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Faculty Author Bio</label>
                <textarea
                  rows={2}
                  value={authorBio}
                  onChange={(e) => setAuthorBio(e.target.value)}
                  placeholder="Short biography displayed on the course overview page..."
                  className="w-full p-3 border border-gray-300 rounded-xl"
                />
              </div>
            </div>

            {/* Delivery Format & Visibility */}
            <div className="p-5 rounded-2xl bg-white border border-[#EAD7E0] space-y-4">
              <h4 className="font-bold uppercase tracking-wider text-[#7F3D59] text-[11px]">
                Delivery Format &amp; Publication Status
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isNative}
                    onChange={(e) => setIsNative(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-[#7F3D59]"
                  />
                  <div>
                    <span className="font-bold text-gray-900 block">
                      Native Modular Course Player (Recommended)
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Delivers bite-sized modules, low-bandwidth mode, toolkits, and module quizzes. Uncheck to launch an external interactive workshop package.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-[#7F3D59]"
                  />
                  <div>
                    <span className="font-bold text-gray-900 block">
                      Published in Live Catalogue
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Make this masterclass immediately discoverable and enrollable by founders.
                    </span>
                  </div>
                </label>
              </div>

              <div className="p-4 rounded-xl bg-[#FDF8F9] border border-[#EAD7E0] space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block font-bold text-gray-800">
                      Interactive Workshop Package (.zip / SCORM Entrypoint)
                    </label>
                    <p className="text-[11px] text-gray-500">
                      Upload a SCORM .zip package to extract interactive slides and populate fields, or paste a launch path.
                    </p>
                  </div>
                  <label className="px-3 py-1.5 bg-white hover:bg-gray-50 text-[#7F3D59] border border-[#EAD7E0] rounded-lg font-bold cursor-pointer inline-flex items-center gap-1.5 shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isAutoPopulating ? "Unpacking..." : "Upload SCORM (.zip)"}</span>
                    <input
                      type="file"
                      accept=".zip,.xml"
                      disabled={isAutoPopulating}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) handlePackageAutoFill(file);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={scormPath}
                  onChange={(e) => setScormPath(e.target.value)}
                  placeholder="/api/uploads/scorm/.../indexAPI.html or /course/scormdriver/indexAPI.html"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  LearnDash Source Reference ID (Optional)
                </label>
                <input
                  type="text"
                  value={learndashSourceId}
                  onChange={(e) => setLearndashSourceId(e.target.value)}
                  placeholder="e.g. LD-105"
                  className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-xl font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setActiveTab("CURRICULUM")}
                className="px-4 py-2 border border-gray-300 rounded-xl font-bold text-gray-700"
              >
                ← Back to Curriculum
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("PUBLISH")}
                className="px-5 py-2.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl font-bold"
              >
                Next: Review &amp; Publish →
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: REVIEW & PUBLISH */}
        {activeTab === "PUBLISH" && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[#FDF8F9] border border-[#EAD7E0] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAD7E0] pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7F3D59]">
                    Pre-Flight Course Summary
                  </span>
                  <h4 className="text-lg font-serif font-bold text-gray-900">
                    {title || "Untitled Masterclass"}
                  </h4>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-[11px] font-bold self-start ${
                    isPublished
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {isPublished ? "Ready to Publish Live" : "Draft Mode"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-[#EAD7E0]">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Modules</span>
                  <span className="text-lg font-serif font-bold text-gray-900">
                    {modules.length} Modules
                  </span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-[#EAD7E0]">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">
                    Module Quizzes
                  </span>
                  <span className="text-lg font-serif font-bold text-[#7F3D59]">
                    {totalQuizzesCount} Embedded
                  </span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-[#EAD7E0]">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Tuition</span>
                  <span className="text-lg font-serif font-bold text-gray-900">
                    {isFree ? "Free" : `R${priceZar.toLocaleString()} / $${priceUsd}`}
                  </span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-[#EAD7E0]">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">
                    Author Royalty
                  </span>
                  <span className="text-lg font-serif font-bold text-emerald-700">
                    {isFree ? "0%" : `${royaltyRate}%`}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="font-bold text-gray-700">Curriculum Outline:</p>
                <ul className="space-y-1 text-gray-600">
                  {modules.map((m, idx) => (
                    <li key={m.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-gray-100">
                      <span className="font-medium truncate">
                        {idx + 1}. {m.title}
                      </span>
                      <span className="text-[10px] font-mono text-gray-400 shrink-0 ml-2">
                        {m.duration} • {m.keyTakeaways.filter(Boolean).length} objectives
                        {m.inlineQuiz ? " • Quiz attached" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("SETTINGS")}
                className="px-4 py-2 border border-gray-300 rounded-xl font-bold text-gray-700"
              >
                ← Back to Settings
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveCourse(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold disabled:opacity-50"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveCourse(true)}
                  className="px-6 py-2.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl font-bold shadow-md disabled:opacity-50"
                >
                  {isSaving ? "Saving Masterclass..." : "Publish Masterclass Live"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
