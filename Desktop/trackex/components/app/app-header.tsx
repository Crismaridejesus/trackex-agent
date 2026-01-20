'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User } from 'lucide-react'

interface AppHeaderProps {
  user: {
    id?: string
    email?: string | null
    name?: string | null
  }
}

export function AppHeader({ user }: Readonly<AppHeaderProps>) {

  const handleLogout = async () => {
    try {
      // Call our custom logout API
      await fetch('/api/auth/simple-logout', {
        method: 'POST',
      })
      
      // Force a hard navigation to clear any cached state
      window.location.href = '/'
    } catch (error) {
      console.error('Logout failed:', error)
      // Still redirect even if logout API fails
      window.location.href = '/'
    }
  }

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          {/* Breadcrumb or page title could go here */}
        </div>
        
        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="relative h-10 w-10 rounded-full bg-slate-900 hover:bg-slate-800 p-0 flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  {user.name && (
                    <p className="font-medium">{user.name}</p>
                  )}
                  {user.email && (
                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
