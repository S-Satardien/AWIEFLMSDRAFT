import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";

/**
 * Authentication portal Server Component wrapper.
 * Evaluates server-side `ENABLE_DEMO_LOGIN` flag so 1-Click Reviewer Demo login
 * only renders when explicitly enabled in environment configuration.
 */
export default function LoginPage() {
  const enableDemoLogin = process.env.ENABLE_DEMO_LOGIN === "true";
  return <LoginClient enableDemoLogin={enableDemoLogin} />;
}
