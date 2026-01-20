import { logAuditEvent } from "@/lib/audit/logger";
import { requireOwner } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { editSessionSchema } from "@/lib/validations/employee";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireOwner()

    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const sessions = await prisma.workSession.findMany({
      where: {
        employeeId: params.id,
        ...(startDate &&
          endDate && {
            clockIn: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }),
      },
      include: {
        device: true,
      },
      orderBy: { clockIn: "desc" },
    })

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error("Failed to fetch employee sessions:", error)
    return NextResponse.json(
      { error: "Failed to fetch employee sessions" },
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
    const { sessionId, ...sessionData } = body
    const validatedData = editSessionSchema.parse(sessionData)

    const existingSession = await prisma.workSession.findUnique({
      where: { id: sessionId },
    })

    if (!existingSession || existingSession.employeeId !== params.id) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const updatedSession = await prisma.workSession.update({
      where: { id: sessionId },
      data: {
        ...validatedData,
        editedBy: session.user.id,
        editedAt: new Date(),
      },
      include: {
        device: true,
        employee: true,
      },
    })

    await logAuditEvent(
      {
        action: "session_edit",
        organizationId: updatedSession.employee.organizationId,
        targetType: "WorkSession",
        targetId: sessionId,
        details: {
          employeeName: updatedSession.employee.name,
          editReason: validatedData.editReason,
          changes: validatedData,
        },
      },
      req
    )

    return NextResponse.json({ session: updatedSession })
  } catch (error) {
    console.error("Failed to edit session:", error)
    return NextResponse.json(
      { error: "Failed to edit session" },
      { status: 500 }
    )
  }
}
