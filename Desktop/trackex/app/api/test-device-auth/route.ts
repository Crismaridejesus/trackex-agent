import { NextRequest, NextResponse } from 'next/server'
import { requireDeviceAuth } from '@/lib/auth/device'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { device } = await requireDeviceAuth(req)
    return NextResponse.json({ 
      success: true,
      deviceId: device.id,
      employeeId: device.employeeId 
    })
  } catch (error) {
    console.error('Device auth test error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 401 }
    )
  }
}


