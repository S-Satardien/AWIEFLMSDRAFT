const test = require("node:test");
const assert = require("node:assert/strict");
const zlib = require("node:zlib");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createJiti } = require("jiti");
const jiti = createJiti(__filename);

const {
  isScormManifestXml,
  parseIso8601Duration,
  parseScormPackageBuffer,
  getSampleScormManifestXml,
} = jiti("./scormImporter.ts");

function buildZipBuffer(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, "utf8");
    const rawBuf = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, "utf8");
    const compBuf = entry.deflate ? zlib.deflateRawSync(rawBuf) : rawBuf;
    const method = entry.deflate ? 8 : 0;

    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(0x04034b50, 0);
    lfh.writeUInt16LE(20, 4);
    lfh.writeUInt16LE(method, 8);
    lfh.writeUInt32LE(compBuf.length, 18);
    lfh.writeUInt32LE(rawBuf.length, 22);
    lfh.writeUInt16LE(nameBuf.length, 26);

    localParts.push(lfh, nameBuf, compBuf);

    const cdh = Buffer.alloc(46);
    cdh.writeUInt32LE(0x02014b50, 0);
    cdh.writeUInt16LE(20, 4);
    cdh.writeUInt16LE(20, 6);
    cdh.writeUInt16LE(method, 10);
    cdh.writeUInt32LE(compBuf.length, 20);
    cdh.writeUInt32LE(rawBuf.length, 24);
    cdh.writeUInt16LE(nameBuf.length, 28);
    cdh.writeUInt32LE(offset, 42);
    centralParts.push(cdh, nameBuf);

    offset += 30 + nameBuf.length + compBuf.length;
  }

  const cdBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);

  return Buffer.concat([...localParts, cdBuf, eocd]);
}

test("detects SCORM manifests and converts ISO 8601 durations", () => {
  const sample = getSampleScormManifestXml();
  assert.equal(isScormManifestXml(sample), true);
  assert.equal(isScormManifestXml("<rss><channel></channel></rss>"), false);
  assert.equal(parseIso8601Duration("PT2H15M0S"), "2 hrs 15 mins");
  assert.equal(parseIso8601Duration("PT45M"), "45 mins");
  assert.equal(parseIso8601Duration("PT0H0M0S"), "");
});

test("parses standalone sample SCORM manifest and populates all fields", () => {
  const sampleXml = getSampleScormManifestXml();
  const [course] = parseScormPackageBuffer(Buffer.from(sampleXml, "utf8"), {
    fileName: "esg-imsmanifest.xml",
  });

  assert.equal(course.sourceFormat, "SCORM_PACKAGE");
  assert.equal(course.title, "ESG Compliance & Sustainable Supply Chains for Exporters");
  assert.equal(course.category, "Export & Trade");
  assert.equal(course.authorName, "Dr. Amina Bello");
  assert.equal(course.authorRole, "AWIEF Trade Advisory Lead");
  assert.equal(course.duration, "2 hrs 15 mins");
  assert.equal(course.modules.length, 2);
  assert.equal(course.modules[0].topics.length, 2);
  assert.equal(course.modules[0].topics[0].title, "Scope 1-3 Traceability Requirements");
});

test("extracts SCORM .zip package, parses Rise runtime-data.js, and skips traversal paths", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "awief-scorm-test-"));
  try {
    const manifest = `<?xml version="1.0"?>
<manifest identifier="RISE-TEST-01" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3">
  <metadata><schema>ADL SCORM</schema><schemaversion>2004 4th Edition</schemaversion></metadata>
  <organizations default="ORG1">
    <organization identifier="ORG1">
      <title>Cross-Border Export Workshop</title>
      <item identifier="i1" identifierref="r1"><title>Cross-Border Export Workshop</title></item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="r1" type="webcontent" adlcp:scormType="sco" href="scormdriver/indexAPI.html" />
  </resources>
</manifest>`;

    const risePayload = {
      course: {
        description: "<p>Master African export documentation.</p><ul><li>Navigate AfCFTA rules of origin</li></ul>",
        lessons: [
          { id: "sec1", type: "section", title: "Export Fundamentals" },
          {
            id: "les1",
            type: "blocks",
            title: "Certificates of Origin",
            items: [
              {
                family: "text",
                items: [
                  {
                    heading: "Core Rule",
                    paragraph: "<p>Verify local value-addition thresholds for duty-free AfCFTA transit.</p><ul><li>Prepare commercial invoice &amp; packing list</li></ul>",
                  },
                ],
              },
              {
                family: "multimedia",
                items: [
                  {
                    media: {
                      embed: { originalUrl: "https://youtu.be/dQw4w9WgXcQ" },
                    },
                  },
                ],
              },
            ],
          },
          {
            id: "quiz1",
            type: "quiz",
            title: "Export Readiness Quiz",
            description: "Check your export documentation fluency.",
            questions: [
              {
                title: "Which document certifies qualifying AfCFTA product origin?",
                answers: [
                  { title: "AfCFTA Certificate of Origin", correct: true },
                  { title: "Tourist Visa Stamp", correct: false },
                ],
              },
            ],
          },
        ],
      },
    };

    const riseBase64 = Buffer.from(JSON.stringify(risePayload), "utf8").toString("base64");
    const riseJs = `__jsonp("runtime-data.js","${riseBase64}")`;

    const zipBuf = buildZipBuffer([
      { name: "wrapped-course/imsmanifest.xml", data: manifest, deflate: true },
      { name: "wrapped-course/scormdriver/indexAPI.html", data: "<html><body>SCORM OK</body></html>", deflate: true },
      { name: "wrapped-course/scormcontent/runtime-data.js", data: riseJs, deflate: true },
      { name: "../../outside-traversal.txt", data: "blocked", deflate: false },
    ]);

    const [course] = parseScormPackageBuffer(zipBuf, {
      extractDir: tmpDir,
      publicBaseUrl: "/api/uploads/scorm/pkg-test",
      fileName: "export-workshop.zip",
    });

    assert.equal(course.title, "Cross-Border Export Workshop");
    assert.equal(course.scormPath, "/api/uploads/scorm/pkg-test/scormdriver/indexAPI.html");
    assert.equal(course.isNative, true);
    assert.ok(course.description.includes("Master African export documentation."));
    assert.ok(course.learningObjectives.includes("Navigate AfCFTA rules of origin"));
    assert.equal(course.modules.length, 2);
    assert.equal(course.modules[0].videoUrl, "https://youtu.be/dQw4w9WgXcQ");
    assert.ok(course.modules[0].keyTakeaways.includes("Prepare commercial invoice & packing list"));
    assert.equal(course.quizzes.length, 1);
    assert.equal(course.quizzes[0].questions[0].answers[0].isCorrect, true);

    assert.equal(fs.existsSync(path.join(tmpDir, "scormdriver", "indexAPI.html")), true);
    assert.equal(fs.existsSync(path.join(path.dirname(tmpDir), "outside-traversal.txt")), false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
