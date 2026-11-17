import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import path from "path";
import { extractZipEntries } from "@/lib/zipUtils";
import {
  parseLearnDashJson,
  parseLearnDashWxrXml,
  parseLearnDashZip,
  type ParsedLearnDashCourse,
} from "@/lib/learndashImporter";
import { isScormManifestXml, parseScormPackageBuffer } from "@/lib/scormImporter";

const MAX_PACKAGE_BYTES = 80 * 1024 * 1024; // 80 MB

/**
 * Unified server endpoint for parsing and extracting uploaded LearnDash exports
 * (`.xml`, `.json`, `.zip`) and SCORM 1.2 / 2004 packages (`.zip`, `imsmanifest.xml`).
 * Accepts native `multipart/form-data` to support large `.zip` packages without Server Action base64 limits.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "No course package file provided." }, { status: 400 });
    }

    if (file.size > MAX_PACKAGE_BYTES) {
      return NextResponse.json(
        { success: false, error: "Package archive exceeds the 80 MB upload limit." },
        { status: 400 }
      );
    }

    const fileName = file.name || "course-package.zip";
    const lowerName = fileName.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let courses: ParsedLearnDashCourse[] = [];

    if (lowerName.endsWith(".zip") || (buffer.length >= 4 && buffer.readUInt32LE(0) === 0x04034b50)) {
      // Peek entries to detect whether this ZIP is a SCORM/TinCan bundle or a LearnDash export ZIP
      const zipEntries = extractZipEntries(buffer, {
        filter: (name) => /imsmanifest\.xml$|tincan\.xml$/i.test(name),
      });

      if (zipEntries.length > 0) {
        const pkgId = `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const extractDir = path.join(process.cwd(), "public", "uploads", "scorm", pkgId);
        const publicBaseUrl = `/api/uploads/scorm/${pkgId}`;
        courses = parseScormPackageBuffer(buffer, {
          extractDir,
          publicBaseUrl,
          fileName,
        });
      } else {
        courses = parseLearnDashZip(buffer);
      }
    } else if (lowerName.endsWith(".json")) {
      courses = parseLearnDashJson(buffer.toString("utf8"));
    } else {
      const textContent = buffer.toString("utf8");
      if (isScormManifestXml(textContent)) {
        courses = parseScormPackageBuffer(buffer, { fileName });
      } else if (lowerName.endsWith(".xml") || textContent.trim().startsWith("<")) {
        courses = parseLearnDashWxrXml(textContent);
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "Unsupported file format. Upload a SCORM (.zip / imsmanifest.xml) or LearnDash (.xml / .json / .zip) file.",
          },
          { status: 400 }
        );
      }
    }

    if (!courses || courses.length === 0) {
      return NextResponse.json(
        { success: false, error: "No recognizable courses were found inside the uploaded package." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, courses });
  } catch (err: unknown) {
    console.error("Course package import error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to parse the uploaded course package.",
      },
      { status: 500 }
    );
  }
}
