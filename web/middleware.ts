// Clerk auth middleware.
//
// Next.js 16 has renamed the file convention to `proxy.ts`, but Clerk 7 still
// ships `clerkMiddleware`. Using the old name works (deprecated) until Clerk
// catches up. When they do, rename this to `proxy.ts` and swap the identifier.
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtected = createRouteMatcher(["/dashboard(.*)", "/api/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip _next internals and public files unless they hit an API route.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
