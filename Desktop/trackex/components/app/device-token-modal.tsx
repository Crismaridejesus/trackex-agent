'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Key, Copy, Check } from 'lucide-react'
import { api } from '@/lib/api/client'

type ViewMode = 'idle' | 'credentials'

interface DeviceTokenModalProps {
  children?: React.ReactNode
  employeeId: string
  employeeName: string
  employeeEmail: string
}

export function DeviceTokenModal({ children, employeeId, employeeName }: Readonly<DeviceTokenModalProps>) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<ViewMode>('idle')
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    if (view === 'credentials' && credentials) {
      const text = `Login credentials for ${employeeName}\n\nEmail: ${credentials.email}\nPassword: ${credentials.password}`
      await navigator.clipboard.writeText(text)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const credentialsMutation = useMutation({
    mutationFn: () => api.post<{ email: string; password: string }>(`/api/employees/${employeeId}/credentials`, {}),
    onSuccess: (data) => {
      setCredentials({ email: data.email, password: data.password })
      setView('credentials')
    },
  })

  const generateCredentials = () => {
    credentialsMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={(e) => e.stopPropagation()}
          >
            <Key className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent 
        className="sm:max-w-[600px]"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Login Credentials</DialogTitle>
          <DialogDescription>View and copy credentials for {employeeName}.</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {view === 'idle' && (
            <div className="text-center py-4">
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    generateCredentials();
                  }} 
                  disabled={credentialsMutation.isPending}
                >
                  {credentialsMutation.isPending ? 'Generating…' : 'Show Login Credentials'}
                </Button>
            </div>
          )}

          {view === 'credentials' && credentials && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Login Credentials</h4>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard();
                    }} 
                    className="gap-2"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <div className="text-sm space-y-1">
                  <p><strong>Email:</strong> {credentials.email}</p>
                  <p><strong>Password:</strong> <code className="bg-background px-2 py-1 rounded text-xs">{credentials.password}</code></p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                setCredentials(null);
                setView('idle');
                setCopied(false);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
