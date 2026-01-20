import type { AuthSession } from "@/lib/auth/rbac";
import { NextRequest, NextResponse } from "next/server";

export function getSimpleSession(req: NextRequest): AuthSession | null {
  try {
    const sessionCookie = req.cookies.get("simple-session")

    if (sessionCookie) {
      const session = JSON.parse(sessionCookie.value) as AuthSession

      // Check if session is expired
      if (new Date(session.expires) > new Date()) {
        return session
      }
    }

    return null
  } catch (error) {
    console.error("Error getting simple session:", error)
    return null
  }
}

export function requireSimpleAuth(req: NextRequest) {
  const session = getSimpleSession(req)

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  return null
}

/**
 * Check if the current user is a Super Admin
 */
export function isSuperAdminRequest(req: NextRequest): boolean {
  const session = getSimpleSession(req)
  return session?.user?.role === "SUPER_ADMIN"
}

/**
 * Get the organization ID from the current session
 */
export function getOrganizationId(req: NextRequest): string | undefined {
  const session = getSimpleSession(req)
  return session?.user?.organizationId
}
