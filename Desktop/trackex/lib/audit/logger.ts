import { getSession } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

export type AuditAction =
  // Policy & Rules
  | "policy_create"
  | "policy_update"
  | "policy_delete"
  | "app_rule_create"
  | "app_rule_update"
  | "app_rule_delete"
  | "domain_rule_create"
  | "domain_rule_update"
  | "domain_rule_delete"
  // Employee Management
  | "employee_create"
  | "employee_update"
  | "employee_delete"
  | "employee_login"
  | "employee_credentials_reset"
  // Team Management
  | "team_create"
  | "team_update"
  | "team_delete"
  // Session & Device
  | "session_edit"
  | "device_register"
  | "device_token_generate"
  | "device_token_revoke"
  // Screenshots & Monitoring
  | "screenshot_request"
  | "screenshot_view"
  // Exports
  | "export_home_analytics"
  | "export_employee_sessions"
  | "export_app_usage"
  // Agent Versions
  | "agent_version_create"
  | "agent_version_update"
  | "agent_version_delete"
  | "agent_version_toggle"
  // User & Authentication
  | "user_login"
  | "user_logout"
  | "user_register"
  | "user_password_change"
  | "user_role_change"
  // Organization
  | "organization_create"
  | "organization_update"
  | "organization_delete"
  | "organization_settings_update"
  // Licensing
  | "license_activate"
  | "license_deactivate"
  | "license_manual_activate"
  | "license_beta_bypass"
  | "license_expired"
  // Subscription & Payments
  | "subscription_create"
  | "subscription_update"
  | "subscription_cancel"
  | "subscription_reactivate"
  | "payment_success"
  | "payment_failed"
  | "checkout_started"
  | "checkout_completed"
  // Stripe Webhooks
  | "stripe_webhook"

interface AuditLogData {
  action: AuditAction
  organizationId: string
  targetType?: string
  targetId?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: Record<string, any> | string | null
  ipAddress?: string
  userAgent?: string
}

export async function logAuditEvent(data: AuditLogData, req?: NextRequest) {
  try {
    const session = getSession()

    // Validate organizationId is provided
    if (!data.organizationId) {
      throw new Error('organizationId is required for audit logging')
    }

    const auditLog = await prisma.auditLog.create({
      data: {
        organizationId: data.organizationId,
        action: data.action,
        actorId: session?.user?.id || null,
        actorType: session?.user?.id
          ? session.user.role === "SUPER_ADMIN"
            ? "super_admin"
            : "user"
          : "system",
        targetType: data.targetType,
        targetId: data.targetId,
        details:
          typeof data.details === "string"
            ? data.details
            : JSON.stringify(data.details),
        ipAddress: data.ipAddress || getClientIP(req),
        userAgent: data.userAgent || req?.headers.get("user-agent"),
      },
    })

    return auditLog
  } catch (error) {
    console.error("Failed to log audit event:", error)
    // Don't throw - audit logging should not break main functionality
  }
}

/**
 * Log a system event (no user context)
 */
export async function logSystemEvent(
  action: AuditAction,
  organizationId: string,
  targetType: string,
  targetId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: Record<string, any>
) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId,
        action,
        actorType: "system",
        targetType,
        targetId,
        details: JSON.stringify(details),
      },
    })
  } catch (error) {
    console.error("Failed to log system event:", error)
  }
}

/**
 * Log a license-related event
 */
export async function logLicenseEvent(
  action:
    | "license_activate"
    | "license_deactivate"
    | "license_manual_activate"
    | "license_beta_bypass"
    | "license_expired",
  licenseId: string,
  employeeId: string,
  organizationId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: Record<string, any>,
  req?: NextRequest
) {
  return logAuditEvent(
    {
      action,
      organizationId,
      targetType: "License",
      targetId: licenseId,
      details: {
        employeeId,
        ...details,
      },
    },
    req
  )
}

/**
 * Log a payment-related event
 */
export async function logPaymentEvent(
  action:
    | "payment_success"
    | "payment_failed"
    | "subscription_create"
    | "subscription_update"
    | "subscription_cancel",
  organizationId: string,
  subscriptionId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: Record<string, any>
) {
  return logSystemEvent(
    action,
    organizationId,
    "Subscription",
    subscriptionId,
    details
  )
}

function getClientIP(req?: NextRequest): string | null {
  if (!req) return null

  const forwarded = req.headers.get("x-forwarded-for")
  const realIP = req.headers.get("x-real-ip")

  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }

  if (realIP) {
    return realIP
  }

  return null
}

/**
 * Get recent audit logs for an organization
 */
export async function getOrganizationAuditLogs(
  organizationId: string,
  options: {
    limit?: number
    offset?: number
    actions?: AuditAction[]
    targetType?: string
  } = {}
) {
  const { limit = 50, offset = 0, actions, targetType } = options

  return prisma.auditLog.findMany({
    where: {
      organizationId,
      ...(actions?.length ? { action: { in: actions } } : {}),
      ...(targetType ? { targetType } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  })
}

/**
 * Get audit logs for Super Admin (all organizations)
 */
export async function getSystemAuditLogs(
  options: {
    limit?: number
    offset?: number
    actions?: AuditAction[]
    targetType?: string
    organizationId?: string
  } = {}
) {
  const {
    limit = 50,
    offset = 0,
    actions,
    targetType,
    organizationId,
  } = options

  return prisma.auditLog.findMany({
    where: {
      ...(organizationId ? { organizationId } : {}),
      ...(actions?.length ? { action: { in: actions } } : {}),
      ...(targetType ? { targetType } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
    include: {
      organization: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  })
}
