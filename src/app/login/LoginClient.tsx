"use client";

import Link from "next/link";
import { signIn, getSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  checkUserEligibility,
  setupInitialPassword,
  resetUserPassword,
  getDemoAccountCredentials,
} from "./actions";
import { Sparkles, ArrowLeft, ArrowRight } from "@/components/Icons";

/**
 * Authentication login, password reset, and activation portal for AWIEF Academy.
 * Conditionally presents 1-Click Reviewer Demo Login cards when server-side
 * `ENABLE_DEMO_LOGIN=true` is configured in the environment.
 *
 * @param props - Component properties containing `enableDemoLogin`.
 * @returns Rendered portal interface.
 */
export default function LoginClient({
  enableDemoLogin,
}: {
  enableDemoLogin: boolean;
}) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"login" | "reset" | "setup">("login");

  // Login State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Setup State
  const [setupStep, setSetupStep] = useState<1 | 2>(1);
  const [setupEmail, setSetupEmail] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupConfirmPassword, setSetupConfirmPassword] = useState("");
  const [setupError, setSetupError] = useState("");
  const [isSettingUp, setIsSettingUp] = useState(false);

  // Password Reset State
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const handleRoleRedirect = async () => {
    const session = await getSession();
    const role = (session?.user as { role?: string } | undefined)?.role;

    if (role === "ADMIN" || role === "REVIEWER") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
      });

      if (res?.error) {
        setLoginError(
          res.error === "CredentialsSignin"
            ? "Invalid email or password"
            : res.error
        );
        setIsLoggingIn(false);
      } else {
        await handleRoleRedirect();
      }
    } catch {
      setLoginError("An unexpected error occurred");
      setIsLoggingIn(false);
    }
  };

  const handleQuickDemoLogin = async (
    accountType: "LEARNER" | "ADMIN" | "REVIEWER"
  ) => {
    setIsLoggingIn(true);
    setLoginError("");

    try {
      const creds = await getDemoAccountCredentials(accountType);
      if (!creds) {
        setLoginError("Demo login is disabled in this environment.");
        setIsLoggingIn(false);
        return;
      }

      setEmail(creds.email);
      setPassword(creds.password);

      const res = await signIn("credentials", {
        redirect: false,
        email: creds.email,
        password: creds.password,
      });

      if (res?.error) {
        setLoginError("Quick demo sign-in failed. Please check credentials.");
        setIsLoggingIn(false);
      } else {
        await handleRoleRedirect();
      }
    } catch {
      setLoginError("Failed to sign in demo account.");
      setIsLoggingIn(false);
    }
  };

  const handleSetupCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSettingUp(true);
    setSetupError("");

    try {
      const res = await checkUserEligibility(setupEmail);
      if (res.success) {
        setSetupStep(2);
      } else {
        setSetupError(res.message);
      }
    } catch {
      setSetupError("Failed to verify email.");
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleSetupComplete = async (e: React.FormEvent) => {
    e.preventDefault();

    if (setupPassword !== setupConfirmPassword) {
      setSetupError("Passwords do not match.");
      return;
    }
    if (setupPassword.length < 8) {
      setSetupError("Password must be at least 8 characters.");
      return;
    }

    setIsSettingUp(true);
    setSetupError("");

    try {
      await setupInitialPassword(setupEmail, setupPassword);
      const res = await signIn("credentials", {
        redirect: false,
        email: setupEmail.trim().toLowerCase(),
        password: setupPassword,
      });

      if (res?.error) {
        setSetupError(
          "Account updated, but automatic login failed. Please sign in normally."
        );
        setIsSettingUp(false);
      } else {
        await handleRoleRedirect();
      }
    } catch (err: unknown) {
      setSetupError(
        err instanceof Error ? err.message : "Failed to set up password."
      );
      setIsSettingUp(false);
    }
  };

  const handleResetCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);
    setResetError("");

    try {
      setResetStep(2);
    } catch {
      setResetError("Failed to proceed.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetComplete = async (e: React.FormEvent) => {
    e.preventDefault();

    if (resetPassword !== resetConfirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }
    if (resetPassword.length < 8) {
      setResetError("Password must be at least 8 characters.");
      return;
    }

    setIsResetting(true);
    setResetError("");
    setResetSuccess("");

    try {
      const res = await resetUserPassword(resetEmail, resetPassword);
      if (res.success) {
        setResetSuccess("Password successfully updated! Signing you in...");
        const signRes = await signIn("credentials", {
          redirect: false,
          email: resetEmail.trim().toLowerCase(),
          password: resetPassword,
        });

        if (signRes?.error) {
          setActiveTab("login");
          setEmail(resetEmail);
          setIsResetting(false);
        } else {
          await handleRoleRedirect();
        }
      } else {
        setResetError(res.message);
        setIsResetting(false);
      }
    } catch (err: unknown) {
      setResetError(
        err instanceof Error ? err.message : "Failed to reset password."
      );
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF8F9] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-[#7F3D59] selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="flex justify-start mb-4 px-4 sm:px-0">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-[#7F3D59] transition-all bg-white px-3.5 py-1.5 rounded-full border border-gray-200 shadow-sm hover:shadow"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>

        <Link href="/" className="inline-block">
          <img
            className="mx-auto h-16 w-auto object-contain bg-white p-1 rounded-xl shadow-xs"
            src="/images/awief-logo.jpg"
            alt="AWIEF Logo"
          />
        </Link>
        <h2 className="mt-4 text-center text-3xl font-serif font-extrabold text-[#1D0B14] tracking-tight">
          AWIEF Academy Portal
        </h2>
        <p className="mt-1 text-center text-xs text-[#7F3D59] font-bold uppercase tracking-wider">
          Advancing Women. Growing Economies.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg relative z-10 px-4 sm:px-0 space-y-6">
        {/* Conditional 1-Click Reviewer Demo Strip (gated by ENABLE_DEMO_LOGIN=true) */}
        {enableDemoLogin && (
          <div className="bg-gradient-to-br from-[#1D0B14] to-[#3E1A29] p-5 rounded-3xl shadow-xl border border-[#D4AF37]/30 text-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>1-Click J&amp;J Reviewer Demo Logins</span>
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                Demo Mode Active
              </span>
            </div>
            <p className="text-xs text-gray-300">
              Click any account below to sign in instantly with pre-seeded demo permissions:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <button
                type="button"
                disabled={isLoggingIn}
                onClick={() => handleQuickDemoLogin("LEARNER")}
                className="p-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-left transition-all group disabled:opacity-50"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-white group-hover:text-[#D4AF37]">
                    Learner Demo
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    Amara
                  </span>
                </div>
                <p className="text-[10px] text-gray-300 line-clamp-1">
                  Founder (Nigeria)
                </p>
                <p className="text-[9px] text-[#D4AF37] font-mono mt-1 inline-flex items-center gap-1">
                  <span>Course &amp; Cert</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </p>
              </button>

              <button
                type="button"
                disabled={isLoggingIn}
                onClick={() => handleQuickDemoLogin("ADMIN")}
                className="p-3 bg-[#7F3D59]/60 hover:bg-[#7F3D59] border border-[#D4AF37]/40 rounded-2xl text-left transition-all group disabled:opacity-50"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-white group-hover:text-[#D4AF37]">
                    Admin &amp; Finance
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#D4AF37]/30 text-[#D4AF37]">
                    Ekene
                  </span>
                </div>
                <p className="text-[10px] text-gray-300 line-clamp-1">
                  Director of Programs
                </p>
                <p className="text-[9px] text-[#D4AF37] font-mono mt-1 inline-flex items-center gap-1">
                  <span>Royalties &amp; Builder</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </p>
              </button>

              <button
                type="button"
                disabled={isLoggingIn}
                onClick={() => handleQuickDemoLogin("REVIEWER")}
                className="p-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-left transition-all group disabled:opacity-50"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-white group-hover:text-[#D4AF37]">
                    Author Reviewer
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                    Nomsa
                  </span>
                </div>
                <p className="text-[10px] text-gray-300 line-clamp-1">
                  Syndicate Author
                </p>
                <p className="text-[9px] text-[#D4AF37] font-mono mt-1 inline-flex items-center gap-1">
                  <span>Review &amp; Payouts</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Traditional Credentials Box */}
        <div className="bg-white py-8 px-6 shadow-xl border border-[#EAD7E0] sm:rounded-3xl sm:px-10">
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => {
                setActiveTab("login");
                setLoginError("");
              }}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
                activeTab === "login"
                  ? "border-[#7F3D59] text-[#7F3D59]"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setActiveTab("reset");
                setResetError("");
              }}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
                activeTab === "reset"
                  ? "border-[#7F3D59] text-[#7F3D59]"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              Reset Password
            </button>
            <button
              onClick={() => {
                setActiveTab("setup");
                setSetupError("");
              }}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
                activeTab === "setup"
                  ? "border-[#7F3D59] text-[#7F3D59]"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              Activation
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "login" && (
              <motion.form
                key="login-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleLoginSubmit}
                className="space-y-5"
              >
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 tracking-wider">
                    Email Address
                  </label>
                  <div className="mt-1">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="amara@ecoagri.ng"
                      className="appearance-none block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#7F3D59] focus:border-[#7F3D59] text-sm"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase text-gray-700 tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("reset");
                        setResetEmail(email);
                      }}
                      className="text-xs font-semibold text-[#7F3D59] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="mt-1">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#7F3D59] focus:border-[#7F3D59] text-sm"
                    />
                  </div>
                </div>

                {loginError && (
                  <div className="text-red-600 text-xs font-medium bg-red-50 p-3 rounded-xl border border-red-200">
                    {loginError}
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-[#7F3D59] hover:bg-[#5E2C41] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7F3D59] disabled:opacity-50 transition-all font-serif"
                  >
                    {isLoggingIn ? "Authenticating..." : "Sign In to Academy"}
                  </button>
                </div>

                <div className="text-center pt-3 space-y-2 border-t border-gray-100 mt-4">
                  <p className="text-xs text-gray-500">
                    Don&apos;t have an account yet?{" "}
                    <Link
                      href="/register"
                      className="font-bold text-[#7F3D59] hover:underline"
                    >
                      Register as a founder
                    </Link>
                  </p>
                </div>
              </motion.form>
            )}

            {activeTab === "reset" && (
              <motion.div
                key="reset-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {resetStep === 1 ? (
                  <form onSubmit={handleResetCheckEmail} className="space-y-5">
                    <div>
                      <p className="text-xs text-gray-600 mb-3">
                        Enter your registered email address to reset your account password.
                      </p>
                      <label className="block text-xs font-bold uppercase text-gray-700 tracking-wider">
                        Email Address
                      </label>
                      <div className="mt-1">
                        <input
                          type="email"
                          required
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="name@organization.org"
                          className="appearance-none block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl shadow-sm text-sm"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isResetting}
                      className="w-full py-3 bg-[#7F3D59] hover:bg-[#5E2C41] text-white font-bold text-xs rounded-xl shadow-sm"
                    >
                      Continue to Password Reset
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleResetComplete} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-700 tracking-wider">
                        New Password (Min 8 characters)
                      </label>
                      <input
                        type="password"
                        required
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        className="mt-1 block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-700 tracking-wider">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        required
                        value={resetConfirmPassword}
                        onChange={(e) => setResetConfirmPassword(e.target.value)}
                        className="mt-1 block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm"
                      />
                    </div>
                    {resetError && (
                      <div className="text-red-600 text-xs">{resetError}</div>
                    )}
                    {resetSuccess && (
                      <div className="text-emerald-700 text-xs font-bold">
                        {resetSuccess}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={isResetting}
                      className="w-full py-3 bg-[#7F3D59] hover:bg-[#5E2C41] text-white font-bold text-xs rounded-xl shadow-sm"
                    >
                      Update Password &amp; Sign In
                    </button>
                  </form>
                )}
              </motion.div>
            )}

            {activeTab === "setup" && (
              <motion.div
                key="setup-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {setupStep === 1 ? (
                  <form onSubmit={handleSetupCheckEmail} className="space-y-5">
                    <p className="text-xs text-gray-600">
                      If you were invited to an AWIEF cohort, enter your registered email to activate your account.
                    </p>
                    <input
                      type="email"
                      required
                      value={setupEmail}
                      onChange={(e) => setSetupEmail(e.target.value)}
                      placeholder="cohort.fellow@awieforum.org"
                      className="block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm"
                    />
                    {setupError && (
                      <div className="text-red-600 text-xs">{setupError}</div>
                    )}
                    <button
                      type="submit"
                      disabled={isSettingUp}
                      className="w-full py-3 bg-[#7F3D59] hover:bg-[#5E2C41] text-white font-bold text-xs rounded-xl shadow-sm"
                    >
                      Verify Cohort Invitation
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSetupComplete} className="space-y-5">
                    <input
                      type="password"
                      required
                      placeholder="Choose new password"
                      value={setupPassword}
                      onChange={(e) => setSetupPassword(e.target.value)}
                      className="block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm"
                    />
                    <input
                      type="password"
                      required
                      placeholder="Confirm password"
                      value={setupConfirmPassword}
                      onChange={(e) => setSetupConfirmPassword(e.target.value)}
                      className="block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm"
                    />
                    {setupError && (
                      <div className="text-red-600 text-xs">{setupError}</div>
                    )}
                    <button
                      type="submit"
                      disabled={isSettingUp}
                      className="w-full py-3 bg-[#7F3D59] hover:bg-[#5E2C41] text-white font-bold text-xs rounded-xl shadow-sm"
                    >
                      Activate Account
                    </button>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
