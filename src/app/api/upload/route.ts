import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  video: [".mp4", ".webm", ".mov", ".m4v", ".ogg", ".mp3", ".wav", ".m4a"],
  document: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".csv", ".txt", ".rtf", ".zip"],
  image: [".png", ".jpg", ".jpeg", ".webp", ".gif"],
  package: [".zip", ".xml", ".json"],
};

const MAX_BYTES: Record<string, number> = {
  video: 150 * 1024 * 1024, // 150 MB
  document: 50 * 1024 * 1024, // 50 MB
  image: 10 * 1024 * 1024, // 10 MB
  package: 80 * 1024 * 1024, // 80 MB
};

/**
 * Handles authenticated file uploads for curriculum videos, toolkit documents,
 * cover images, and course archives. Saves files safely into `public/uploads/<kind>/`
 * and returns a clean `/api/uploads/<kind>/<filename>` playback/download URL.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !role || !["ADMIN", "REVIEWER"].includes(role)) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const rawKind = String(formData.get("kind") || "document").toLowerCase();
    const kind = rawKind in ALLOWED_EXTENSIONS ? rawKind : "document";

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "No file provided." }, { status: 400 });
    }

    const originalName = path.basename(file.name || "upload");
    const ext = path.extname(originalName).toLowerCase();
    if (!ALLOWED_EXTENSIONS[kind].includes(ext)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported ${kind} file type (${ext || "unknown"}). Allowed: ${ALLOWED_EXTENSIONS[kind].join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES[kind]) {
      const mbLimit = Math.round(MAX_BYTES[kind] / (1024 * 1024));
      return NextResponse.json(
        { success: false, error: `File exceeds the ${mbLimit} MB ${kind} upload limit.` },
        { status: 400 }
      );
    }

    const baseStem = originalName
      .slice(0, Math.max(1, originalName.length - ext.length))
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || kind;

    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const safeFileName = `${baseStem}-${uniqueSuffix}${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", kind);
    await fs.mkdir(uploadDir, { recursive: true });

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    await fs.writeFile(path.join(uploadDir, safeFileName), fileBuffer);

    return NextResponse.json({
      success: true,
      url: `/api/uploads/${kind}/${safeFileName}`,
      fileName: originalName,
      size: fileBuffer.length,
      mimeType: file.type || undefined,
    });
  } catch (err: unknown) {
    console.error("File upload error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Upload failed." },
      { status: 500 }
    );
  }
}
