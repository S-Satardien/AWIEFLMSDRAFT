"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getAllUsers, createUser, updateUserRole, resetUserPassword } from "./actions";

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
      alert("User created successfully. Default password is 'changeme123'");
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

  if (loading) return <div className="p-12 text-center text-gray-500">Loading users...</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="bg-white shadow-md rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-gray-900">User Management</h3>
            <p className="text-sm text-gray-500">Add accounts, change roles, or reset passwords.</p>
          </div>
          <button 
            onClick={() => setIsCreating(!isCreating)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded hover:bg-indigo-700 transition-colors shadow-sm flex items-center"
          >
            {isCreating ? "Cancel" : "+ Add User"}
          </button>
        </div>

        {isCreating && (
          <div className="p-6 bg-indigo-50 border-b border-gray-200">
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1">Name</label>
                <input required type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-2 border border-indigo-200 rounded text-sm focus:ring-2 focus:ring-indigo-500" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1">Email</label>
                <input required type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full p-2 border border-indigo-200 rounded text-sm focus:ring-2 focus:ring-indigo-500" placeholder="john@example.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1">Role</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full p-2 border border-indigo-200 rounded text-sm focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="STUDENT">Student</option>
                  <option value="REVIEWER">Reviewer</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div>
                <button type="submit" className="w-full py-2 bg-indigo-600 text-white font-bold rounded text-sm hover:bg-indigo-700 transition-colors">
                  Create Account
                </button>
              </div>
            </form>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Last Active</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user: any) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-vacfa-charcoal text-white rounded-full flex items-center justify-center font-bold">
                        {user.name ? user.name[0].toUpperCase() : 'U'}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name || 'Anonymous User'}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select 
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="STUDENT">Student</option>
                      <option value="REVIEWER">Reviewer</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastActiveDate ? new Date(user.lastActiveDate).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleResetPassword(user.id)}
                      className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded transition-colors"
                    >
                      Reset Password
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
