import { NextRequest, NextResponse } from 'next/server'
import { getSimpleSession } from '@/lib/simple-middleware'

export default function middleware(req: NextRequest) {
  const { nextUrl } = req
  const session = getSimpleSession(req)
  const isLoggedIn = !!session

  const isAppRoute = nextUrl.pathname.startsWith("/app")
  const isAdminRoute = nextUrl.pathname.startsWith("/app/admin")
  const isLoginPage = nextUrl.pathname === "/login"
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN"

  // Redirect to login if trying to access app routes without authentication
  if (isAppRoute && !isLoggedIn) {
    const response = NextResponse.redirect(new URL("/login", nextUrl))
    // Add cache control headers to prevent caching of protected routes
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
  }

  // Redirect SUPER_ADMIN users to /app/admin if they try to access regular app routes
  if (isLoggedIn && isSuperAdmin && isAppRoute && !isAdminRoute) {
    return NextResponse.redirect(new URL("/app/admin", nextUrl))
  }

  // Redirect to app if already logged in and trying to access login
  if (isLoginPage && isLoggedIn) {
    // SUPER_ADMIN users should go to /app/admin instead of /app
    if (isSuperAdmin) {
      return NextResponse.redirect(new URL("/app/admin", nextUrl))
    }
    return NextResponse.redirect(new URL("/app", nextUrl))
  }

  // Add cache control headers for app routes to ensure fresh authentication checks
  if (isAppRoute) {
    const response = NextResponse.next()
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
