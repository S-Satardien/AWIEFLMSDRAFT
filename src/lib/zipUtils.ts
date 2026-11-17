import zlib from "zlib";

export interface ExtractedZipEntry {
  /** Normalized POSIX path inside the archive (using forward slashes, no leading slash). */
  name: string;
  /** Uncompressed raw bytes of the file entry. */
  data: Buffer;
}

/**
 * Normalizes and validates a relative path inside a ZIP archive to prevent directory traversal.
 *
 * @param {string} rawPath - Raw entry path stored in the ZIP header.
 * @returns {string | null} Safe relative POSIX path or null for directory/unsafe entries.
 */
export function sanitizeZipEntryPath(rawPath: string): string | null {
  if (!rawPath || rawPath.includes("\0")) return null;
  const normalized = rawPath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.endsWith("/")) return null;
  if (normalized.startsWith("__MACOSX/")) return null;

  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 0 || segments.some((seg) => seg === "." || seg === "..")) {
    return null;
  }
  return segments.join("/");
}

/**
 * Extracts all Stored (method 0) and Deflated (method 8) file entries from a ZIP Buffer
 * using Node's built-in `zlib`, with zero external dependencies.
 *
 * @param {Buffer} zipBuffer - Raw bytes of the `.zip` archive.
 * @param {object} [options] - Optional filtering and entry size limits.
 * @param {(name: string) => boolean} [options.filter] - Optional predicate to skip unneeded entries before inflating.
 * @param {number} [options.maxTotalBytes] - Safety cap on total uncompressed bytes (defaults to 250 MB).
 * @returns {ExtractedZipEntry[]} Array of extracted file entries.
 */
export function extractZipEntries(
  zipBuffer: Buffer,
  options?: {
    filter?: (normalizedName: string) => boolean;
    maxTotalBytes?: number;
    maxEntries?: number;
  }
): ExtractedZipEntry[] {
  const maxTotalBytes = options?.maxTotalBytes ?? 250 * 1024 * 1024;
  const maxEntries = options?.maxEntries ?? 5000;
  const entries: ExtractedZipEntry[] = [];
  let runningBytes = 0;

  // Locate End of Central Directory signature (0x06054b50)
  let eocdOffset = -1;
  for (let i = zipBuffer.length - 22; i >= Math.max(0, zipBuffer.length - 65557); i--) {
    if (zipBuffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error("Invalid ZIP archive: End of Central Directory record not found.");
  }

  const totalEntries = zipBuffer.readUInt16LE(eocdOffset + 10);
  if (totalEntries > maxEntries) {
    throw new Error("Archive exceeds maximum permitted entry count.");
  }
  let cdOffset = zipBuffer.readUInt32LE(eocdOffset + 16);

  for (let idx = 0; idx < totalEntries; idx++) {
    if (cdOffset + 46 > zipBuffer.length || zipBuffer.readUInt32LE(cdOffset) !== 0x02014b50) {
      break;
    }
    const compressionMethod = zipBuffer.readUInt16LE(cdOffset + 10);
    const compressedSize = zipBuffer.readUInt32LE(cdOffset + 20);
    const fileNameLen = zipBuffer.readUInt16LE(cdOffset + 28);
    const extraLen = zipBuffer.readUInt16LE(cdOffset + 30);
    const commentLen = zipBuffer.readUInt16LE(cdOffset + 32);
    const localHeaderOffset = zipBuffer.readUInt32LE(cdOffset + 42);

    const rawName = zipBuffer.subarray(cdOffset + 46, cdOffset + 46 + fileNameLen).toString("utf8");
    cdOffset += 46 + fileNameLen + extraLen + commentLen;

    const safeName = sanitizeZipEntryPath(rawName);
    if (!safeName) continue;
    if (options?.filter && !options.filter(safeName)) continue;

    if (localHeaderOffset + 30 > zipBuffer.length || zipBuffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      continue;
    }

    const localFileNameLen = zipBuffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = zipBuffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localFileNameLen + localExtraLen;
    if (dataStart + compressedSize > zipBuffer.length) {
      continue;
    }

    const compressedSlice = zipBuffer.subarray(dataStart, dataStart + compressedSize);
    try {
      let rawData: Buffer;
      if (compressionMethod === 0) {
        rawData = Buffer.from(compressedSlice);
      } else if (compressionMethod === 8) {
        rawData = zlib.inflateRawSync(compressedSlice);
      } else {
        continue;
      }
      runningBytes += rawData.length;
      if (runningBytes > maxTotalBytes) {
        throw new Error("Archive exceeds maximum uncompressed size limit.");
      }
      entries.push({ name: safeName, data: rawData });
    } catch (err) {
      if (err instanceof Error && err.message.includes("maximum uncompressed size")) {
        throw err;
      }
      // skip corrupt compressed entry
    }
  }

  return entries;
}
