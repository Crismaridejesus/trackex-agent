import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOwner } from "@/lib/auth/rbac"
import { logAuditEvent } from "@/lib/audit/logger"
import { updateAgentVersionSchema } from "@/lib/validations/agent-version"
import { broadcastAgentUpdateNotification } from "@/lib/agent-update-stream"
import { ZodError } from "zod"

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireOwner()

    const version = await prisma.agentVersion.findUnique({
      where: { id: params.id },
    })

    if (!version) {
      return NextResponse.json(
        { error: "Agent version not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ version })
  } catch (error) {
    console.error("Failed to fetch agent version:", error)

    if (error instanceof Error && error.message === "Owner access required") {
      return NextResponse.json(
        { error: "Unauthorized - Owner access required" },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: "Failed to fetch agent version" },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireOwner()

    const body = await req.json()
    const validatedData = updateAgentVersionSchema.parse(body)

    // Check if version exists
    const existing = await prisma.agentVersion.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Agent version not found" },
        { status: 404 }
      )
    }

    // If updating version/platform/arch, check for duplicates
    if (
      validatedData.version ||
      validatedData.platform ||
      validatedData.arch
    ) {
      const duplicate = await prisma.agentVersion.findFirst({
        where: {
          id: { not: params.id },
          version: validatedData.version ?? existing.version,
          platform: validatedData.platform ?? existing.platform,
          arch: validatedData.arch ?? existing.arch,
        },
      })

      if (duplicate) {
        return NextResponse.json(
          {
            error: `Version ${validatedData.version ?? existing.version} for ${validatedData.platform ?? existing.platform}-${validatedData.arch ?? existing.arch} already exists`,
          },
          { status: 409 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (validatedData.version !== undefined) updateData.version = validatedData.version
    if (validatedData.platform !== undefined) updateData.platform = validatedData.platform
    if (validatedData.arch !== undefined) updateData.arch = validatedData.arch
    if (validatedData.downloadUrl !== undefined) updateData.downloadUrl = validatedData.downloadUrl
    if (validatedData.signature !== undefined) updateData.signature = validatedData.signature
    if (validatedData.releaseNotes !== undefined) updateData.releaseNotes = validatedData.releaseNotes
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive
    if (validatedData.mandatory !== undefined) updateData.mandatory = validatedData.mandatory
    if (validatedData.fileSize !== undefined) updateData.fileSize = validatedData.fileSize
    if (validatedData.releasedAt !== undefined) updateData.releasedAt = new Date(validatedData.releasedAt)

    const version = await prisma.agentVersion.update({
      where: { id: params.id },
      data: updateData,
    })

    await logAuditEvent(
      {
        action: "agent_version_update",
        organizationId: session.user.organizationId || "SYSTEM",
        targetType: "AgentVersion",
        targetId: version.id,
        details: {
          version: version.version,
          platform: version.platform,
          arch: version.arch,
          updates: Object.keys(updateData),
        },
      },
      req
    )

    // Notify connected agents about the version update
    broadcastAgentUpdateNotification({
      type: 'version_update',
      timestamp: new Date().toISOString(),
      platform: version.platform,
      arch: version.arch,
      version: version.version,
      mandatory: version.mandatory,
    })

    return NextResponse.json({ version })
  } catch (error) {
    console.error("Failed to update agent version:", error)

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
      { error: "Failed to update agent version" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireOwner()

    const version = await prisma.agentVersion.findUnique({
      where: { id: params.id },
    })

    if (!version) {
      return NextResponse.json(
        { error: "Agent version not found" },
        { status: 404 }
      )
    }

    await prisma.agentVersion.delete({
      where: { id: params.id },
    })

    await logAuditEvent(
      {
        action: "agent_version_delete",
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

    // Notify connected agents about the version deletion
    broadcastAgentUpdateNotification({
      type: 'version_deleted',
      timestamp: new Date().toISOString(),
      platform: version.platform,
      arch: version.arch,
      version: version.version,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete agent version:", error)

    if (error instanceof Error && error.message === "Owner access required") {
      return NextResponse.json(
        { error: "Unauthorized - Owner access required" },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: "Failed to delete agent version" },
      { status: 500 }
    )
  }
}
