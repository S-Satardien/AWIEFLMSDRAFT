import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // If an admin route is accessed, check if the user is an admin or reviewer
    if (req.nextUrl.pathname.startsWith("/admin") && !["ADMIN", "REVIEWER"].includes(req.nextauth.token?.role as string)) {
      return NextResponse.rewrite(new URL("/dashboard", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/course/:path*", "/admin/:path*"],
};
