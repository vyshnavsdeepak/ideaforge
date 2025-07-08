import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    // Additional middleware logic can be added here
    console.log(`[AUTH] ${req.method} ${req.url} - User: ${req.nextauth.token?.sub || 'anonymous'}`);
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Protect admin routes
        if (req.nextUrl.pathname.startsWith('/dashboard')) {
          return !!token;
        }
        
        // Allow access to other routes
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/trigger/:path*',
  ],
};