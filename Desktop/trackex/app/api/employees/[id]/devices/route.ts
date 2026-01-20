import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireOwner } from '@/lib/auth/rbac'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireOwner()

    const devices = await prisma.device.findMany({
      where: { 
        employeeId: params.id,
        isActive: true,
      },
      include: {
        tokens: {
          where: { isActive: true },
          select: {
            id: true,
            createdAt: true,
            lastUsed: true,
          },
        },
        _count: {
          select: {
            sessions: true,
            events: true,
          },
        },
      },
      orderBy: { lastSeen: 'desc' },
    })

    return NextResponse.json({ devices })
  } catch (error) {
    console.error('Failed to fetch employee devices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employee devices' },
      { status: 500 }
    )
  }
}
