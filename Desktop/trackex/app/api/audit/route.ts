import { prisma } from "@/lib/db";
import { requireTenantContext } from "@/lib/tenant-context";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext()
    const { organizationId, isSuperAdmin } = context

    const { searchParams } = new URL(req.url)
    const action = searchParams.get("action")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    // Build organization filter
    const orgFilter = isSuperAdmin
      ? {} // Super admin can see all logs
      : { organizationId } // Regular users only see their org's logs

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        ...orgFilter,
        ...(action && { action }),
        ...(startDate &&
          endDate && {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }),
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    })

    // Manually fetch actor information based on actorType
    const enrichedLogs = await Promise.all(
      auditLogs.map(async (log) => {
        let actor = null

        if (log.actorId && log.actorType === "user") {
          // Fetch from User table
          const user = await prisma.user.findUnique({
            where: { id: log.actorId },
            select: { id: true, name: true, email: true },
          })
          actor = user
        } else if (log.actorId && log.actorType === "employee") {
          // Fetch from Employee table
          const employee = await prisma.employee.findUnique({
            where: { id: log.actorId },
            select: { id: true, name: true, email: true },
          })
          actor = employee
        } else if (log.actorId === "owner") {
          actor = {
            id: "owner",
            name: "Administrator",
            email: "admin@trackex.com",
          }
        }

        return {
          id: log.id,
          action: log.action,
          entityType: log.targetType,
          entityId: log.targetId,
          details: log.details,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          userId: log.actorId,
          user: actor,
          createdAt: log.createdAt,
        }
      })
    )

    const total = await prisma.auditLog.count({
      where: {
        ...orgFilter,
        ...(action && { action }),
        ...(startDate &&
          endDate && {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }),
      },
    })

    return NextResponse.json({
      logs: enrichedLogs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error("Failed to fetch audit logs:", error)
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    )
  }
}
