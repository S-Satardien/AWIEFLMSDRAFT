"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck } from "lucide-react";

export default function Navbar() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="w-full bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-3.5 group">
          <div className="h-12 w-12 rounded-xl bg-white border border-gray-200 p-1 flex items-center justify-center overflow-hidden shadow-xs">
            <img 
              src="/images/awief-logo.jpg" 
              alt="AWIEF Logo" 
              className="h-full w-auto object-contain transition-transform group-hover:scale-105" 
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline">
              <span className="text-2xl font-black text-awief-plum tracking-tight">AWIEF</span>
              <span className="text-xl font-bold text-awief-gold ml-1.5 border-l-2 border-gray-200 pl-1.5 uppercase tracking-wider">ACADEMY</span>
            </div>
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider -mt-0.5">
              Africa Women Innovation &amp; Entrepreneurship Forum
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-7 text-sm font-semibold text-gray-700">
          <Link href="/#about-awief" className="hover:text-awief-plum transition-colors">
            About AWIEF
          </Link>
          <Link href="/catalog" className="hover:text-awief-plum transition-colors">
            Course Catalogue
          </Link>
          <Link href="/#pillars" className="hover:text-awief-plum transition-colors">
            Four Pillars
          </Link>
          <Link href="/verify/CERT-AWIEF-2026-INV-DEMO1" className="hover:text-awief-plum transition-colors flex items-center gap-1.5 text-xs px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
            Verify Credential
          </Link>
        </nav>

        {/* Auth CTA Actions */}
        <div className="hidden md:flex items-center gap-4">
          {session ? (
            <div className="flex items-center gap-3">
              <Link 
                href="/dashboard/courses"
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-awief-berry text-sm font-bold rounded-xl transition-colors"
              >
                My Courses
              </Link>
              <Link 
                href={(session.user as any)?.role === 'ADMIN' ? "/admin" : "/dashboard"}
                className="px-4 py-2 bg-awief-plum hover:bg-awief-plum-dark text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
              >
                {(session.user as any)?.role === 'ADMIN' ? "Admin Portal" : "Dashboard"}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-xs font-semibold text-gray-500 hover:text-awief-plum transition-colors ml-1"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link 
                href="/login"
                className="text-sm font-bold text-gray-700 hover:text-awief-plum transition-colors px-3 py-2 flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                1-Click Demo Login
              </Link>
              <Link 
                href="/register"
                className="px-5 py-2.5 bg-awief-plum hover:bg-awief-plum-dark text-white text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                Join Academy
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md text-gray-600 hover:text-awief-plum hover:bg-gray-100 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-gray-200 px-4 pt-2 pb-6 space-y-3 shadow-xl"
          >
            <Link 
              href="/#about-awief" 
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-semibold text-gray-700 hover:text-awief-plum"
            >
              About AWIEF
            </Link>
            <Link 
              href="/catalog" 
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-semibold text-gray-700 hover:text-awief-plum"
            >
              Course Catalogue
            </Link>
            <Link 
              href="/#pillars" 
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-semibold text-gray-700 hover:text-awief-plum"
            >
              Four Pillars
            </Link>
            <Link 
              href="/verify/CERT-AWIEF-2026-INV-DEMO1" 
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-bold text-amber-700"
            >
              Verify Credential (Demo)
            </Link>
            <div className="pt-4 border-t border-gray-100 space-y-2">
              {session ? (
                <>
                  <Link 
                    href="/dashboard/courses"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center py-2.5 bg-gray-100 text-gray-900 font-bold rounded-xl"
                  >
                    My Courses
                  </Link>
                  <Link 
                    href={(session.user as any)?.role === 'ADMIN' ? "/admin" : "/dashboard"}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center py-2.5 bg-awief-plum text-white font-bold rounded-xl"
                  >
                    {(session.user as any)?.role === 'ADMIN' ? "Admin Portal" : "Dashboard"}
                  </Link>
                </>
              ) : (
                <>
                  <Link 
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center py-2.5 text-gray-800 font-bold border border-gray-300 rounded-xl"
                  >
                    1-Click Demo Login
                  </Link>
                  <Link 
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center py-2.5 bg-awief-plum text-white font-bold rounded-xl shadow-md"
                  >
                    Join Academy
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
