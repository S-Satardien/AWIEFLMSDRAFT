import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".ogg": "video/ogg",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".csv": "text/csv; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".rtf": "application/rtf",
  ".zip": "application/zip",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
};

/**
 * Dynamically serves uploaded curriculum videos, toolkit documents, images,
 * and unpacked interactive SCORM course files from `public/uploads/`.
 * Supports HTTP Range requests (206 Partial Content) for smooth HTML5 video playback.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await context.params;
    if (!segments || segments.length === 0) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const kind = segments[0]?.toLowerCase() || "";
    if (kind !== "image") {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }
    }

    const uploadsRoot = path.resolve(process.cwd(), "public", "uploads");
    const targetPath = path.resolve(uploadsRoot, ...segments);

    // Prevent directory traversal outside public/uploads
    if (!targetPath.startsWith(uploadsRoot + path.sep)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const stat = await fsp.stat(targetPath).catch(() => null);
    if (!stat || !stat.isFile()) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    const ext = path.extname(targetPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const fileSize = stat.size;
    const downloadFlag = req.nextUrl.searchParams.get("download") === "1";
    const baseName = path.basename(targetPath).replace(/"/g, "");

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Accept-Ranges", "bytes");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set(
      "Cache-Control",
      kind === "image" ? "public, max-age=3600" : "private, no-store"
    );
    if (downloadFlag) {
      headers.set("Content-Disposition", `attachment; filename="${baseName}"`);
    }

    const rangeHeader = req.headers.get("range");
    if (rangeHeader && /^bytes=\d*-\d*$/i.test(rangeHeader)) {
      const [rawStart, rawEnd] = rangeHeader.replace(/bytes=/i, "").split("-");
      const start = rawStart ? parseInt(rawStart, 10) : 0;
      const end = rawEnd ? Math.min(parseInt(rawEnd, 10), fileSize - 1) : fileSize - 1;

      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= fileSize) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${fileSize}` },
        });
      }

      const chunkSize = end - start + 1;
      headers.set("Content-Range", `bytes ${start}-${end}/${fileSize}`);
      headers.set("Content-Length", String(chunkSize));

      const stream = fs.createReadStream(targetPath, { start, end });
      const webStream = new ReadableStream({
        start(controller) {
          stream.on("data", (chunk) => controller.enqueue(chunk));
          stream.on("end", () => controller.close());
          stream.on("error", (err) => controller.error(err));
        },
        cancel() {
          stream.destroy();
        },
      });

      return new NextResponse(webStream, { status: 206, headers });
    }

    headers.set("Content-Length", String(fileSize));
    const fileBuffer = await fsp.readFile(targetPath);
    return new NextResponse(fileBuffer, { status: 200, headers });
  } catch (err) {
    console.error("Error serving uploaded asset:", err);
    return NextResponse.json({ error: "Failed to read file." }, { status: 500 });
  }
}
