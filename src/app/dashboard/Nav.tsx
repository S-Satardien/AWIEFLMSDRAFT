"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Dashboard navigation bar providing authenticated session awareness,
 * role-based administrative / reviewer links, and profile management for AWIEF Academy.
 *
 * @returns {JSX.Element} The rendered dashboard navigation bar.
 */
export default function DashboardNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || 'STUDENT';
  const name = session?.user?.name || session?.user?.email || 'U';
  const initials = name.substring(0, 2).toUpperCase();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { name: "My Academy", href: "/dashboard" },
    { name: "Enrolled Courses", href: "/dashboard/courses" },
    { name: "Course Catalogue", href: "/catalog" },
  ];

  if (role === 'ADMIN') {
    navItems.push({ name: "Admin", href: "/admin" });
  } else if (role === 'REVIEWER') {
    navItems.push({ name: "Author & Reviewer Portal", href: "/admin" });
  }

  navItems.push({ name: "Profile & Business", href: "/profile" });

  return (
    <nav className="w-full bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex-shrink-0 flex items-center gap-3">
              <img 
                src="/images/awief-logo.jpg" 
                alt="AWIEF" 
                className="h-10 w-auto object-contain rounded" 
              />
              <span className="text-lg font-serif font-bold text-[#7F3D59] hidden md:inline border-l-2 border-gray-300 pl-3">
                Academy Hub
              </span>
            </Link>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "border-[#7F3D59] text-[#7F3D59] font-semibold"
                        : "border-transparent text-gray-600 hover:border-[#D4AF37] hover:text-[#7F3D59]"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Role indicator pill */}
            <span className="hidden lg:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FDF8F9] text-[#7F3D59] border border-[#7F3D59]/20">
              {role === 'ADMIN' ? 'AWIEF Director' : role === 'REVIEWER' ? 'Faculty Author' : 'Pan-African Founder'}
            </span>

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center focus:outline-none"
                aria-label="User menu"
              >
                <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-[#7F3D59] hover:bg-[#5E2C41] hover:ring-2 hover:ring-offset-2 hover:ring-[#D4AF37] transition-all">
                  <span className="text-sm font-medium leading-none text-white">{initials}</span>
                </span>
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none z-50"
                  >
                    <div className="px-4 py-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Signed in as</p>
                      <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                      <p className="text-xs text-[#7F3D59] font-medium">{session?.user?.email}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/profile"
                        onClick={() => setIsDropdownOpen(false)}
                        className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-[#FDF8F9] hover:text-[#7F3D59]"
                      >
                        Profile &amp; Enterprise Settings
                      </Link>
                      <Link
                        href="/dashboard/courses"
                        onClick={() => setIsDropdownOpen(false)}
                        className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-[#FDF8F9] hover:text-[#7F3D59]"
                      >
                        My Certifications &amp; Courses
                      </Link>
                      {(role === 'ADMIN' || role === 'REVIEWER') && (
                        <Link
                          href="/admin"
                          onClick={() => setIsDropdownOpen(false)}
                          className="group flex items-center px-4 py-2 text-sm text-[#7F3D59] font-semibold hover:bg-[#FDF8F9]"
                        >
                          {role === 'ADMIN' ? 'Admin & Royalties Portal' : 'Faculty Review Hub'}
                        </Link>
                      )}
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="group flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 font-medium"
                      >
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Standalone Sign Out Button */}
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors border border-gray-200 px-3 py-1.5 rounded hover:border-red-200 hover:bg-red-50 hidden sm:block"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
