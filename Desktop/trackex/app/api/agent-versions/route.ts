import { broadcastAgentUpdateNotification } from "@/lib/agent-update-stream"
import { logAuditEvent } from "@/lib/audit/logger"
import { requireSuperAdmin } from "@/lib/auth/rbac"
import { prisma } from "@/lib/db"
import { createAgentVersionSchema } from "@/lib/validations/agent-version"
import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await requireSuperAdmin()

    const versions = await prisma.agentVersion.findMany({
      orderBy: [{ releasedAt: "desc" }, { version: "desc" }],
    })

    return NextResponse.json({ versions })
  } catch (error) {
    console.error("Failed to fetch agent versions:", error)

    if (error instanceof Error && error.message === "Owner access required") {
      return NextResponse.json(
        { error: "Unauthorized - Owner access required" },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: "Failed to fetch agent versions" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSuperAdmin()

    const body = await req.json()
    const validatedData = createAgentVersionSchema.parse(body)

    // Check for duplicate version + platform + arch combination
    const existing = await prisma.agentVersion.findFirst({
      where: {
        version: validatedData.version,
        platform: validatedData.platform,
        arch: validatedData.arch,
      },
    })

    if (existing) {
      return NextResponse.json(
        {
          error: `Version ${validatedData.version} for ${validatedData.platform}-${validatedData.arch} already exists`,
        },
        { status: 409 }
      )
    }

    const version = await prisma.agentVersion.create({
      data: {
        version: validatedData.version,
        platform: validatedData.platform,
        arch: validatedData.arch,
        downloadUrl: validatedData.downloadUrl,
        signature: validatedData.signature,
        releaseNotes: validatedData.releaseNotes,
        isActive: validatedData.isActive ?? true,
        mandatory: validatedData.mandatory ?? false,
        fileSize: validatedData.fileSize ?? null,
        releasedAt: validatedData.releasedAt
          ? new Date(validatedData.releasedAt)
          : new Date(),
      },
    })

    await logAuditEvent(
      {
        action: "agent_version_create",
        organizationId: session.user.organizationId || "SYSTEM",
        targetType: "AgentVersion",
        targetId: version.id,
        details: {
          version: version.version,
          platform: version.platform,
          arch: version.arch,
        },
      },
      req
    )

    // Notify connected agents about the new version
    broadcastAgentUpdateNotification({
      type: "version_created",
      timestamp: new Date().toISOString(),
      platform: version.platform,
      arch: version.arch,
      version: version.version,
      mandatory: version.mandatory,
    })

    return NextResponse.json({ version }, { status: 201 })
  } catch (error) {
    console.error("Failed to create agent version:", error)

    if (error instanceof Error && error.message === "Owner access required") {
      return NextResponse.json(
        { error: "Unauthorized - Owner access required" },
        { status: 403 }
      )
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create agent version" },
      { status: 500 }
    )
  }
}
