import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireOwner } from '@/lib/auth/rbac'
import { logAuditEvent } from '@/lib/audit/logger'
import { updateTeamSchema } from '@/lib/validations/team'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireOwner()

    const team = await prisma.team.findUnique({
      where: { id: params.id },
      include: {
        defaultPolicy: true,
        _count: {
          select: {
            employees: {
              where: { isActive: true },
            },
          },
        },
      },
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ team })
  } catch (error) {
    console.error('Failed to fetch team:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireOwner()

    const body = await req.json()
    const validatedData = updateTeamSchema.parse(body)

    const existingTeam = await prisma.team.findUnique({
      where: { id: params.id },
    })

    if (!existingTeam) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    const team = await prisma.team.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        defaultPolicy: true,
        _count: {
          select: {
            employees: {
              where: { isActive: true },
            },
          },
        },
      },
    })

    await logAuditEvent({
      action: 'team_update',
      organizationId: team.organizationId,
      targetType: 'Team',
      targetId: team.id,
      details: {
        teamName: team.name,
        changes: validatedData,
      },
    }, req)

    return NextResponse.json({ team })
  } catch (error) {
    console.error('Failed to update team:', error)
    return NextResponse.json(
      { error: 'Failed to update team' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireOwner()

    const { id } = params

    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
      },
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // If team has employees, reassign them to no team before deletion
    if (team._count.employees > 0) {
      await prisma.employee.updateMany({
        where: { teamId: id },
        data: { teamId: null },
      })
    }

    // Delete the team
    await prisma.team.delete({
      where: { id },
    })

    await logAuditEvent({
      action: 'team_delete',
      organizationId: team.organizationId,
      targetType: 'Team',
      targetId: id,
      details: JSON.stringify({ teamName: team.name }),
    }, req)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete team:', error)
    return NextResponse.json(
      { error: 'Failed to delete team' },
      { status: 500 }
    )
  }
}