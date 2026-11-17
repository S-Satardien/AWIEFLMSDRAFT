import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const TOKEN_CHECK_INTERVAL_MS = 60 * 1000;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email Address", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const normalizedEmail = credentials.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!user) {
          await logAuditEvent({
            actorEmail: normalizedEmail,
            action: "LOGIN_FAILED_UNKNOWN_USER",
            targetType: "User",
          });
          return null;
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          await logAuditEvent({
            actorId: user.id,
            actorEmail: user.email,
            action: "LOGIN_BLOCKED_LOCKOUT",
            targetType: "User",
            targetId: user.id,
          });
          throw new Error(
            "Too many failed sign-in attempts. Please try again in 15 minutes."
          );
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          const nextFailures = (user.failedLoginAttempts || 0) + 1;
          const shouldLock = nextFailures >= MAX_FAILED_ATTEMPTS;

          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: shouldLock ? 0 : nextFailures,
              lockedUntil: shouldLock
                ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
                : null,
            },
          });

          await logAuditEvent({
            actorId: user.id,
            actorEmail: user.email,
            action: shouldLock ? "LOGIN_LOCKED_OUT" : "LOGIN_FAILED_BAD_PASSWORD",
            targetType: "User",
            targetId: user.id,
            details: `attempts=${nextFailures}`,
          });

          if (shouldLock) {
            throw new Error(
              "Account temporarily locked for 15 minutes after repeated failed attempts."
            );
          }
          return null;
        }

        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: 0,
              lockedUntil: null,
              lastActiveDate: new Date(),
            },
          });
        }

        await logAuditEvent({
          actorId: user.id,
          actorEmail: user.email,
          action: "LOGIN_SUCCESS",
          targetType: "User",
          targetId: user.id,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tokenVersion: user.tokenVersion,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const typed = user as { id: string; role: string; tokenVersion?: number };
        token.id = typed.id;
        token.role = typed.role;
        token.tokenVersion = typed.tokenVersion ?? 0;
        token.checkedAt = Date.now();
        return token;
      }

      // Periodically verify session has not been revoked via tokenVersion or deletion
      const lastChecked = typeof token.checkedAt === "number" ? token.checkedAt : 0;
      if (token.id && Date.now() - lastChecked > TOKEN_CHECK_INTERVAL_MS) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { id: true, role: true, tokenVersion: true, lockedUntil: true },
        });

        if (
          !dbUser ||
          dbUser.tokenVersion !== (token.tokenVersion ?? 0) ||
          (dbUser.lockedUntil && dbUser.lockedUntil > new Date())
        ) {
          delete token.id;
          delete token.role;
          return token;
        }

        token.role = dbUser.role;
        token.checkedAt = Date.now();
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        const typedUser = session.user as { id?: string; role?: string };
        typedUser.id = token.id as string;
        typedUser.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
