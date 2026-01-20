import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

export interface CloudinaryUploadResult {
  public_id: string
  secure_url: string
  url: string
  width: number
  height: number
  format: string
  bytes: number
}

/**
 * Generate upload signature for desktop agent
 * This allows secure uploads from the desktop client
 */
export function generateUploadSignature(params: {
  timestamp: number
  folder?: string
  public_id?: string
}): { signature: string; timestamp: number; api_key: string } {
  const timestamp = params.timestamp || Math.round(Date.now() / 1000)

  const paramsToSign: Record<string, string | number> = {
    timestamp,
  }

  if (params.folder) paramsToSign.folder = params.folder
  if (params.public_id) paramsToSign.public_id = params.public_id

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!
  )

  return {
    signature,
    timestamp,
    api_key: process.env.CLOUDINARY_API_KEY!,
  }
}

/**
 * Get Cloudinary URL for a public ID with transformations
 */
export function getCloudinaryUrl(
  publicId: string,
  transformations?: {
    width?: number
    height?: number
    quality?: string | number
    format?: string
  }
): string {
  return cloudinary.url(publicId, {
    secure: true,
    ...transformations,
  })
}

/**
 * Delete a screenshot from Cloudinary
 */
export async function deleteCloudinaryImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId)
  } catch (error) {
    console.error('Failed to delete Cloudinary image:', publicId, error)
    throw error
  }
}

export default cloudinary
