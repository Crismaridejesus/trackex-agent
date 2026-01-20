import { requireDeviceAuth } from '@/lib/auth/device';
import { generateUploadSignature } from '@/lib/cloudinary';
import { validateAgentVersion } from '@/lib/version-validator';
import { format } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = "force-dynamic"

/**
 * Generate Cloudinary upload signature for desktop agents
 * This enables secure signed uploads from the desktop client
 */
export async function POST(req: NextRequest) {
  try {
    // CRITICAL: Validate version FIRST before ANY database operations
    const versionError = validateAgentVersion(req)
    if (versionError) return versionError

    // Authenticate device (throws on failure)
    const authResult = await requireDeviceAuth(req)

    const body = await req.json()
    const { employeeId, deviceId } = body

    // Verify device ownership
    if (
      authResult.device.id !== deviceId ||
      authResult.device.employeeId !== employeeId
    ) {
      return NextResponse.json({ error: "Device mismatch" }, { status: 403 })
    }

    const timestamp = Math.round(Date.now() / 1000)
    const folder = `trackex/screenshots/${employeeId}/${format(new Date(), "yyyy-MM-dd")}`

    const signatureData = generateUploadSignature({
      timestamp,
      folder,
    })

    return NextResponse.json({
      ...signatureData,
      folder,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      upload_url: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    })
  } catch (error) {
    console.error("Failed to generate upload signature:", error)
    return NextResponse.json(
      { error: "Failed to generate upload signature" },
      { status: 500 }
    )
  }
}
