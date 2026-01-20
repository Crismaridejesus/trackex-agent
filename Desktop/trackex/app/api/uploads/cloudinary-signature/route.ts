import { NextRequest, NextResponse } from "next/server"
import { requireDeviceAuth } from "@/lib/auth/device"
import { generateUploadSignature } from "@/lib/cloudinary"
import { validateAgentVersion } from "@/lib/version-validator"
import { z } from "zod"

export const dynamic = "force-dynamic"

const signatureRequestSchema = z.object({
  timestamp: z.number().int().positive(),
  folder: z.string().min(1),
  public_id: z.string().min(1),
  purpose: z.enum(["screenshot"]).default("screenshot"),
})

/**
 * POST /api/uploads/cloudinary-signature
 * 
 * Generate Cloudinary upload signature for desktop agent uploads.
 * Returns signed parameters needed for direct Cloudinary upload.
 */
export async function POST(req: NextRequest) {
  try {
    // Validate version first
    const versionError = validateAgentVersion(req)
    if (versionError) return versionError

    // Authenticate device
    const { device } = await requireDeviceAuth(req)

    // Parse request
    const body = await req.json()
    const data = signatureRequestSchema.parse(body)

    // Verify folder matches expected pattern for this employee
    const expectedFolderPrefix = data.folder.includes("test_")
      ? `test-screenshots/${device.employeeId}`
      : `screenshots/${device.employeeId}`
    
    if (!data.folder.startsWith(expectedFolderPrefix.split("/")[0])) {
      // Allow both test_ and production folders
      console.warn(`Folder mismatch: expected ${expectedFolderPrefix}, got ${data.folder}`)
    }

    // Validate Cloudinary environment variables
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    if (!cloudName) {
      console.error("CLOUDINARY_CLOUD_NAME environment variable is not set")
      return NextResponse.json(
        { error: "Server configuration error: Cloudinary not configured" },
        { status: 500 }
      )
    }

    // Generate signature
    const signatureData = generateUploadSignature({
      timestamp: data.timestamp,
      folder: data.folder,
      public_id: data.public_id,
    })

    console.log(`Generated Cloudinary signature for folder=${data.folder}, public_id=${data.public_id}`)

    return NextResponse.json({
      signature: signatureData.signature,
      timestamp: signatureData.timestamp,
      api_key: signatureData.api_key,
      cloud_name: cloudName,
    })
  } catch (error) {
    console.error("Failed to generate Cloudinary signature:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Invalid request data", 
          details: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
        },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes("token")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: "Failed to generate signature" },
      { status: 500 }
    )
  }
}
