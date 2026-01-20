/**
 * Simplified authentication system for owner login
 * Updated for multi-tenant support with organization context
 */

import type {
  AuthSession,
  OrganizationRole,
  PlatformRole,
  SessionUser,
} from "@/lib/auth/rbac"
import { prisma } from "@/lib/db"
import { verifyPassword } from "@/lib/password"
import { addDays } from "date-fns"

interface UserWithOrganization {
  id: string
  email: string
  name: string | null
  password: string | null
  role: string
  isActive: boolean
  organizations: Array<{
    id: string
    role: string
    teamIds: string[]
    organizationId: string
    organization: {
      id: string
      name: string
      slug: string
    }
  }>
}

export async function verifyCredentials(
  email: string,
  password: string
): Promise<SessionUser | null> {
  try {
    // Find user by email (case insensitive) with organization membership
    const user = (await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
        isActive: true,
      },
      include: {
        organizations: {
          where: { isActive: true },
          include: {
            organization: true,
          },
          take: 1,
        },
      },
    })) as UserWithOrganization | null

    // User not found or inactive
    if (!user) {
      return null
    }

    // Check if password is set
    if (!user.password) {
      console.error(`User ${email} has no password set`)
      return null
    }

    // Verify password using bcrypt
    const isValid = await verifyPassword(password, user.password)
    if (!isValid) {
      return null
    }

    // Build session user with organization context
    const orgMembership = user.organizations[0]

    // For SUPER_ADMIN users, they don't need an organization to login
    if (user.role === "SUPER_ADMIN") {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: "SUPER_ADMIN" as PlatformRole,
        organizationId: orgMembership?.organizationId,
        organizationRole: orgMembership?.role as OrganizationRole | undefined,
        organizationName: orgMembership?.organization.name,
        teamIds: orgMembership?.teamIds || [],
      }
    }

    // Regular users must belong to an organization
    if (!orgMembership) {
      console.error(`User ${email} does not belong to any organization`)
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: "USER" as PlatformRole,
      organizationId: orgMembership.organizationId,
      organizationRole: orgMembership.role as OrganizationRole,
      organizationName: orgMembership.organization.name,
      teamIds: orgMembership.teamIds || [],
    }
  } catch (error) {
    console.error("Error verifying credentials:", error)
    return null
  }
}

export function createSimpleSession(user: SessionUser): AuthSession {
  return {
    user,
    expires: addDays(new Date(), 1).toISOString(),
  }
}

/**
 * Create a session for a user switching to a different organization
 */
export async function createSessionForOrganization(
  userId: string,
  organizationId: string
): Promise<AuthSession | null> {
  try {
    const user = (await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizations: {
          where: {
            organizationId,
            isActive: true,
          },
          include: {
            organization: true,
          },
        },
      },
    })) as UserWithOrganization | null

    if (!user || !user.isActive) {
      return null
    }

    const orgMembership = user.organizations[0]
    if (!orgMembership) {
      return null
    }

    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as PlatformRole,
      organizationId: orgMembership.organizationId,
      organizationRole: orgMembership.role as OrganizationRole,
      organizationName: orgMembership.organization.name,
      teamIds: orgMembership.teamIds || [],
    }

    return createSimpleSession(sessionUser)
  } catch (error) {
    console.error("Error creating session for organization:", error)
    return null
  }
}

/**
 * Check if a user can access a specific organization
 */
export async function canAccessOrganization(
  userId: string,
  organizationId: string
): Promise<boolean> {
  // Check if user is super admin (can access all orgs)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  if (user?.role === "SUPER_ADMIN") {
    return true
  }

  // Check organization membership
  const membership = await prisma.organizationUser.findFirst({
    where: {
      userId,
      organizationId,
      isActive: true,
    },
  })

  return !!membership
}
