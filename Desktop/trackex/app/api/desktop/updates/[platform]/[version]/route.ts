import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Tauri Updater API Endpoint
 * 
 * This endpoint is called by the tauri-plugin-updater to check for available updates.
 * The URL format is: /api/desktop/updates/{platform}-{arch}/{current_version}
 * 
 * For example:
 * - /api/desktop/updates/darwin-aarch64/1.0.3
 * - /api/desktop/updates/windows-x86_64/1.0.3
 * 
 * Returns the Tauri update manifest format:
 * {
 *   version: "1.0.4",
 *   notes: "Release notes here",
 *   pub_date: "2026-01-15T10:00:00Z",
 *   platforms: {
 *     "darwin-aarch64": {
 *       signature: "...",
 *       url: "https://..."
 *     }
 *   }
 * }
 * 
 * Returns 204 No Content if no update is available.
 */

interface TauriUpdateResponse {
  version: string
  notes: string
  pub_date: string
  mandatory: boolean
  platforms: {
    [platform: string]: {
      signature: string
      url: string
    }
  }
}

// Compare semantic versions: returns positive if a > b, negative if a < b, 0 if equal
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number)
  const partsB = b.split('.').map(Number)
  
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0
    const numB = partsB[i] || 0
    if (numA > numB) return 1
    if (numA < numB) return -1
  }
  return 0
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string; version: string }> }
) {
  try {
    const { platform: platformArch, version: currentVersion } = await params
    
    // Platform format: "darwin-aarch64" or "windows-x86_64"
    const parts = platformArch.split('-')
    if (parts.length < 2) {
      return NextResponse.json(
        { error: 'Invalid platform format. Expected: platform-arch (e.g., darwin-aarch64)' },
        { status: 400 }
      )
    }
    
    const platform = parts[0] // "darwin" or "windows"
    const arch = parts.slice(1).join('-') // "aarch64" or "x86_64"
    
    console.log(`[Update Check] Platform: ${platform}, Arch: ${arch}, Current: ${currentVersion}`)
    
    // Find the latest active version for this platform/arch
    const latestVersion = await prisma.agentVersion.findFirst({
      where: {
        platform: platform,
        arch: arch,
        isActive: true,
      },
      orderBy: {
        releasedAt: 'desc',
      },
    })
    
    if (!latestVersion) {
      console.warn(`[Update Check] No version found for ${platform}-${arch}. Database may need seeding.`)
      // Return 204 No Content - Tauri treats this as "no update available"
      // Tauri updater only accepts: 200 with valid JSON manifest, or 204 for no update
      // Any other status code (like 404) is treated as an error
      return new NextResponse(null, { 
        status: 204,
        headers: {
          'X-Update-Status': 'no-versions-in-database',
          'X-Platform': platformArch,
        }
      })
    }
    
    console.log(`[Update Check] Latest version in DB: ${latestVersion.version}, Current: ${currentVersion}`)
    
    // Compare versions - only update if latest is newer than current
    const comparison = compareVersions(latestVersion.version, currentVersion)
    
    if (comparison <= 0) {
      console.log(`[Update Check] No update needed: ${currentVersion} >= ${latestVersion.version}`)
      // Return 204 No Content - standard Tauri response for "no update available"
      return new NextResponse(null, { 
        status: 204,
        headers: {
          'X-Update-Status': 'already-latest',
          'X-Current-Version': currentVersion,
          'X-Latest-Version': latestVersion.version,
        }
      })
    }
    
    console.log(`[Update Check] Update available: ${currentVersion} -> ${latestVersion.version}`)
    
    // Build the Tauri update response
    const response: TauriUpdateResponse = {
      version: latestVersion.version,
      notes: latestVersion.releaseNotes,
      pub_date: latestVersion.releasedAt.toISOString(),
      mandatory: latestVersion.mandatory,
      platforms: {
        [platformArch]: {
          signature: latestVersion.signature,
          url: latestVersion.downloadUrl,
        },
      },
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('[Update Check] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}

