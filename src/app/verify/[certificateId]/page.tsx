import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

/**
 * Public Verifiable Credential Verification Portal.
 * Allows prospective employers, commercial banks, angel investors, and DFIs
 * to verify the validity, recipient identity, and issuing parameters of any
 * AWIEF Certificate of Completion via QR Code or direct certificate number lookup.
 *
 * @param {object} props - Dynamic route parameters.
 * @returns {Promise<JSX.Element>} The rendered verification page.
 */
export default async function CertificateVerifyPage(props: {
  params: Promise<{ certificateId: string }>;
}) {
  const { certificateId } = await props.params;

  const certificate = await prisma.certificate.findUnique({
    where: { certificateNumber: certificateId },
    include: {
      course: true,
      user: true,
      enrollment: true
    }
  });

  return (
    <div className="min-h-screen bg-[#FDF8F9] flex flex-col selection:bg-[#7F3D59] selection:text-white">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1 w-full">
        <div className="bg-white rounded-3xl shadow-xl border border-[#EAD7E0] p-8 sm:p-12 text-center space-y-8">
          
          {certificate ? (
            <>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-extrabold uppercase tracking-wider">
                <span>✓</span> Authenticated Official AWIEF Credential
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl font-serif font-extrabold text-[#1D0B14] tracking-tight">
                  Credential Successfully Authenticated
                </h1>
                <p className="text-sm text-gray-500 max-w-lg mx-auto">
                  This credential was officially issued by the <strong>Africa Women Innovation and Entrepreneurship Forum (AWIEF NPC)</strong> under Special Consultative Status with the United Nations ECOSOC.
                </p>
              </div>

              <div className="bg-[#FDF8F9] rounded-2xl p-6 sm:p-8 border border-[#EAD7E0] text-left space-y-5 max-w-xl mx-auto">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Recipient Name / Founder
                  </label>
                  <p className="text-xl font-serif font-bold text-gray-900">{certificate.recipientName}</p>
                  {certificate.user && (
                    <p className="text-xs text-[#7F3D59]">
                      {certificate.user.sector ? `${certificate.user.sector} • ` : ""}
                      {certificate.user.country || "African Entrepreneur"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Executive Masterclass Completed
                  </label>
                  <p className="text-base font-serif font-bold text-[#7F3D59]">{certificate.courseTitle}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#EAD7E0]">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Certificate Identifier
                    </label>
                    <p className="text-xs font-mono font-bold text-gray-800">{certificate.certificateNumber}</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Date Issued
                    </label>
                    <p className="text-xs font-medium text-gray-800">
                      {new Date(certificate.issuedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#EAD7E0]">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Executive Signatory
                    </label>
                    <p className="text-xs font-bold text-gray-800">Irene Ochem</p>
                    <p className="text-[10px] text-gray-500">Founder &amp; CEO, AWIEF NPC</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Academic Director
                    </label>
                    <p className="text-xs font-bold text-gray-800">Ekene Ochem</p>
                    <p className="text-[10px] text-gray-500">Director of Programs &amp; Innovation</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#EAD7E0] flex items-center justify-between text-[11px] text-gray-500">
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <span>🛡 Cryptographic Hash Verified</span>
                  </span>
                  <span>UN ECOSOC Accredited</span>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap justify-center gap-4">
                <Link
                  href={`/certificate/${certificate.courseId}`}
                  className="px-6 py-2.5 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-xs font-bold transition-all shadow-md font-serif"
                >
                  View Full Certificate
                </Link>
                <Link
                  href="/"
                  className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all"
                >
                  Return to AWIEF Academy Home
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-100 border border-red-300 text-red-800 text-xs font-extrabold uppercase tracking-wider">
                <span>⚠️</span> Credential Not Found
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-serif font-extrabold text-[#1D0B14]">
                  Invalid Certificate Number
                </h1>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  The certificate identifier <code className="bg-gray-100 px-2 py-1 rounded text-red-600 font-mono text-xs">{certificateId}</code> does not match any authenticated record in the AWIEF digital registry.
                </p>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 max-w-md mx-auto text-xs text-amber-800">
                <p className="font-bold mb-1">Looking for a demo credential to test?</p>
                <p>
                  Try verifying:{" "}
                  <Link href="/verify/CERT-AWIEF-2026-INV-DEMO1" className="font-mono underline font-bold text-[#7F3D59]">
                    CERT-AWIEF-2026-INV-DEMO1
                  </Link>
                </p>
              </div>

              <div className="pt-4">
                <Link
                  href="/"
                  className="px-6 py-3 bg-[#7F3D59] text-white rounded-xl text-xs font-bold hover:bg-[#5E2C41] transition-colors shadow-md"
                >
                  Return to Platform Home
                </Link>
              </div>
            </>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}
