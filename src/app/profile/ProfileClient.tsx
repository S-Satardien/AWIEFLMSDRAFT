"use client";

import { useState } from "react";
import { changePassword, updateProfile } from "./actions";
import { motion } from "framer-motion";
import { COUNTRIES } from "@/lib/countries";

/**
 * Profile management client component for AWIEF Academy learners.
 * Allows updating display identity, country flag, enterprise affiliation,
 * leaderboard visibility preferences, and credential passwords.
 *
 * @param {object} props - User profile properties.
 * @returns {JSX.Element} The rendered profile management interface.
 */
export default function ProfileClient({ user }: { user: any }) {
  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ text: "", type: "" });

  // Profile State
  const [name, setName] = useState(user.name || "");
  const [country, setCountry] = useState(user.country || "ZA");
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(user.showOnLeaderboard ?? true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ text: "", type: "" });

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: "New passwords do not match.", type: "error" });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ text: "Password must be at least 8 characters.", type: "error" });
      return;
    }

    setPasswordLoading(true);
    setPasswordMessage({ text: "", type: "" });
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMessage({ text: "Password changed successfully!", type: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordMessage({ text: err.message || "Failed to change password.", type: "error" });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage({ text: "", type: "" });
    try {
      await updateProfile(name, country, showOnLeaderboard);
      setProfileMessage({ text: "Profile updated successfully!", type: "success" });
    } catch {
      setProfileMessage({ text: "Failed to update profile.", type: "error" });
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div className="bg-white rounded-3xl shadow-sm border border-[#EAD7E0] overflow-hidden">
        <div className="px-6 py-8 border-b border-[#EAD7E0] flex items-center bg-[#FDF8F9]">
          <div className="h-20 w-20 bg-[#7F3D59] text-white rounded-2xl flex items-center justify-center text-3xl font-serif font-bold shadow-md">
            {name ? name[0].toUpperCase() : (user.name ? user.name[0].toUpperCase() : 'U')}
          </div>
          <div className="ml-6">
            <h2 className="text-2xl font-serif font-bold text-gray-900">{name || user.name}</h2>
            <p className="text-gray-500 text-xs">{user.email}</p>
            <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#7F3D59]/10 text-[#7F3D59] border border-[#7F3D59]/20 uppercase tracking-wider">
              {user.role === 'ADMIN' ? 'AWIEF Director' : user.role === 'REVIEWER' ? 'Faculty Author' : 'Pan-African Founder'}
            </div>
          </div>
        </div>

        {/* Profile Settings Section */}
        <div className="p-8 border-b border-gray-100">
          <h3 className="text-lg font-serif font-bold text-gray-900 mb-6 flex items-center">
            <span className="mr-2 text-[#7F3D59]">★</span>
            Executive Identity &amp; Leaderboard Settings
          </h3>

          {profileMessage.text && (
            <div className={`p-4 rounded-xl mb-6 text-xs font-medium ${profileMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
              {profileMessage.text}
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Display Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FDF8F9] border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#7F3D59]"
                  placeholder="Your Name"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Country</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FDF8F9] border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#7F3D59]"
                >
                  <option value="">Select a country...</option>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="showOnLeaderboard"
                  type="checkbox"
                  checked={showOnLeaderboard}
                  onChange={(e) => setShowOnLeaderboard(e.target.checked)}
                  className="focus:ring-[#7F3D59] h-4 w-4 text-[#7F3D59] border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-xs">
                <label htmlFor="showOnLeaderboard" className="font-bold text-gray-700">Display on Pan-African Founders Leaderboard</label>
                <p className="text-gray-500">If checked, your enterprise name and country flag will be visible on the cohort learning leaderboard.</p>
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={profileLoading}
                className="w-full md:w-auto px-6 py-2.5 bg-[#7F3D59] text-white font-bold rounded-xl hover:bg-[#5E2C41] transition-colors disabled:opacity-50 text-xs shadow-sm"
              >
                {profileLoading ? "Saving..." : "Save Profile Details"}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Section */}
        <div className="p-8">
          <h3 className="text-lg font-serif font-bold text-gray-900 mb-6 flex items-center">
            <span className="mr-2 text-gray-400">🔒</span>
            Update Security Credentials
          </h3>

          {passwordMessage.text && (
            <div className={`p-4 rounded-xl mb-6 text-xs font-medium ${passwordMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
              {passwordMessage.text}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Current Password</label>
              <input 
                type="password" 
                required 
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FDF8F9] border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#7F3D59]"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">New Password (Min 8 chars)</label>
                <input 
                  type="password" 
                  required 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FDF8F9] border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#7F3D59]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Confirm New Password</label>
                <input 
                  type="password" 
                  required 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FDF8F9] border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#7F3D59]"
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={passwordLoading}
                className="w-full md:w-auto px-6 py-2.5 bg-[#1D0B14] text-white font-bold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 text-xs shadow-sm"
              >
                {passwordLoading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
