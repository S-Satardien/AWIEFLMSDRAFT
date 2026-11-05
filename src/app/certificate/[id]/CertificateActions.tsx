"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Certificate Action Header Bar providing quick access to:
 * - Back to My Academy courses
 * - Copy public verification URL
 * - Open public verification portal
 * - Trigger browser print / PDF export
 *
 * @param {object} props - Component properties.
 * @returns {JSX.Element} The rendered actions toolbar.
 */
export default function CertificateActions({
  certificateNumber,
  courseId,
}: {
  certificateNumber: string;
  courseId: string;
}) {
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/verify/${certificateNumber}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-5xl w-full flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 no-print">
      <Link
        href="/dashboard/courses"
        className="text-xs font-bold text-gray-700 hover:text-[#7F3D59] transition-colors inline-flex items-center gap-1.5"
      >
        <span>← Back to My Academy Courses</span>
      </Link>

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          onClick={handleCopyLink}
          className="px-3.5 py-2 bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold transition-all shadow-sm inline-flex items-center gap-1.5"
        >
          <span>{copied ? "✓ Verification Link Copied" : "🔗 Copy Verification Link"}</span>
        </button>

        <Link
          href={`/verify/${certificateNumber}`}
          target="_blank"
          className="px-3.5 py-2 bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold transition-all shadow-sm inline-flex items-center gap-1.5"
        >
          <span>🛡 Verify in Public Registry</span>
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </Link>

        <button
          onClick={handlePrint}
          className="px-5 py-2 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-xs font-bold transition-all shadow-md inline-flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <span>Print or Save to PDF</span>
        </button>
      </div>
    </div>
  );
}
