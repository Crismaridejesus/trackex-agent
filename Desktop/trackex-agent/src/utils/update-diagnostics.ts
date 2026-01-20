import { invoke } from '@tauri-apps/api/core'

/**
 * Update System Diagnostic Tool
 * 
 * This script helps diagnose issues with the auto-update system.
 * Run it from the browser console when the agent is running.
 */

interface UpdateInfo {
  available: boolean
  version?: string
  notes?: string
  current_version: string
  release_date?: string
  error?: string
  diagnostic_info?: string
}

export async function runUpdateDiagnostics() {
  console.log('🔍 Running Auto-Update System Diagnostics...\n')

  // 1. Get current version
  console.log('1️⃣ Getting current version...')
  try {
    const version = await invoke<string>('get_current_version')
    console.log(`✅ Current version: ${version}\n`)
  } catch (error) {
    console.error(`❌ Failed to get version: ${error}\n`)
  }

  // 2. Test update endpoint connectivity
  console.log('2️⃣ Testing update endpoint connectivity...')
  try {
    const result = await invoke<string>('test_update_endpoint')
    console.log(`✅ ${result}\n`)
  } catch (error) {
    console.error(`❌ ${error}\n`)
  }

  // 3. Check for updates
  console.log('3️⃣ Checking for updates...')
  try {
    const updateInfo = await invoke<UpdateInfo>('check_for_updates')
    
    if (updateInfo.error) {
      console.log(`⚠️ Update check returned an error:`)
      console.log(`   Error: ${updateInfo.error}`)
      console.log(`   Diagnostic: ${updateInfo.diagnostic_info}`)
    } else if (updateInfo.available) {
      console.log(`✅ Update available!`)
      console.log(`   Current: ${updateInfo.current_version}`)
      console.log(`   Latest: ${updateInfo.version}`)
      console.log(`   Release date: ${updateInfo.release_date}`)
      if (updateInfo.notes) {
        console.log(`   Release notes:\n${updateInfo.notes}`)
      }
    } else {
      console.log(`✅ No update available`)
      console.log(`   Current version: ${updateInfo.current_version}`)
      if (updateInfo.diagnostic_info) {
        console.log(`   Info: ${updateInfo.diagnostic_info}`)
      }
    }
  } catch (error) {
    console.error(`❌ Failed to check for updates: ${error}`)
  }

  console.log('\n✨ Diagnostics complete!')
}

// Auto-run when imported in dev mode
if (import.meta.env.DEV) {
  console.log('💡 Update diagnostics available. Run: runUpdateDiagnostics()')
}

// Export for use in components
export default runUpdateDiagnostics
