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

    const employees = await prisma.employee.findMany({
      where: { 
        teamId: params.id,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ employees })
  } catch (error) {
    console.error('Failed to fetch team members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    )
  }
}
