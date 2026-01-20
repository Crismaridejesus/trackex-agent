import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireOwner } from '@/lib/auth/rbac'
import { logAuditEvent } from '@/lib/audit/logger'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

function generateSimplePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let password = ''
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireOwner()

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      select: { id: true, email: true, organizationId: true }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const newPassword = generateSimplePassword()
    const hashed = await bcrypt.hash(newPassword, 10)

    await prisma.employee.update({
      where: { id: params.id },
      data: { password: hashed }
    })

    await logAuditEvent({
      action: 'employee_credentials_reset',
      organizationId: employee.organizationId,
      targetType: 'Employee',
      targetId: employee.id,
      details: JSON.stringify({ email: employee.email })
    }, req)

    return NextResponse.json({ ok: true, email: employee.email, password: newPassword })
  } catch (error) {
    console.error('Failed to generate credentials:', error)
    return NextResponse.json({ error: 'Failed to generate credentials' }, { status: 500 })
  }
}


