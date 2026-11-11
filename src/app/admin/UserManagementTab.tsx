"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getAllUsers, createUser, updateUserRole, resetUserPassword } from "./actions";
import { Plus, X, Lock, ShieldCheck, Users } from "@/components/Icons";

/**
 * Staff Accounts and User Role Governance Tab.
 * Allows AWIEF executive administrators to invite staff, adjust role permissions (Student, Reviewer, Admin),
 * and reset access credentials.
 *
 * @returns {JSX.Element} The rendered user management interface.
 */
export default function UserManagementTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("STUDENT");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const data = await getAllUsers();
    setUsers(data);
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createUser(newEmail, newName, newRole);
      if (!res.success) {
        alert(res.error || "Failed to create user");
        return;
      }
      setNewEmail("");
      setNewName("");
      setIsCreating(false);
      loadUsers();
      alert("User account successfully provisioned. Default password is 'changeme123'");
    } catch (err: any) {
      alert(err?.message || "An unexpected error occurred while creating the user.");
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      const res = await updateUserRole(userId, role);
      if (!res.success) {
        alert(res.error || "Failed to update role");
        return;
      }
      loadUsers();
    } catch (err: any) {
      alert(err?.message || "Failed to update role");
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (confirm("Are you sure you want to reset this user's password to 'changeme123'?")) {
      try {
        const res = await resetUserPassword(userId);
        if (!res.success) {
          alert(res.error || "Failed to reset password.");
          return;
        }
        alert("Password reset successfully. New password is 'changeme123'");
      } catch (err: any) {
        alert(err?.message || "Failed to reset password.");
      }
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 text-xs">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7F3D59] mx-auto mb-2"></div>
        <span>Loading user accounts &amp; permissions...</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="bg-white shadow-sm rounded-2xl border border-[#EAD7E0] overflow-hidden">
        <div className="px-6 py-5 border-b border-[#EAD7E0] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#FDF8F9]">
          <div>
            <h3 className="text-lg font-serif font-bold text-gray-900">
              Staff &amp; Learner Access Governance
            </h3>
            <p className="text-xs text-gray-500">
              Manage executive roles, grant faculty author privileges, or reset credentials.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreating(!isCreating)}
            className="px-4 py-2 bg-[#7F3D59] hover:bg-[#5E2C41] text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
          >
            {isCreating ? (
              <>
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Staff Account</span>
              </>
            )}
          </button>
        </div>

        {isCreating && (
          <div className="p-6 bg-[#FDF8F9] border-b border-[#EAD7E0]">
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  required
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#7F3D59] focus:outline-none"
                  placeholder="e.g. Dr. Aissatou Diop"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  required
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#7F3D59] focus:outline-none"
                  placeholder="aissatou@awieforum.org"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Role Permission
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#7F3D59] bg-white focus:outline-none"
                >
                  <option value="STUDENT">Student / Founder</option>
                  <option value="REVIEWER">Faculty Reviewer / Author</option>
                  <option value="ADMIN">Executive Administrator</option>
                </select>
              </div>
              <div>
                <button
                  type="submit"
                  className="w-full py-2 bg-[#7F3D59] hover:bg-[#5E2C41] text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                >
                  Provision Account
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-xs">
            <thead className="bg-[#FDF8F9] text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-3 text-left">User Profile</th>
                <th className="px-6 py-3 text-left">Role Permission</th>
                <th className="px-6 py-3 text-left">Last Active</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {users.map((user: any) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-9 w-9 bg-[#7F3D59] text-white rounded-full flex items-center justify-center font-bold text-xs">
                        {user.name ? user.name[0].toUpperCase() : "U"}
                      </div>
                      <div className="ml-3">
                        <div className="font-bold text-gray-900">{user.name || "Anonymous User"}</div>
                        <div className="text-[11px] text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="text-xs font-semibold border-gray-300 rounded-lg shadow-xs focus:ring-[#7F3D59] focus:border-[#7F3D59] py-1 px-2.5 bg-[#FDF8F9]"
                    >
                      <option value="STUDENT">Student / Founder</option>
                      <option value="REVIEWER">Faculty Reviewer</option>
                      <option value="ADMIN">Executive Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                    {user.lastActiveDate ? new Date(user.lastActiveDate).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                    <button
                      type="button"
                      onClick={() => handleResetPassword(user.id)}
                      className="text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg font-bold transition-colors inline-flex items-center gap-1"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Reset Password</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
