import fs from "fs";
import path from "path";
import type { ExtractedZipEntry } from "./zipUtils";
import { extractZipEntries, sanitizeZipEntryPath } from "./zipUtils";
import {
  type ImportedModule,
  type ImportedQuiz,
  type ImportedQuizQuestion,
  type ImportedTopic,
  type ParsedLearnDashCourse,
  extractAllXmlTags,
  extractBulletList,
  extractResourceLink,
  extractVideoUrl,
  extractXmlTag,
  stripHtmlAndBlocks,
  toSlug,
} from "./learndashImporter";

interface ManifestItemNode {
  identifier: string;
  identifierref: string;
  title: string;
  children: ManifestItemNode[];
}

export interface ScormExtractOptions {
  /** Destination directory on disk where SCORM static files should be extracted (optional). */
  extractDir?: string;
  /** Public base URL (e.g. `/api/uploads/scorm/pkg-123`) corresponding to `extractDir`. */
  publicBaseUrl?: string;
  /** Original uploaded filename (used as fallback title). */
  fileName?: string;
}

/**
 * Checks whether an XML document looks like an IMS / ADL SCORM `imsmanifest.xml` or TinCan manifest.
 *
 * @param {string} xmlContent - Raw XML text.
 * @returns {boolean} True if this is a SCORM or TinCan package manifest.
 */
export function isScormManifestXml(xmlContent: string): boolean {
  if (!xmlContent) return false;
  const head = xmlContent.slice(0, 4000);
  if (/<manifest\b/i.test(head) && (/<organizations\b/i.test(xmlContent) || /<resources\b/i.test(xmlContent))) {
    return true;
  }
  if (/<tincan\b/i.test(head) && /<activities\b/i.test(xmlContent)) {
    return true;
  }
  return false;
}

/**
 * Converts an ISO 8601 duration (e.g. `PT1H30M0S`) into human-readable study time.
 *
 * @param {string | undefined} rawIso - Raw ISO duration string.
 * @returns {string} Human-readable duration or empty string if zero/unrecognized.
 */
export function parseIso8601Duration(rawIso?: string): string {
  if (!rawIso) return "";
  const m = rawIso.trim().match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/i);
  if (!m) return "";
  const days = Number(m[1] || 0);
  const hours = Number(m[2] || 0) + days * 24;
  const mins = Number(m[3] || 0);
  const secs = Math.round(Number(m[4] || 0));

  if (hours === 0 && mins === 0 && secs === 0) return "";
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "hr" : "hrs"}`);
  if (mins > 0) parts.push(`${mins} mins`);
  if (hours === 0 && mins === 0 && secs > 0) parts.push(`${secs} secs`);
  return parts.join(" ");
}

/**
 * Extracts an XML attribute value from a tag opening string.
 */
function getAttr(tagAttrs: string, attrName: string): string {
  const escaped = attrName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tagAttrs.match(new RegExp(`\\b${escaped}\\s*=\\s*["']([^"']*)["']`, "i"));
  return match ? match[1].trim() : "";
}

/**
 * Parses nested `<item>` hierarchy inside an `<organization>` XML block cleanly via a tag stack.
 */
function parseManifestItemsHierarchy(orgXml: string): ManifestItemNode[] {
  const roots: ManifestItemNode[] = [];
  const stack: ManifestItemNode[] = [];
  const tokenRegex = /<(\/?)(item|title)\b([^>]*?)(\/?)>/gi;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(orgXml)) !== null) {
    const isClosing = match[1] === "/";
    const tag = match[2].toLowerCase();
    const attrs = match[3] || "";
    const isSelfClosing = match[4] === "/";

    if (tag === "item") {
      if (isClosing) {
        stack.pop();
      } else {
        const node: ManifestItemNode = {
          identifier: getAttr(attrs, "identifier") || `item-${roots.length + stack.length + 1}`,
          identifierref: getAttr(attrs, "identifierref"),
          title: "",
          children: [],
        };
        if (stack.length > 0) {
          stack[stack.length - 1].children.push(node);
        } else {
          roots.push(node);
        }
        if (!isSelfClosing) {
          stack.push(node);
        }
      }
    } else if (tag === "title" && !isClosing && !isSelfClosing && stack.length > 0) {
      const closeIdx = orgXml.indexOf("</title>", tokenRegex.lastIndex);
      if (closeIdx !== -1) {
        const rawTitle = orgXml.slice(tokenRegex.lastIndex, closeIdx);
        const current = stack[stack.length - 1];
        if (!current.title) {
          current.title = stripHtmlAndBlocks(rawTitle);
        }
        tokenRegex.lastIndex = closeIdx + "</title>".length;
      }
    }
  }

  return roots;
}

/**
 * Extracts LOM metadata (`title`, `description`, `duration`, `author`, `keywords`) from `metadata.xml`
 * or an inline `<lom>` section.
 */
function extractLomMetadata(xml: string): {
  title?: string;
  description?: string;
  duration?: string;
  authorName?: string;
  authorRole?: string;
  keywords: string[];
} {
  if (!xml) return { keywords: [] };

  const titleTag =
    extractXmlTag(extractXmlTag(xml, "general"), "title") || extractXmlTag(xml, "title");
  const title = stripHtmlAndBlocks(extractXmlTag(titleTag, "string") || titleTag) || undefined;

  const descTag =
    extractXmlTag(extractXmlTag(xml, "general"), "description") || extractXmlTag(xml, "description");
  const description = stripHtmlAndBlocks(extractXmlTag(descTag, "string") || descTag) || undefined;

  const durationRaw = extractXmlTag(extractXmlTag(xml, "typicalLearningTime"), "duration");
  const duration = parseIso8601Duration(durationRaw) || undefined;

  const keywordBlocks = extractAllXmlTags(extractXmlTag(xml, "general") || xml, "keyword");
  const keywords = keywordBlocks
    .map((k) => stripHtmlAndBlocks(extractXmlTag(k, "string") || k))
    .filter(Boolean);

  const entityText = stripHtmlAndBlocks(extractXmlTag(xml, "entity"));
  let authorName: string | undefined;
  let authorRole: string | undefined;
  if (entityText) {
    const fnMatch = entityText.match(/FN:([^\r\n]+)/i);
    const orgMatch = entityText.match(/ORG:([^\r\n]+)/i);
    if (fnMatch?.[1]) authorName = fnMatch[1].trim();
    if (orgMatch?.[1]) authorRole = orgMatch[1].trim();
  }

  return { title, description, duration, authorName, authorRole, keywords };
}

/**
 * Resolves a ZIP-relative asset path into its public URL when the package is extracted to disk.
 */
function resolveAssetUrl(rawPath: string, publicBaseUrl?: string, knownAssets?: Set<string>): string | undefined {
  if (!rawPath) return undefined;
  const trimmed = rawPath.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (!publicBaseUrl) return undefined;

  const clean = trimmed.replace(/^\.?\//, "");
  if (knownAssets?.has(clean)) {
    return `${publicBaseUrl}/${clean}`;
  }
  const underScormContent = `scormcontent/${clean}`;
  if (knownAssets?.has(underScormContent)) {
    return `${publicBaseUrl}/${underScormContent}`;
  }
  const underAssets = `scormcontent/assets/${clean}`;
  if (knownAssets?.has(underAssets)) {
    return `${publicBaseUrl}/${underAssets}`;
  }
  return `${publicBaseUrl}/${clean}`;
}

/**
 * Decodes Articulate Rise `runtime-data.js` (`__jsonp("runtime-data.js", "<base64>")`) into modules & quizzes.
 */
function parseArticulateRiseData(
  jsText: string,
  publicBaseUrl?: string,
  knownAssets?: Set<string>
): {
  description?: string;
  learningObjectives: string[];
  modules: ImportedModule[];
  quizzes: ImportedQuiz[];
} | null {
  try {
    let payloadObj: Record<string, unknown> | null = null;
    const jsonpMatch = jsText.match(/__jsonp\s*\(\s*["'][^"']+["']\s*,\s*["']([^"']+)["']\s*\)/);
    if (jsonpMatch?.[1]) {
      const jsonStr = Buffer.from(jsonpMatch[1], "base64").toString("utf8");
      payloadObj = JSON.parse(jsonStr);
    } else if (jsText.trim().startsWith("{")) {
      payloadObj = JSON.parse(jsText);
    }

    const courseObj = (payloadObj?.course as Record<string, unknown>) || payloadObj;
    const rawLessons = Array.isArray(courseObj?.lessons)
      ? (courseObj.lessons as Record<string, unknown>[])
      : null;
    if (!rawLessons || rawLessons.length === 0) return null;

    const rawDesc = typeof courseObj?.description === "string" ? courseObj.description : "";
    const description = stripHtmlAndBlocks(rawDesc) || undefined;
    const courseObjectives = extractBulletList(rawDesc);

    const modules: ImportedModule[] = [];
    const quizzes: ImportedQuiz[] = [];

    let activeSectionTitle = "";

    for (let idx = 0; idx < rawLessons.length; idx++) {
      const lesson = rawLessons[idx];
      if (lesson.deleted) continue;
      const lessonType = String(lesson.type || "blocks").toLowerCase();
      const lessonTitle = stripHtmlAndBlocks(String(lesson.title || "")) || `Module ${modules.length + 1}`;

      if (lessonType === "section") {
        activeSectionTitle = lessonTitle;
        continue;
      }

      const summaryParts: string[] = [];
      const takeaways: string[] = [];
      const topics: ImportedTopic[] = [];
      let videoUrl: string | undefined;
      let templateName: string | undefined;
      let templateUrl: string | undefined;
      const caseStudyParts: string[] = [];

      const items = Array.isArray(lesson.items) ? (lesson.items as Record<string, unknown>[]) : [];
      for (const block of items) {
        const blockFamily = String(block.family || block.type || "").toLowerCase();
        const blockItems = Array.isArray(block.items) ? (block.items as Record<string, unknown>[]) : [];

        // Extract text & list items inside Rise blocks
        for (const sub of blockItems) {
          const heading = stripHtmlAndBlocks(String(sub.heading || sub.title || ""));
          const paragraphHtml = String(sub.paragraph || sub.description || sub.caption || "");
          const paragraph = stripHtmlAndBlocks(paragraphHtml);

          // Collect bullet lists as module learning objectives
          if (paragraphHtml) {
            const bullets = extractBulletList(paragraphHtml);
            for (const b of bullets) {
              if (!takeaways.includes(b)) takeaways.push(b);
            }
            const res = extractResourceLink(paragraphHtml);
            if (!templateUrl && res.templateUrl) {
              templateName = res.templateName;
              templateUrl = res.templateUrl;
            }
          }

          if (paragraph && paragraph.length > 15 && !paragraph.includes("When we show up to the present moment")) {
            const line = heading && heading.toLowerCase() !== "heading" ? `${heading}: ${paragraph}` : paragraph;
            if (blockFamily.includes("interactive") || blockFamily.includes("timeline")) {
              caseStudyParts.push(line);
            } else {
              summaryParts.push(line);
            }
          }

          // Video embed (YouTube / Vimeo / local uploaded asset in scormcontent/assets)
          const media = sub.media as Record<string, unknown> | undefined;
          const embed = media?.embed as Record<string, unknown> | undefined;
          const videoObj = media?.video as Record<string, unknown> | undefined;
          if (!videoUrl) {
            if (typeof embed?.originalUrl === "string") {
              videoUrl = embed.originalUrl;
            } else if (typeof embed?.src === "string") {
              videoUrl = extractVideoUrl(`<iframe src="${embed.src}"></iframe>`, {});
            } else if (typeof videoObj?.crushedKey === "string") {
              videoUrl = resolveAssetUrl(`scormcontent/assets/${videoObj.crushedKey}`, publicBaseUrl, knownAssets);
            } else if (typeof videoObj?.originalUrl === "string") {
              videoUrl = resolveAssetUrl(String(videoObj.originalUrl), publicBaseUrl, knownAssets);
            }
          }

          // Document / attachment inside Rise block
          const fileObj = (media?.attachment || media?.document || sub.file) as Record<string, unknown> | undefined;
          if (!templateUrl && fileObj) {
            const fileHref = String(fileObj.key || fileObj.crushedKey || fileObj.url || "");
            if (fileHref) {
              templateName = String(fileObj.title || fileObj.name || fileHref.split("/").pop() || "Resource");
              templateUrl = resolveAssetUrl(fileHref, publicBaseUrl, knownAssets) || fileHref;
            }
          }
        }

        // Handle Rise Knowledge Checks inside block
        if (blockFamily.includes("knowledge") || String(block.type || "").toLowerCase().includes("quiz")) {
          const questionsRaw = Array.isArray(block.questions)
            ? (block.questions as Record<string, unknown>[])
            : blockItems;
          const parsedQuestions: ImportedQuizQuestion[] = [];
          for (const qItem of questionsRaw) {
            const qText = stripHtmlAndBlocks(String(qItem.title || qItem.question || ""));
            const ansRaw = Array.isArray(qItem.answers) ? (qItem.answers as Record<string, unknown>[]) : [];
            const answers = ansRaw
              .map((a) => ({
                text: stripHtmlAndBlocks(String(a.title || a.text || "")),
                isCorrect: Boolean(a.correct || a.isCorrect),
              }))
              .filter((a) => a.text.length > 0);
            if (qText && answers.length >= 2) {
              if (!answers.some((a) => a.isCorrect)) answers[0].isCorrect = true;
              parsedQuestions.push({
                name: qText.slice(0, 80),
                questiontext: qText,
                answers,
              });
            }
          }
          if (parsedQuestions.length > 0) {
            const qIndex = quizzes.length;
            quizzes.push({
              name: `${lessonTitle} Knowledge Check`,
              intro: `Embedded knowledge check from ${lessonTitle}.`,
              questions: parsedQuestions,
            });
            const modObj: ImportedModule = {
              id: `mod-scorm-${modules.length + 1}`,
              title:
                activeSectionTitle && !lessonTitle.toLowerCase().includes(activeSectionTitle.toLowerCase())
                  ? `${activeSectionTitle}: ${lessonTitle}`
                  : lessonTitle,
              duration: "20 mins",
              summary: summaryParts.slice(0, 3).join("\n\n") || `Interactive module covering ${lessonTitle}.`,
              videoUrl,
              caseStudy: caseStudyParts.slice(0, 3).join(" • ") || undefined,
              keyTakeaways: takeaways.slice(0, 6),
              templateName,
              templateUrl,
              topics,
              attachedQuizIndex: qIndex,
            };
            modules.push(modObj);
            continue;
          }
        }
      }

      // Standalone Rise Quiz lesson (`lesson.type === "quiz"`)
      let attachedQuizIndex: number | undefined;
      if (lessonType === "quiz") {
        const rawQs = Array.isArray(lesson.questions) ? (lesson.questions as Record<string, unknown>[]) : [];
        const qs: ImportedQuizQuestion[] = [];
        for (const q of rawQs) {
          const qText = stripHtmlAndBlocks(String(q.title || q.question || ""));
          const rawAns = Array.isArray(q.answers) ? (q.answers as Record<string, unknown>[]) : [];
          const answers = rawAns
            .map((a) => ({
              text: stripHtmlAndBlocks(String(a.title || a.text || "")),
              isCorrect: Boolean(a.correct || a.isCorrect),
            }))
            .filter((a) => a.text.length > 0);
          if (qText && answers.length >= 2) {
            if (!answers.some((a) => a.isCorrect)) answers[0].isCorrect = true;
            qs.push({ name: qText.slice(0, 80), questiontext: qText, answers });
          }
        }
        if (qs.length > 0) {
          attachedQuizIndex = quizzes.length;
          quizzes.push({
            name: lessonTitle,
            intro: stripHtmlAndBlocks(String(lesson.description || "")) || `Assessment for ${lessonTitle}`,
            questions: qs,
          });
        }
      }

      // Avoid duplicating module if knowledge check already pushed it for this lesson
      const alreadyAdded = modules.some(
        (m) => m.title.endsWith(lessonTitle) && m.attachedQuizIndex !== undefined
      );
      if (
        !alreadyAdded &&
        (summaryParts.length > 0 ||
          takeaways.length > 0 ||
          videoUrl ||
          attachedQuizIndex !== undefined ||
          lessonType !== "quiz")
      ) {
        const fullTitle =
          activeSectionTitle && !lessonTitle.toLowerCase().includes(activeSectionTitle.toLowerCase())
            ? `${activeSectionTitle}: ${lessonTitle}`
            : lessonTitle;
        const lessonDesc = stripHtmlAndBlocks(String(lesson.description || ""));
        modules.push({
          id: `mod-scorm-${modules.length + 1}`,
          title: fullTitle,
          duration: attachedQuizIndex !== undefined ? "15 mins" : "25 mins",
          summary:
            summaryParts.slice(0, 3).join("\n\n") ||
            lessonDesc ||
            `Interactive lesson module covering ${lessonTitle}.`,
          videoUrl,
          caseStudy: caseStudyParts.slice(0, 3).join(" • ") || undefined,
          keyTakeaways: takeaways.slice(0, 6),
          templateName,
          templateUrl,
          topics,
          attachedQuizIndex,
        });
      }
    }

    return {
      description,
      learningObjectives: courseObjectives.slice(0, 8),
      modules,
      quizzes,
    };
  } catch {
    return null;
  }
}

/**
 * Parses a SCORM 1.2 / 2004 `.zip` archive (or standalone `imsmanifest.xml`) and extracts
 * course metadata, modules, learning objectives, quizzes, and interactive launch URL.
 *
 * When `extractDir` and `publicBaseUrl` are supplied, all archive entries are safely unpacked to disk
 * so the course can immediately be launched interactively as well as edited module-by-module.
 *
 * @param {Buffer} inputBuffer - Raw bytes of a SCORM `.zip` archive or `imsmanifest.xml`.
 * @param {ScormExtractOptions} [options] - Optional disk extraction targets & original filename.
 * @returns {ParsedLearnDashCourse[]} Single-element array of normalized course structures.
 */
export function parseScormPackageBuffer(
  inputBuffer: Buffer,
  options: ScormExtractOptions = {}
): ParsedLearnDashCourse[] {
  const fileName = options.fileName || "scorm-package.zip";
  const isZip = inputBuffer.length >= 4 && inputBuffer.readUInt32LE(0) === 0x04034b50;

  let entries: ExtractedZipEntry[] = [];
  if (isZip) {
    entries = extractZipEntries(inputBuffer);
  } else {
    const asText = inputBuffer.toString("utf8");
    if (!isScormManifestXml(asText)) {
      throw new Error("The uploaded file is neither a valid SCORM .zip package nor an imsmanifest.xml file.");
    }
    entries = [{ name: "imsmanifest.xml", data: inputBuffer }];
  }

  // Locate imsmanifest.xml or tincan.xml (supports wrapped root folder inside zip)
  const manifestEntry =
    entries.find((e) => e.name.toLowerCase() === "imsmanifest.xml") ||
    entries.find((e) => e.name.toLowerCase().endsWith("/imsmanifest.xml"));
  const tincanEntry =
    entries.find((e) => e.name.toLowerCase() === "tincan.xml") ||
    entries.find((e) => e.name.toLowerCase().endsWith("/tincan.xml"));

  if (!manifestEntry && !tincanEntry) {
    throw new Error("No imsmanifest.xml or tincan.xml found inside this package.");
  }

  const anchorPath = (manifestEntry || tincanEntry)!.name;
  const rootPrefix = anchorPath.includes("/") ? anchorPath.slice(0, anchorPath.lastIndexOf("/") + 1) : "";

  const stripPrefix = (p: string) => (rootPrefix && p.startsWith(rootPrefix) ? p.slice(rootPrefix.length) : p);

  // Extract static files safely to disk if requested (only for zip packages)
  const knownAssets = new Set<string>();
  const textLookup: Record<string, string> = {};

  for (const entry of entries) {
    const relPath = sanitizeZipEntryPath(stripPrefix(entry.name));
    if (!relPath) continue;
    knownAssets.add(relPath);

    if (/\.(xml|js|json|html?|txt)$/i.test(relPath) && entry.data.length <= 5 * 1024 * 1024) {
      textLookup[relPath.toLowerCase()] = entry.data.toString("utf8");
    }

    if (isZip && options.extractDir) {
      const destPath = path.join(options.extractDir, relPath);
      const resolvedRoot = path.resolve(options.extractDir);
      const resolvedDest = path.resolve(destPath);
      if (resolvedDest.startsWith(resolvedRoot + path.sep)) {
        fs.mkdirSync(path.dirname(resolvedDest), { recursive: true });
        fs.writeFileSync(resolvedDest, entry.data);
      }
    }
  }

  const warnings: string[] = [];
  const manifestXml = manifestEntry ? manifestEntry.data.toString("utf8") : "";
  const tincanXml = tincanEntry ? tincanEntry.data.toString("utf8") : "";

  // Parse <resources> mapping
  const resourceHrefById: Record<string, string> = {};
  const resTagRegex = /<resource\b([^>]*?)(?:\/>|>[\s\S]*?<\/resource>)/gi;
  let rMatch: RegExpExecArray | null;
  let firstScoHref = "";
  while ((rMatch = resTagRegex.exec(manifestXml)) !== null) {
    const attrs = rMatch[1];
    const id = getAttr(attrs, "identifier");
    const href = getAttr(attrs, "href");
    const scormType = getAttr(attrs, "adlcp:scormType") || getAttr(attrs, "adlcp:scormtype");
    if (id && href) {
      resourceHrefById[id] = href;
      if (!firstScoHref || scormType.toLowerCase() === "sco") {
        if (!firstScoHref) firstScoHref = href;
        if (scormType.toLowerCase() === "sco") {
          firstScoHref = href;
        }
      }
    }
  }

  // Parse <organization> & items hierarchy
  const orgBlock = extractXmlTag(manifestXml, "organization");
  const orgTitleMatch = orgBlock.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const orgTitle = orgTitleMatch ? stripHtmlAndBlocks(orgTitleMatch[1]) : "";
  const itemTree = parseManifestItemsHierarchy(orgBlock);

  // Locate LOM metadata file (`metadata.xml` or inline `<lom>`)
  const metaLoc = extractXmlTag(manifestXml, "adlcp:location") || "metadata.xml";
  const metaXml = textLookup[metaLoc.toLowerCase()] || extractXmlTag(manifestXml, "lom");
  const lom = extractLomMetadata(metaXml);

  // Parse Articulate Rise runtime-data.js if available
  const riseRuntimeText =
    textLookup["scormcontent/runtime-data.js"] ||
    Object.entries(textLookup).find(([k]) => k.endsWith("runtime-data.js"))?.[1] ||
    "";
  const riseParsed = riseRuntimeText
    ? parseArticulateRiseData(riseRuntimeText, options.publicBaseUrl, knownAssets)
    : null;

  // Parse Storyline outline (`story_content/frame.xml`) if present and Rise wasn't matched
  const frameXml =
    textLookup["story_content/frame.xml"] ||
    Object.entries(textLookup).find(([k]) => k.endsWith("frame.xml"))?.[1] ||
    "";

  // Resolve launch URL for TinCan if manifest had none
  const tincanLaunch = stripHtmlAndBlocks(extractXmlTag(tincanXml, "launch"));
  const tincanName = stripHtmlAndBlocks(extractXmlTag(tincanXml, "name"));
  const tincanDesc = stripHtmlAndBlocks(extractXmlTag(tincanXml, "description"));

  const fallbackFilenameTitle = fileName
    .replace(/\.(zip|xml)$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const title =
    lom.title ||
    orgTitle ||
    tincanName ||
    itemTree[0]?.title ||
    fallbackFilenameTitle ||
    "Imported Interactive Course";

  const description =
    riseParsed?.description ||
    lom.description ||
    tincanDesc ||
    `Interactive masterclass package imported from ${fileName}.`;

  const shortDescription =
    description.length > 180 ? `${description.slice(0, 177).trim()}...` : description;

  // Determine launch path
  const launchHrefRaw =
    firstScoHref ||
    (itemTree[0]?.identifierref && resourceHrefById[itemTree[0].identifierref]) ||
    tincanLaunch ||
    (knownAssets.has("scormdriver/indexAPI.html")
      ? "scormdriver/indexAPI.html"
      : knownAssets.has("index_lms.html")
      ? "index_lms.html"
      : knownAssets.has("index.html")
      ? "index.html"
      : "");

  const scormPath =
    isZip && options.publicBaseUrl && launchHrefRaw
      ? `${options.publicBaseUrl}/${launchHrefRaw.replace(/^\.?\//, "")}`
      : launchHrefRaw
      ? `/course/${launchHrefRaw.replace(/^\.?\//, "")}`
      : undefined;

  // Build modules list from Rise > Storyline frame.xml > Manifest item tree
  let modules: ImportedModule[] = riseParsed?.modules || [];
  const quizzes: ImportedQuiz[] = riseParsed?.quizzes || [];

  if (modules.length === 0 && frameXml) {
    const slidelinkAttrs = [...frameXml.matchAll(/<slidelink\b([^>]*)>/gi)];
    const slideTitles = slidelinkAttrs
      .map((m) => getAttr(m[1], "displaytext"))
      .filter((t) => Boolean(t) && t.length > 2);
    if (slideTitles.length > 0) {
      modules = slideTitles.slice(0, 12).map((sTitle, sIdx) => ({
        id: `mod-slide-${sIdx + 1}`,
        title: `Module ${sIdx + 1}: ${sTitle}`,
        duration: "15 mins",
        summary: `Interactive presentation section covering ${sTitle}.`,
        keyTakeaways: [],
        topics: [],
      }));
    }
  }

  if (modules.length === 0) {
    // Convert manifest <organization><item> tree into modules
    const itemsToMap =
      itemTree.length === 1 && itemTree[0].children.length > 0
        ? itemTree[0].children
        : itemTree;

    if (itemsToMap.length > 0) {
      modules = itemsToMap.map((item, idx) => ({
        id: `mod-sco-${idx + 1}`,
        sourceId: item.identifier,
        title: item.title || `Module ${idx + 1}: ${title}`,
        duration: lom.duration || "30 mins",
        summary: shortDescription,
        keyTakeaways: riseParsed?.learningObjectives?.slice(0, 3) || [],
        topics: item.children.map((child, cIdx) => ({
          id: `topic-sco-${idx + 1}-${cIdx + 1}`,
          title: child.title || `Lesson ${cIdx + 1}`,
          duration: "15 mins",
          summary: "",
        })),
      }));
    } else {
      modules = [
        {
          id: "mod-sco-1",
          title: `Module 1: ${title}`,
          duration: lom.duration || "45 mins",
          summary: description,
          keyTakeaways: [],
          topics: [],
        },
      ];
    }
  }

  const schemaVer = stripHtmlAndBlocks(extractXmlTag(manifestXml, "schemaversion"));
  if (!isZip) {
    warnings.push(
      "Manifest XML imported metadata and module structure only; upload the full .zip package if you want interactive browser playback."
    );
  } else if (schemaVer) {
    warnings.push(`Detected package standard: SCORM ${schemaVer} (${knownAssets.size} files unpacked).`);
  }

  const manifestIdMatch = manifestXml.match(/<manifest\b[^>]*identifier=["']([^"']+)["']/i);
  const manifestId = manifestIdMatch?.[1]?.slice(0, 24) || `${Date.now()}`;

  const learningObjectives =
    riseParsed?.learningObjectives && riseParsed.learningObjectives.length > 0
      ? riseParsed.learningObjectives
      : Array.from(
          new Set(modules.flatMap((m) => m.keyTakeaways || []).filter(Boolean))
        ).slice(0, 8);

  const totalMins = modules.length * 25;
  const computedDuration =
    lom.duration ||
    (totalMins >= 60
      ? `${(totalMins / 60).toFixed(1).replace(/\.0$/, "")} Hours (${modules.length} Modules)`
      : `${totalMins} Mins (${modules.length} Modules)`);

  // Enable modular view automatically when Rise rich modules were extracted, otherwise open Interactive Workshop first
  const hasRichModules = Boolean(riseParsed && riseParsed.modules.length > 0);

  return [
    {
      learndashSourceId: `PKG-${manifestId}`,
      title,
      slug: toSlug(title),
      category: lom.keywords[0] || "Interactive Workshop",
      duration: computedDuration,
      shortDescription,
      description,
      targetAudience: "African women founders, SME executives, and cohort participants.",
      learningObjectives,
      isFree: false,
      priceZar: 1850,
      priceUsd: 105,
      authorName: lom.authorName || "AWIEF Faculty",
      authorRole: lom.authorRole || "Interactive Course Author",
      authorEmail: "",
      thumbnailUrl: "/images/investment-readiness.png",
      scormPath,
      isNative: hasRichModules || !scormPath,
      modules,
      quizzes,
      warnings,
      sourceFormat: "SCORM_PACKAGE",
    },
  ];
}

/**
 * Generates an AWIEF-branded sample SCORM 2004 `imsmanifest.xml` for immediate demonstration.
 *
 * @returns {string} Sample SCORM manifest XML string.
 */
export function getSampleScormManifestXml(): string {
  return `<?xml version="1.0" standalone="no" ?>
<manifest identifier="AWIEF-SCORM-2026-ESG" version="1.3"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 4th Edition</schemaversion>
    <lom>
      <general>
        <title><string language="en">ESG Compliance &amp; Sustainable Supply Chains for Exporters</string></title>
        <description><string language="en">An interactive workshop guiding African women-led exporters through EU Green Deal, fair labor traceability, and ESG lender due diligence across agricultural and manufacturing value chains.</string></description>
        <keyword><string language="en">Export &amp; Trade</string></keyword>
      </general>
      <lifeCycle>
        <contribute>
          <entity><![CDATA[BEGIN:VCARD\nFN:Dr. Amina Bello\nORG:AWIEF Trade Advisory Lead\nEND:VCARD]]></entity>
        </contribute>
      </lifeCycle>
      <educational>
        <typicalLearningTime><duration>PT2H15M0S</duration></typicalLearningTime>
      </educational>
    </lom>
  </metadata>
  <organizations default="AWIEF_ESG">
    <organization identifier="AWIEF_ESG">
      <title>ESG Compliance &amp; Sustainable Supply Chains for Exporters</title>
      <item identifier="mod_1" identifierref="res_1">
        <title>Module 1: Global ESG Standards &amp; Buyer Audits</title>
        <item identifier="topic_1_1"><title>Scope 1-3 Traceability Requirements</title></item>
        <item identifier="topic_1_2"><title>Fair Trade &amp; Labor Documentation</title></item>
      </item>
      <item identifier="mod_2" identifierref="res_1">
        <title>Module 2: Green Trade Finance &amp; DFI Verification</title>
        <item identifier="topic_2_1"><title>Structuring Climate-Linked Export Credit</title></item>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res_1" type="webcontent" adlcp:scormType="sco" href="scormdriver/indexAPI.html" />
  </resources>
</manifest>`;
}
