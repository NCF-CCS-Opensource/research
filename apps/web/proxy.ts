import { clerkMiddleware } from "@clerk/nextjs/server";

// Sign-in is enforced by the API; this only makes the Clerk session available.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*[.](?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
