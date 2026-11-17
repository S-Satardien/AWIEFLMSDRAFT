const test = require("node:test");
const assert = require("node:assert/strict");
const zlib = require("node:zlib");
const { createJiti } = require("jiti");
const jiti = createJiti(__filename);
const {
  parseLearnDashWxrXml,
  parseLearnDashJson,
  parseLearnDashZip,
  getSampleLearnDashXml,
} = jiti("./learndashImporter.ts");

function buildTestZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, "utf8");
    const rawBuf = Buffer.from(entry.content, "utf8");
    const method = entry.deflate ? 8 : 0;
    const compBuf = entry.deflate ? zlib.deflateRawSync(rawBuf) : rawBuf;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(0, 14);
    localHeader.writeUInt32LE(compBuf.length, 18);
    localHeader.writeUInt32LE(rawBuf.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, compBuf);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(0, 16);
    centralHeader.writeUInt32LE(compBuf.length, 20);
    centralHeader.writeUInt32LE(rawBuf.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + compBuf.length;
  }

  const centralDirBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirBuf, eocd]);
}

test("parses sample LearnDash WXR XML with lessons, topics, videos, resources, and quizzes", () => {
  const xml = getSampleLearnDashXml();
  const courses = parseLearnDashWxrXml(xml);

  assert.equal(courses.length, 1);
  const c = courses[0];
  assert.equal(c.learndashSourceId, "LD-4021");
  assert.equal(c.title, "Venture Debt & Blended Finance for African Growth SMEs");
  assert.equal(c.category, "Investment Readiness");
  assert.equal(c.isFree, false);
  assert.equal(c.priceUsd, 120);
  assert.equal(c.modules.length, 2);
  assert.equal(c.modules[0].topics?.length, 1);
  assert.equal(c.modules[0].topics?.[0].title, "Calculating Debt Service Coverage Ratio (DSCR)");
  assert.match(c.modules[0].videoUrl || "", /\.mp4$/);
  assert.equal(c.modules[0].templateName, "Venture Debt Facility Comparison Matrix (.xlsx)");
  assert.equal(c.modules[0].attachedQuizIndex, 0);
  assert.equal(c.quizzes.length, 1);
  assert.equal(c.quizzes[0].questions.length, 2);
  assert.equal(c.quizzes[0].questions[0].answers[0].isCorrect, true);
});

test("parses wpProQuiz XML blocks and YouTube/Vimeo Gutenberg embeds", () => {
  const xml = `
    <rss><channel>
      <item>
        <title>Export Logistics Bootcamp</title>
        <wp:post_id>901</wp:post_id>
        <wp:post_type>sfwd-courses</wp:post_type>
        <content:encoded><![CDATA[<p>Practical cross-border shipping guide.</p>]]></content:encoded>
      </item>
      <item>
        <title>Incoterms 2026 Explained</title>
        <wp:post_id>902</wp:post_id>
        <wp:menu_order>1</wp:menu_order>
        <wp:post_type>sfwd-lessons</wp:post_type>
        <wp:postmeta><wp:meta_key>course_id</wp:meta_key><wp:meta_value>901</wp:meta_value></wp:postmeta>
        <content:encoded><![CDATA[
          <!-- wp:embed {"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"} -->
          <p>Understand CIF vs FOB.</p>
        ]]></content:encoded>
      </item>
      <wpProQuiz>
        <data><quiz>
          <title><![CDATA[Incoterms Mastery Check]]></title>
          <questions>
            <question>
              <title><![CDATA[Q1]]></title>
              <questionText><![CDATA[Which Incoterm includes freight and insurance to destination port?]]></questionText>
              <answers>
                <answer correct="true"><answerText><![CDATA[CIF]]></answerText></answer>
                <answer correct="false"><answerText><![CDATA[EXW]]></answerText></answer>
              </answers>
            </question>
          </questions>
        </quiz></data>
      </wpProQuiz>
    </channel></rss>
  `;

  const courses = parseLearnDashWxrXml(xml);
  assert.equal(courses.length, 1);
  assert.equal(courses[0].isFree, true);
  assert.equal(courses[0].modules[0].videoUrl, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert.equal(courses[0].quizzes.length, 1);
  assert.equal(courses[0].quizzes[0].name, "Incoterms Mastery Check");
  assert.equal(courses[0].quizzes[0].questions[0].answers[0].text, "CIF");
});

test("parses LearnDash JSON export and AWIEF JSON export formats", () => {
  const ldJson = JSON.stringify({
    course: { id: 77, title: "AgriTech Export Scaling", price: 50 },
    lessons: [
      { id: 10, title: "Cold Chain Standards", summary: "Keep produce fresh." },
    ],
    topics: [{ id: 100, lesson_id: 10, title: "Temperature Telemetry" }],
    quizzes: [
      {
        id: 500,
        lesson_id: 10,
        title: "Cold Chain Quiz",
        questions: [
          {
            question: "Optimal cold-chain monitoring interval?",
            answers: [
              { text: "Continuous telemetry", isCorrect: true },
              { text: "Monthly manual check", isCorrect: false },
            ],
          },
        ],
      },
    ],
  });

  const parsed = parseLearnDashJson(ldJson);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].learndashSourceId, "LD-77");
  assert.equal(parsed[0].modules[0].topics?.length, 1);
  assert.equal(parsed[0].modules[0].attachedQuizIndex, 0);
  assert.equal(parsed[0].quizzes[0].questions.length, 1);
});

test("parses deflated ZIP bundle containing LearnDash XML and split JSON", () => {
  const xmlZip = buildTestZip([
    { name: "__MACOSX/._ignore.xml", content: "garbage", deflate: false },
    { name: "learndash-export.xml", content: getSampleLearnDashXml(), deflate: true },
  ]);
  const fromXmlZip = parseLearnDashZip(xmlZip);
  assert.equal(fromXmlZip.length, 1);
  assert.equal(fromXmlZip[0].sourceFormat, "LEARNDASH_ZIP");
  assert.equal(fromXmlZip[0].modules.length, 2);

  const splitJsonZip = buildTestZip([
    { name: "courses.json", content: JSON.stringify([{ id: 33, title: "Split Bundle Course" }]), deflate: true },
    { name: "lessons.json", content: JSON.stringify([{ id: 34, title: "Lesson One", summary: "Body" }]), deflate: false },
  ]);
  const fromSplitZip = parseLearnDashZip(splitJsonZip);
  assert.equal(fromSplitZip.length, 1);
  assert.equal(fromSplitZip[0].title, "Split Bundle Course");
  assert.equal(fromSplitZip[0].modules[0].title, "Lesson One");
});

test("rejects empty or invalid LearnDash exports cleanly", () => {
  assert.throws(() => parseLearnDashWxrXml("<rss><channel></channel></rss>"), /No LearnDash course items/);
  assert.throws(() => parseLearnDashJson("{}"), /Unrecognized JSON structure/);
  assert.throws(() => parseLearnDashZip(Buffer.from("not a zip")), /Invalid ZIP archive/);
});

test("supports multi-course ld_course_steps, non-www YouTube URLs, and root JSON arrays", () => {
  const xml = `
    <rss><channel>
      <item>
        <title>Course Alpha</title>
        <wp:post_id>101</wp:post_id>
        <wp:post_type>sfwd-courses</wp:post_type>
        <wp:postmeta>
          <wp:meta_key>ld_course_steps</wp:meta_key>
          <wp:meta_value><![CDATA[a:1:{s:12:"sfwd-lessons";a:1:{i:201;a:0:{}}}]]></wp:meta_value>
        </wp:postmeta>
      </item>
      <item>
        <title>Course Beta</title>
        <wp:post_id>102</wp:post_id>
        <wp:post_type>sfwd-courses</wp:post_type>
        <wp:postmeta>
          <wp:meta_key>ld_course_steps</wp:meta_key>
          <wp:meta_value><![CDATA[a:1:{s:12:"sfwd-lessons";a:1:{i:202;a:0:{}}}]]></wp:meta_value>
        </wp:postmeta>
      </item>
      <item>
        <title>Alpha Lesson</title>
        <wp:post_id>201</wp:post_id>
        <wp:post_type>sfwd-lessons</wp:post_type>
        <content:encoded><![CDATA[
          <!-- wp:video -->
          <!-- /wp:video -->
          <!-- wp:image {"src":"https://example.com/not-a-video.png"} -->
          <p>Watch https://youtube.com/watch?v=xyz12345 for details.</p>
        ]]></content:encoded>
      </item>
      <item>
        <title>Beta Lesson</title>
        <wp:post_id>202</wp:post_id>
        <wp:post_type>sfwd-lessons</wp:post_type>
        <content:encoded><![CDATA[<p>See https://youtu.be/beta998877</p>]]></content:encoded>
      </item>
    </channel></rss>
  `;

  const parsed = parseLearnDashWxrXml(xml);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].modules.length, 1);
  assert.equal(parsed[0].modules[0].title, "Module 1: Alpha Lesson");
  assert.equal(parsed[0].modules[0].videoUrl, "https://youtube.com/watch?v=xyz12345");
  assert.equal(parsed[1].modules.length, 1);
  assert.equal(parsed[1].modules[0].title, "Module 1: Beta Lesson");
  assert.equal(parsed[1].modules[0].videoUrl, "https://youtu.be/beta998877");

  const rootArr = parseLearnDashJson(
    JSON.stringify([{ title: "Root Array Course", isFree: true, modules: [{ title: "Mod A" }] }])
  );
  assert.equal(rootArr.length, 1);
  assert.equal(rootArr[0].title, "Root Array Course");
  assert.equal(rootArr[0].modules[0].title, "Mod A");
});

