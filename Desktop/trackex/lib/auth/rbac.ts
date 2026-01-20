import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

// ================================
// ROLE & PERMISSION DEFINITIONS
// ================================

export type PlatformRole = "SUPER_ADMIN" | "USER"
export type OrganizationRole = "OWNER" | "MANAGER" | "TEAM_LEAD"
export type Role = PlatformRole | OrganizationRole

export type Resource =
  | "organization"
  | "billing"
  | "subscription"
  | "license"
  | "employees"
  | "teams"
  | "policies"
  | "app_rules"
  | "domain_rules"
  | "screenshots"
  | "analytics"
  | "audit_logs"
  | "settings"
  | "agent_versions"
  | "*"

export type Action = "create" | "read" | "update" | "delete" | "*"
export type Scope = "all" | "organization" | "team"

export interface Permission {
  resource: Resource
  actions: Action[]
  scope: Scope
}

export interface SessionUser {
  id: string
  email: string
  name?: string | null
  role: PlatformRole
  organizationId?: string
  organizationRole?: OrganizationRole
  organizationName?: string
  teamIds?: string[]
}

export interface AuthSession {
  user: SessionUser
  expires: string
}

// Permission definitions for each role
const ROLE_PERMISSIONS: Record<OrganizationRole, Permission[]> = {
  OWNER: [{ resource: "*", actions: ["*"], scope: "organization" }],
  MANAGER: [
    {
      resource: "employees",
      actions: ["create", "read", "update"],
      scope: "organization",
    },
    {
      resource: "teams",
      actions: ["create", "read", "update"],
      scope: "organization",
    },
    {
      resource: "policies",
      actions: ["create", "read", "update"],
      scope: "organization",
    },
    {
      resource: "app_rules",
      actions: ["create", "read", "update", "delete"],
      scope: "organization",
    },
    {
      resource: "domain_rules",
      actions: ["create", "read", "update", "delete"],
      scope: "organization",
    },
    { resource: "screenshots", actions: ["read"], scope: "organization" },
    { resource: "analytics", actions: ["read"], scope: "organization" },
    { resource: "audit_logs", actions: ["read"], scope: "organization" },
    { resource: "settings", actions: ["read"], scope: "organization" },
    // No access to: billing, subscription, license, organization (delete), agent_versions
  ],
  TEAM_LEAD: [
    { resource: "employees", actions: ["read"], scope: "team" },
    { resource: "teams", actions: ["read", "update"], scope: "team" },
    { resource: "screenshots", actions: ["read"], scope: "team" },
    { resource: "analytics", actions: ["read"], scope: "team" },
    // No access to policies, app_rules, domain_rules, billing, etc.
  ],
}

// ================================
// SESSION MANAGEMENT
// ================================

/**
 * Get the current session from cookies
 */
export function getSession(): AuthSession | null {
  const sessionCookie = cookies().get("simple-session")

  if (!sessionCookie) {
    return null
  }

  try {
    const session = JSON.parse(sessionCookie.value) as AuthSession
    if (new Date(session.expires) <= new Date()) {
      return null
    }
    return session
  } catch {
    return null
  }
}

/**
 * Get the current user from session
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = getSession()
  return session?.user || null
}

/**
 * Check if user is a Super Admin (platform-level admin)
 */
export function isSuperAdmin(user: SessionUser | null): boolean {
  return user?.role === "SUPER_ADMIN"
}

/**
 * Check if user is an Owner of their current organization
 */
export function isOwner(user: SessionUser | null): boolean {
  return user?.organizationRole === "OWNER"
}

/**
 * Check if user is at least a Manager in their organization
 */
export function isManagerOrAbove(user: SessionUser | null): boolean {
  return (
    user?.organizationRole === "OWNER" || user?.organizationRole === "MANAGER"
  )
}

// ================================
// AUTHORIZATION CHECKS
// ================================

/**
 * Check if a role has permission for a specific action on a resource
 */
export function hasPermission(
  role: OrganizationRole,
  resource: Resource,
  action: Action
): boolean {
  const permissions = ROLE_PERMISSIONS[role]

  for (const perm of permissions) {
    // Check if resource matches
    const resourceMatch = perm.resource === "*" || perm.resource === resource

    // Check if action matches
    const actionMatch =
      perm.actions.includes("*") || perm.actions.includes(action)

    if (resourceMatch && actionMatch) {
      return true
    }
  }

  return false
}

/**
 * Get the scope of access for a role on a resource
 */
export function getAccessScope(
  role: OrganizationRole,
  resource: Resource
): Scope | null {
  const permissions = ROLE_PERMISSIONS[role]

  for (const perm of permissions) {
    if (perm.resource === "*" || perm.resource === resource) {
      return perm.scope
    }
  }

  return null
}

/**
 * Require that the current user is authenticated
 * Throws an error if not authenticated
 */
export async function requireAuth(): Promise<AuthSession> {
  const session = getSession()

  if (!session?.user) {
    throw new UnauthorizedError("Authentication required")
  }

  return session
}

/**
 * Require that the current user is a Super Admin
 * Throws an error if not a Super Admin
 */
export async function requireSuperAdmin(): Promise<AuthSession> {
  const session = await requireAuth()

  if (session.user.role !== "SUPER_ADMIN") {
    throw new ForbiddenError("Super Admin access required")
  }

  return session
}

/**
 * Require that the current user is an Owner of their organization
 * Compatible with existing code that uses requireOwner()
 */
export async function requireOwner(): Promise<AuthSession> {
  const session = await requireAuth()

  // Super Admin can act as owner
  if (session.user.role === "SUPER_ADMIN") {
    return session
  }

  if (session.user.organizationRole !== "OWNER") {
    throw new ForbiddenError("Owner access required")
  }

  return session
}

/**
 * Require that the current user is at least a Manager
 */
export async function requireManager(): Promise<AuthSession> {
  const session = await requireAuth()

  // Super Admin can act as manager
  if (session.user.role === "SUPER_ADMIN") {
    return session
  }

  if (!isManagerOrAbove(session.user)) {
    throw new ForbiddenError("Manager access required")
  }

  return session
}

/**
 * Require permission for a specific action on a resource
 */
export async function requirePermission(
  resource: Resource,
  action: Action,
  organizationId?: string
): Promise<AuthSession> {
  const session = await requireAuth()

  // Super Admin has all permissions
  if (session.user.role === "SUPER_ADMIN") {
    return session
  }

  // Must have an organization role
  if (!session.user.organizationRole) {
    throw new ForbiddenError("No organization access")
  }

  // Check organization match if specified
  if (organizationId && session.user.organizationId !== organizationId) {
    throw new ForbiddenError("Access denied to this organization")
  }

  // Check permission
  if (!hasPermission(session.user.organizationRole, resource, action)) {
    throw new ForbiddenError(`Permission denied: ${action} on ${resource}`)
  }

  return session
}

/**
 * Check if user can access a specific team's data
 */
export function canAccessTeam(user: SessionUser, teamId: string): boolean {
  // Super Admin can access all teams
  if (user.role === "SUPER_ADMIN") {
    return true
  }

  // Owner and Manager can access all teams in their org
  if (
    user.organizationRole === "OWNER" ||
    user.organizationRole === "MANAGER"
  ) {
    return true
  }

  // Team Lead can only access their assigned teams
  if (user.organizationRole === "TEAM_LEAD") {
    return user.teamIds?.includes(teamId) ?? false
  }

  return false
}

/**
 * Get the current user's organization ID (throws if not in an organization)
 */
export async function requireOrganization(): Promise<{
  session: AuthSession
  organizationId: string
}> {
  const session = await requireAuth()

  if (!session.user.organizationId) {
    throw new ForbiddenError("No organization context")
  }

  return { session, organizationId: session.user.organizationId }
}

// ================================
// USER LOADING WITH ORGANIZATION
// ================================

/**
 * Load full user details with organization membership
 * Used when creating sessions
 */
export async function loadUserWithOrganization(
  userId: string,
  organizationId?: string
): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      organizations: {
        where: organizationId ? { organizationId } : { isActive: true },
        include: {
          organization: true,
        },
        take: 1,
      },
    },
  })

  if (!user || !user.isActive) {
    return null
  }

  const orgMembership = user.organizations[0]

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as PlatformRole,
    organizationId: orgMembership?.organizationId,
    organizationRole: orgMembership?.role as OrganizationRole | undefined,
    organizationName: orgMembership?.organization.name,
    teamIds: orgMembership?.teamIds || [],
  }
}

/**
 * Load user by email with organization membership
 * Used during login
 */
export async function loadUserByEmailWithOrganization(
  email: string
): Promise<SessionUser | null> {
  const user = await prisma.user.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
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
  })

  if (!user) {
    return null
  }

  const orgMembership = user.organizations[0]

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as PlatformRole,
    organizationId: orgMembership?.organizationId,
    organizationRole: orgMembership?.role as OrganizationRole | undefined,
    organizationName: orgMembership?.organization.name,
    teamIds: orgMembership?.teamIds || [],
  }
}

/**
 * Get all organizations a user belongs to
 */
export async function getUserOrganizations(userId: string) {
  return prisma.organizationUser.findMany({
    where: { userId, isActive: true },
    include: {
      organization: true,
    },
  })
}

// ================================
// ERROR CLASSES
// ================================

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized access") {
    super(message)
    this.name = "UnauthorizedError"
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message)
    this.name = "ForbiddenError"
  }
}

// ================================
// LEGACY COMPATIBILITY
// ================================

/**
 * @deprecated Use isSuperAdmin() or check user.role instead
 */
export function isOwnerRole(userRole?: string): boolean {
  return userRole === "OWNER" || userRole === "SUPER_ADMIN"
}
