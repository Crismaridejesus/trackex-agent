'use client'

import { useState, useEffect } from 'react'
import * as React from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Plus, Copy, Check, User } from 'lucide-react'
import { useCreateEmployee } from '@/hooks/queries/use-employees'
import { useTeams } from '@/hooks/queries/use-teams'

interface AddEmployeeModalProps {
    children?: React.ReactNode
}

function generateConsistentPassword(email: string): string {
    // Generate a consistent password based on the email
    // This ensures the same email always generates the same password
    const hash = email.split('').reduce((acc, char) => {
        return ((acc << 5) - acc) + char.charCodeAt(0)
    }, 0)

    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let password = 'Tx'  // Prefix for Trackex

    // Generate 8 characters based on the hash
    for (let i = 0; i < 8; i++) {
        const index = Math.abs((hash * (i + 1)) % chars.length)
        password += chars.charAt(index)
    }

    return password
}

export function AddEmployeeModal({ children }: Readonly<AddEmployeeModalProps>) {
    const [open, setOpen] = useState(false)

    // Simple form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        teamId: 'no-team'
    })
    const [errors, setErrors] = useState<{ [key: string]: string }>({})
    const [createdEmployee, setCreatedEmployee] = useState<{
        id: string
        name: string
        email: string
        password: string
    } | null>(null)
    const [copied, setCopied] = useState(false)

    // Use custom hooks
    const { data: teamsData, refetch: refetchTeams } = useTeams({ enabled: open })
    const createEmployeeMutation = useCreateEmployee()

    const teams = teamsData?.teams || []

    // Refetch teams when modal opens
    useEffect(() => {
        if (open) {
            refetchTeams()
        }
    }, [open, refetchTeams])

    const copyCredentials = async () => {
        if (!createdEmployee) return

        const credentials = `Employee Login Credentials:

Email: ${createdEmployee.email}
Password: ${createdEmployee.password}

Please use these credentials to log into the desktop application.`

        await navigator.clipboard.writeText(credentials)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleDialogChange = (nextOpen: boolean) => {
        setOpen(nextOpen)
        if (!nextOpen) {
            setCreatedEmployee(null)
            setCopied(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrors({})

        // Basic validation
        if (!formData.name.trim()) {
            setErrors({ name: 'Name is required' })
            return
        }
        if (!formData.email.trim()) {
            setErrors({ email: 'Email is required' })
            return
        }

        // Generate a consistent password based on email
        const generatedPassword = generateConsistentPassword(formData.email)

        createEmployeeMutation.mutate(
            {
                name: formData.name,
                email: formData.email,
                password: generatedPassword,
                teamId: formData.teamId === 'no-team' ? undefined : formData.teamId
            },
            {
                onSuccess: (result) => {
                    // Show credentials screen
                    setCreatedEmployee({
                        id: result.employee.id,
                        name: formData.name,
                        email: formData.email,
                        password: generatedPassword
                    })

                    // Reset form
                    setFormData({ name: '', email: '', teamId: 'no-team' })
                    setErrors({})
                },
                onError: (error) => {
                    setErrors({ submit: error instanceof Error ? error.message : 'Failed to create employee' })
                },
            }
        )
    }

    return (
        <Dialog open={open} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
                {children || (
                    <Button data-testid="employees-add-button" onClick={() => handleDialogChange(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Employee
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]" data-testid="open-add-employee">
                <DialogHeader>
                    <DialogTitle>
                        {createdEmployee ? 'Employee Created Successfully' : 'Add Employee'}
                    </DialogTitle>
                    <DialogDescription>
                        {createdEmployee
                            ? 'Send these login credentials to the new employee.'
                            : 'Create a new employee account with automatically generated password.'
                        }
                    </DialogDescription>
                </DialogHeader>

                {createdEmployee ? (
                    // Credentials screen
                    <div className="space-y-4">
                        <div className="flex items-center justify-center py-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                <User className="h-8 w-8 text-green-600" />
                            </div>
                        </div>

                        <div className="text-center">
                            <h3 className="text-lg font-medium">{createdEmployee.name}</h3>
                            <p className="text-sm text-muted-foreground">{createdEmployee.email}</p>
                        </div>

                        <div className="bg-muted p-4 rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm">Login Credentials</h4>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={copyCredentials}
                                    className="gap-2"
                                >
                                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    {copied ? 'Copied!' : 'Copy'}
                                </Button>
                            </div>

                            <div className="text-sm space-y-2">
                                <p><strong>Email:</strong> {createdEmployee.email}</p>
                                <p><strong>Password:</strong> <code className="bg-background px-2 py-1 rounded text-xs">{createdEmployee.password}</code></p>
                            </div>

                            <div className="text-xs text-muted-foreground">
                                <p>Send these credentials to the employee so they can log into the desktop application.</p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button data-testid="close-add-employee" onClick={() => handleDialogChange(false)}>
                                Done
                            </Button>
                        </div>
                    </div>
                ) : (
                    // Employee creation form
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                data-testid="add-employee-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Enter full name"
                            />
                            {errors.name && (
                                <p className="text-sm text-destructive">{errors.name}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                data-testid="add-employee-email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="Enter email address"
                            />
                            {errors.email && (
                                <p className="text-sm text-destructive">{errors.email}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="team">Team (Optional)</Label>
                            <Select
                                value={formData.teamId || "no-team"}
                                onValueChange={(value) => setFormData({ ...formData, teamId: value === "no-team" ? "" : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a team" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="no-team">No Team</SelectItem>
                                    {teams.map((team: { id: string, name: string }) => (
                                        <SelectItem key={team.id} value={team.id}>
                                            {team.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {errors.submit && (
                            <p className="text-sm text-destructive">{errors.submit}</p>
                        )}

                        <div className="flex justify-end space-x-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                data-testid="cancel-add-employee"
                                onClick={() => setOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                data-testid="add-employee-submit"
                                disabled={createEmployeeMutation.isPending}
                            >
                                {createEmployeeMutation.isPending ? 'Creating...' : 'Create Employee'}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
