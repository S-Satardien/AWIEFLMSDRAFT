import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = (req.nextauth.token?.role as string | undefined) || "";
    if (
      req.nextUrl.pathname.startsWith("/admin") &&
      !["ADMIN", "REVIEWER"].includes(role)
    ) {
      return NextResponse.rewrite(new URL("/dashboard", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => Boolean(token && token.id),
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/course/:path*",
    "/admin/:path*",
    "/profile/:path*",
    "/certificate/:path*",
    "/quiz/:path*",
  ],
};
