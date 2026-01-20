import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireOwner } from '@/lib/auth/rbac'
import { logAuditEvent } from '@/lib/audit/logger'
import { updatePolicySchema } from '@/lib/validations/policy'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireOwner()

    const policy = await prisma.policy.findUnique({
      where: { id: params.id },
      include: {
        employees: {
          where: { isActive: true },
          select: { id: true, name: true, email: true },
        },
        teamsDefault: {
          select: { id: true, name: true },
        },
      },
    })

    if (!policy) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ policy })
  } catch (error) {
    console.error('Failed to fetch policy:', error)
    return NextResponse.json(
      { error: 'Failed to fetch policy' },
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
    const validatedData = updatePolicySchema.parse(body)

    const existingPolicy = await prisma.policy.findUnique({
      where: { id: params.id },
    })

    if (!existingPolicy) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      )
    }

    // If setting this policy as default, unset any other default policies first
    if (validatedData.isDefault === true) {
      await prisma.policy.updateMany({
        where: { 
          isDefault: true,
          id: { not: params.id }
        },
        data: { isDefault: false },
      })
    }

    const policy = await prisma.policy.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        _count: {
          select: {
            employees: true,
            teamsDefault: true,
          },
        },
      },
    })

    await logAuditEvent({
      action: 'policy_update',
      organizationId: policy.organizationId,
      targetType: 'Policy',
      targetId: policy.id,
      details: { 
        policyName: policy.name,
        changes: validatedData,
      },
    }, req)

    return NextResponse.json({ policy })
  } catch (error) {
    console.error('Failed to update policy:', error)
    return NextResponse.json(
      { error: 'Failed to update policy' },
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

    const policy = await prisma.policy.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { 
            employees: true,
            teamsDefault: true,
          },
        },
      },
    })

    if (!policy) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      )
    }

    if (policy._count.employees > 0 || policy._count.teamsDefault > 0) {
      return NextResponse.json(
        { error: 'Cannot delete policy that is in use' },
        { status: 400 }
      )
    }

    await prisma.policy.delete({
      where: { id: params.id },
    })

    await logAuditEvent({
      action: 'policy_delete',
      organizationId: policy.organizationId,
      targetType: 'Policy',
      targetId: policy.id,
      details: { policyName: policy.name },
    }, req)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete policy:', error)
    return NextResponse.json(
      { error: 'Failed to delete policy' },
      { status: 500 }
    )
  }
}
