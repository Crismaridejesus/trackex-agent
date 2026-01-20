/**
 * Tenant Context Module
 *
 * Provides utilities for multi-tenant data isolation in API routes.
 * Ensures all queries are scoped to the current organization.
 */

import type { AuthSession, SessionUser } from "@/lib/auth/rbac";
import {
  getSession
} from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";

// ================================
// TENANT CONTEXT TYPES
// ================================

export interface TenantContext {
  session: AuthSession
  organizationId: string
  user: SessionUser
  isSuperAdmin: boolean
}

// ================================
// TENANT SCOPED PRISMA CLIENT
// ================================

/**
 * Get tenant context from the current session
 * Returns null if not authenticated or no organization
 */
export async function getTenantContext(): Promise<TenantContext | null> {
  const session = getSession()

  if (!session?.user) {
    return null
  }

  // Super admins can access any org but need context for specific operations
  if (session.user.role === "SUPER_ADMIN") {
    // Fallback organization for super admins when none selected
    const fallbackOrgId =
      session.user.organizationId || (await getDefaultOrganizationId())
    return {
      session,
      organizationId: fallbackOrgId || "",
      user: session.user,
      isSuperAdmin: true,
    }
  }

  if (!session.user.organizationId) {
    return null
  }

  return {
    session,
    organizationId: session.user.organizationId,
    user: session.user,
    isSuperAdmin: false,
  }
}

/**
 * Require tenant context for API routes
 * Throws error if not authenticated or no organization
 */
export async function requireTenantContext(): Promise<TenantContext> {
  const context = await getTenantContext()

  if (!context) {
    throw new Error("Tenant context required")
  }

  // Non-super-admins must have an organization
  if (!context.isSuperAdmin && !context.organizationId) {
    throw new Error("No organization context")
  }

  return context
}

// ================================
// DEFAULT ORGANIZATION RESOLUTION
// ================================

/**
 * Resolve a default organization ID for super admins when no org is selected.
 * Priority:
 * 1) DEFAULT_ORG_ID env var
 * 2) Organization with slug "trackex"
 * 3) Organization with id "org_trackex_betatesting"
 * 4) If exactly one organization exists, use it
 */
async function getDefaultOrganizationId(): Promise<string | null> {
  const envDefault = process.env.DEFAULT_ORG_ID?.trim()
  if (envDefault) {
    const org = await prisma.organization.findUnique({
      where: { id: envDefault },
    })
    if (org) return org.id
  }
  // Try slug
  const bySlug = await prisma.organization.findUnique({
    where: { slug: "trackex" },
  })
  if (bySlug) return bySlug.id
  // Try known beta id
  const byId = await prisma.organization.findUnique({
    where: { id: "org_trackex_betatesting" },
  })
  if (byId) return byId.id
  // If only one org exists, use it
  const orgs = await prisma.organization.findMany({
    select: { id: true },
    take: 2,
  })
  if (orgs.length === 1) return orgs[0].id
  return null
}

// ================================
// TENANT SCOPED QUERIES
// ================================

/**
 * Add organization filter to a where clause
 */
export function withOrgFilter<T extends Record<string, any>>(
  where: T,
  organizationId: string
): T & { organizationId: string } {
  return {
    ...where,
    organizationId,
  }
}

/**
 * Create a tenant-scoped Prisma query helper
 *
 * Usage:
 * const tenant = await createTenantScope()
 * const employees = await tenant.employee.findMany({...})
 */
export async function createTenantScope(overrideOrgId?: string) {
  const context = await requireTenantContext()
  const orgId = overrideOrgId || context.organizationId

  // If super admin is overriding, verify org exists
  if (overrideOrgId && context.isSuperAdmin) {
    const org = await prisma.organization.findUnique({
      where: { id: overrideOrgId },
    })
    if (!org) {
      throw new Error("Organization not found")
    }
  }

  return {
    organizationId: orgId,
    isSuperAdmin: context.isSuperAdmin,
    user: context.user,
    session: context.session,

    // Helper to add org filter
    addOrgFilter<T extends Record<string, any>>(
      where: T
    ): T & { organizationId: string } {
      return { ...where, organizationId: orgId }
    },

    // Scoped query methods
    employee: {
      findMany: async (
        args: Parameters<typeof prisma.employee.findMany>[0] = {}
      ) => {
        return prisma.employee.findMany({
          ...args,
          where: { ...args?.where, organizationId: orgId },
        })
      },
      findFirst: async (
        args: Parameters<typeof prisma.employee.findFirst>[0] = {}
      ) => {
        return prisma.employee.findFirst({
          ...args,
          where: { ...args?.where, organizationId: orgId },
        })
      },
      findUnique: async (
        args: Parameters<typeof prisma.employee.findUnique>[0]
      ) => {
        const employee = await prisma.employee.findUnique(args)
        // Verify organization ownership
        if (
          employee &&
          employee.organizationId !== orgId &&
          !context.isSuperAdmin
        ) {
          return null
        }
        return employee
      },
      count: async (args: Parameters<typeof prisma.employee.count>[0] = {}) => {
        return prisma.employee.count({
          ...args,
          where: { ...args?.where, organizationId: orgId },
        })
      },
    },

    team: {
      findMany: async (
        args: Parameters<typeof prisma.team.findMany>[0] = {}
      ) => {
        return prisma.team.findMany({
          ...args,
          where: { ...args?.where, organizationId: orgId },
        })
      },
      findFirst: async (
        args: Parameters<typeof prisma.team.findFirst>[0] = {}
      ) => {
        return prisma.team.findFirst({
          ...args,
          where: { ...args?.where, organizationId: orgId },
        })
      },
      findUnique: async (
        args: Parameters<typeof prisma.team.findUnique>[0]
      ) => {
        const team = await prisma.team.findUnique(args)
        if (team && team.organizationId !== orgId && !context.isSuperAdmin) {
          return null
        }
        return team
      },
    },

    policy: {
      findMany: async (
        args: Parameters<typeof prisma.policy.findMany>[0] = {}
      ) => {
        return prisma.policy.findMany({
          ...args,
          where: { ...args?.where, organizationId: orgId },
        })
      },
      findFirst: async (
        args: Parameters<typeof prisma.policy.findFirst>[0] = {}
      ) => {
        return prisma.policy.findFirst({
          ...args,
          where: { ...args?.where, organizationId: orgId },
        })
      },
    },

    appRule: {
      findMany: async (
        args: Parameters<typeof prisma.appRule.findMany>[0] = {}
      ) => {
        // Include both org-specific and global rules
        return prisma.appRule.findMany({
          ...args,
          where: {
            ...args?.where,
            OR: [{ organizationId: orgId }, { isGlobal: true }],
          },
        })
      },
    },

    domainRule: {
      findMany: async (
        args: Parameters<typeof prisma.domainRule.findMany>[0] = {}
      ) => {
        // Include both org-specific and global rules
        return prisma.domainRule.findMany({
          ...args,
          where: {
            ...args?.where,
            OR: [{ organizationId: orgId }, { isGlobal: true }],
          },
        })
      },
    },

    license: {
      findMany: async (
        args: Parameters<typeof prisma.license.findMany>[0] = {}
      ) => {
        return prisma.license.findMany({
          ...args,
          where: { ...args?.where, organizationId: orgId },
        })
      },
      findUnique: async (
        args: Parameters<typeof prisma.license.findUnique>[0]
      ) => {
        const license = await prisma.license.findUnique(args)
        if (
          license &&
          license.organizationId !== orgId &&
          !context.isSuperAdmin
        ) {
          return null
        }
        return license
      },
    },

    auditLog: {
      findMany: async (
        args: Parameters<typeof prisma.auditLog.findMany>[0] = {}
      ) => {
        return prisma.auditLog.findMany({
          ...args,
          where: { ...args?.where, organizationId: orgId },
        })
      },
    },
  }
}

// ================================
// ENTITY OWNERSHIP VALIDATION
// ================================

/**
 * Verify that an employee belongs to the current organization
 */
export async function verifyEmployeeOwnership(
  employeeId: string,
  context: TenantContext
): Promise<boolean> {
  if (context.isSuperAdmin) {
    return true
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { organizationId: true },
  })

  return employee?.organizationId === context.organizationId
}

/**
 * Verify that a team belongs to the current organization
 */
export async function verifyTeamOwnership(
  teamId: string,
  context: TenantContext
): Promise<boolean> {
  if (context.isSuperAdmin) {
    return true
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { organizationId: true },
  })

  return team?.organizationId === context.organizationId
}

/**
 * Verify that a policy belongs to the current organization
 */
export async function verifyPolicyOwnership(
  policyId: string,
  context: TenantContext
): Promise<boolean> {
  if (context.isSuperAdmin) {
    return true
  }

  const policy = await prisma.policy.findUnique({
    where: { id: policyId },
    select: { organizationId: true },
  })

  return policy?.organizationId === context.organizationId
}

// ================================
// TEAM-LEVEL ACCESS FOR TEAM LEADS
// ================================

/**
 * Get team IDs that a user can access
 * - Super Admin / Owner / Manager: All teams in org
 * - Team Lead: Only assigned teams
 */
export function getAccessibleTeamIds(user: SessionUser): string[] | "all" {
  if (user.role === "SUPER_ADMIN") {
    return "all"
  }

  if (
    user.organizationRole === "OWNER" ||
    user.organizationRole === "MANAGER"
  ) {
    return "all"
  }

  if (user.organizationRole === "TEAM_LEAD") {
    return user.teamIds || []
  }

  return []
}

/**
 * Check if user can access data for a specific employee
 * Considers team-level access for Team Leads
 */
export async function canAccessEmployee(
  employeeId: string,
  context: TenantContext
): Promise<boolean> {
  // Super Admin can access all
  if (context.isSuperAdmin) {
    return true
  }

  // Owner and Manager can access all in their org
  if (
    context.user.organizationRole === "OWNER" ||
    context.user.organizationRole === "MANAGER"
  ) {
    return verifyEmployeeOwnership(employeeId, context)
  }

  // Team Lead can only access their team members
  if (context.user.organizationRole === "TEAM_LEAD") {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { organizationId: true, teamId: true },
    })

    if (!employee || employee.organizationId !== context.organizationId) {
      return false
    }

    // Check if employee is in one of the team lead's teams
    if (employee.teamId && context.user.teamIds?.includes(employee.teamId)) {
      return true
    }

    return false
  }

  return false
}

// ================================
// ORGANIZATION HELPERS
// ================================

/**
 * Get the current organization with subscription status
 */
export async function getCurrentOrganization(context: TenantContext) {
  return prisma.organization.findUnique({
    where: { id: context.organizationId },
    include: {
      subscription: true,
      _count: {
        select: {
          employees: { where: { isActive: true } },
          licenses: { where: { status: "ACTIVE" } },
        },
      },
    },
  })
}
