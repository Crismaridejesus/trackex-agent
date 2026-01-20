'use client'

import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  Users, 
  Settings, 
  Eye, 
  Home,
  CreditCard,
  Shield,
  Building2,
  Key,
  Package
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  requiresOwner?: boolean
  requiresSuperAdmin?: boolean
}

const navigation: NavItem[] = [
  { name: 'Home', href: '/app', icon: Home },
  { name: 'Live View', href: '/app/live', icon: Eye },
  { name: 'Employees', href: '/app/employees', icon: Users },
  { name: 'Billing', href: '/app/billing', icon: CreditCard, requiresOwner: true },
  { name: 'Settings', href: '/app/settings', icon: Settings },
]

const adminNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/app/admin', icon: Shield, requiresSuperAdmin: true },
  { name: 'Organizations', href: '/app/admin/organizations', icon: Building2, requiresSuperAdmin: true },
  { name: 'Licenses', href: '/app/admin/licenses', icon: Key, requiresSuperAdmin: true },
  { name: 'Agent Versions', href: '/app/admin/agent-versions', icon: Package, requiresSuperAdmin: true },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userRole, setUserRole] = useState<string>('')
  const [orgRole, setOrgRole] = useState<string>('')

  useEffect(() => {
    // Fetch session from API since cookie is httpOnly
    async function fetchSession() {
      try {
        const response = await fetch('/api/auth/simple-session')
        const sessionData = await response.json()
        if (sessionData?.user) {
          setUserRole(sessionData.user.role || '')
          setOrgRole(sessionData.user.organizationRole || '')
        }
      } catch (e) {
        console.error('Failed to fetch session', e)
      }
    }
    fetchSession()
  }, [])

  const isSuperAdmin = userRole === 'SUPER_ADMIN'
  const isOwner = orgRole === 'OWNER' || isSuperAdmin

  // For SUPER_ADMIN users, don't show regular navigation items
  const filteredNavigation = isSuperAdmin ? [] : navigation.filter(item => {
    if (item.requiresOwner && !isOwner) return false
    if (item.requiresSuperAdmin && !isSuperAdmin) return false
    return true
  })

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900 relative z-50">
      <div className="flex flex-1 flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-xl font-bold text-white">Trackex</h1>
        </div>
        <nav className="mt-8 flex-1 px-2 space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/app' && pathname.startsWith(item.href))
            
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  console.log('Navigating to:', item.href);
                  router.push(item.href);
                }}
                className={cn(
                  'w-full text-left group flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer',
                  isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                )}
              >
                <item.icon
                  className={cn(
                    'mr-3 h-5 w-5 flex-shrink-0',
                    isActive
                      ? 'text-white'
                      : 'text-gray-400 group-hover:text-white'
                  )}
                />
                {item.name}
              </button>
            )
          })}

          {/* Super Admin Section */}
          {isSuperAdmin && (
            <>
              <div>
                <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Platform Admin
                </p>
              </div>
              {adminNavigation.map((item) => {
                // For /app/admin (Dashboard), only match exact path
                // For other admin routes, use startsWith
                const isActive = item.href === '/app/admin' 
                  ? pathname === '/app/admin'
                  : pathname.startsWith(item.href)
                
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => router.push(item.href)}
                    className={cn(
                      'w-full text-left group flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer',
                      isActive
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'mr-3 h-5 w-5 flex-shrink-0',
                        isActive
                          ? 'text-white'
                          : 'text-gray-400 group-hover:text-white'
                      )}
                    />
                    {item.name}
                  </button>
                )
              })}
            </>
          )}
        </nav>
      </div>
    </div>
  )
}
