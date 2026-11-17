"use client";

import Link from "next/link";
import { Award, ShieldCheck, ArrowRight, ExternalLink } from "@/components/Icons";

/**
 * Global application footer presenting AWIEF organizational identity,
 * UN ECOSOC Consultative Status, headquarters contact details in Cape Town,
 * and data privacy compliance disclosures for African and global partners.
 *
 * @returns {JSX.Element} The rendered footer component.
 */
export default function Footer() {
  return (
    <footer className="bg-[#1D0B14] text-white pt-16 pb-12 border-t-4 border-[#D4AF37] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          
          {/* Col 1: About AWIEF */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src="/images/awief-logo.jpg" 
                alt="AWIEF - Africa Women Innovation & Entrepreneurship Forum" 
                className="h-12 w-auto object-contain bg-white rounded p-1" 
              />
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              <strong>Africa Women Innovation and Entrepreneurship Forum (AWIEF)</strong> is a Pan-African women economic empowerment organisation driving entrepreneurship, innovation, and trade across 54 nations.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#7F3D59]/50 text-[#D4AF37] border border-[#D4AF37]/30">
                <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
                UN ECOSOC Special Consultative Status
              </span>
            </div>
          </div>

          {/* Col 2: Masterclasses & Programs */}
          <div>
            <h4 className="text-base font-bold text-white mb-4 border-b border-[#7F3D59] pb-2 font-serif">
              Masterclasses & Academy
            </h4>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li>
                <Link href="/courses/investment-readiness" className="hover:text-[#D4AF37] transition-colors">
                  Investment Readiness & Capital Raising
                </Link>
              </li>
              <li>
                <Link href="/courses/afcfta-export-readiness" className="hover:text-[#D4AF37] transition-colors">
                  AfCFTA Cross-Border Trade
                </Link>
              </li>
              <li>
                <Link href="/courses/financial-management" className="hover:text-[#D4AF37] transition-colors">
                  Financial Management & Cashflow
                </Link>
              </li>
              <li>
                <Link href="/courses/pitch-n-grow" className="hover:text-[#D4AF37] transition-colors">
                  Pitch &apos;n Grow & AI Marketing
                </Link>
              </li>
              <li>
                <Link href="/catalog" className="hover:text-[#D4AF37] transition-colors inline-flex items-center gap-1.5">
                  <span>Full Masterclass Catalogue</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Four Pillars & Ecosystem */}
          <div>
            <h4 className="text-base font-bold text-white mb-4 border-b border-[#7F3D59] pb-2 font-serif">
              AWIEF Four Pillars
            </h4>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li>
                <span className="text-[#D4AF37] font-semibold">1. BUILD:</span> Enterprise Growth & Capacity
              </li>
              <li>
                <span className="text-[#D4AF37] font-semibold">2. CONNECT:</span> Annual AWIEF Conference
              </li>
              <li>
                <span className="text-[#D4AF37] font-semibold">3. RECOGNISE:</span> AWIEF Awards
              </li>
              <li>
                <span className="text-[#D4AF37] font-semibold">4. IMPACT:</span> Policy & AfCFTA Advocacy
              </li>
              <li className="pt-2">
                <Link href="/verify/CERT-AWIEF-2026-INV-DEMO1" className="text-xs text-gray-400 hover:text-[#D4AF37] transition-colors flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Verifiable Credential Verification Portal</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Secretariat & Contact */}
          <div>
            <h4 className="text-base font-bold text-white mb-4 border-b border-[#7F3D59] pb-2 font-serif">
              Pan-African Secretariat
            </h4>
            <div className="text-sm text-gray-300 space-y-2">
              <p className="font-semibold text-white">AWIEF Head Office</p>
              <p>16 Bell Crescent, Westlake Business Park</p>
              <p>Tokai 7945, Cape Town, South Africa</p>
              <p className="pt-2 text-xs text-gray-300">
                Email: <a href="mailto:info@awieforum.org" className="text-[#D4AF37] hover:underline">info@awieforum.org</a>
              </p>
              <p className="text-xs text-gray-300">
                Phone: <span className="text-gray-200">+27 21 002 8264</span>
              </p>
              <p className="text-[11px] text-gray-400 pt-1">
                Data Privacy: POPIA (ZA), NDPA (NG), Kenya DPA &amp; GDPR compliant. Payments processed under PCI-DSS Level 1.
              </p>
            </div>
          </div>

        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-400 gap-4">
          <p>© {new Date().getFullYear()} Africa Women Innovation &amp; Entrepreneurship Forum (AWIEF NPC). All rights reserved.</p>
          <div className="flex flex-wrap gap-4 sm:space-x-6">
            <Link href="/login" className="hover:text-white transition-colors">Academy Portal</Link>
            <Link href="/catalog" className="hover:text-white transition-colors">Courses</Link>
            <Link href="/register" className="hover:text-white transition-colors">Join Cohort</Link>
            <a href="https://www.awieforum.org" target="_blank" rel="noopener noreferrer" className="hover:text-[#D4AF37] transition-colors inline-flex items-center gap-1">
              <span>AWIEF Official Site</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
