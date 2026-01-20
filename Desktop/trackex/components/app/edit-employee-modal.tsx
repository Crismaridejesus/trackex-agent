'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as React from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
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
import { queryKeys } from '@/lib/query-keys'
import { employeesApi } from '@/lib/api/employees.api'
import { teamsApi } from '@/lib/api/teams.api'

interface EditEmployeeModalProps {
    employeeId: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function EditEmployeeModal({ employeeId, open, onOpenChange, onSuccess }: Readonly<EditEmployeeModalProps>) {
    const queryClient = useQueryClient()
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        teamId: 'no-team'
    })
    const [errors, setErrors] = useState<{ [key: string]: string }>({})

    // Fetch employee data
    const { data: employeeData } = useQuery({
        queryKey: queryKeys.employees.detail(employeeId),
        queryFn: () => employeesApi.get(employeeId),
        enabled: open && !!employeeId,
    })

    // Fetch teams
    const { data: teamsData } = useQuery({
        queryKey: queryKeys.teams.all,
        queryFn: teamsApi.list,
        enabled: open,
    })

    const teams = teamsData?.teams || []

    // Sync form data when employee data loads
    useEffect(() => {
        if (employeeData?.employee) {
            setFormData({
                name: employeeData.employee.name,
                email: employeeData.employee.email,
                teamId: employeeData.employee.teamId || 'no-team'
            })
        }
    }, [employeeData])

    // Update employee mutation
    const updateMutation = useMutation({
        mutationFn: (data: { name: string; email: string; teamId: string | null }) => 
            employeesApi.update(employeeId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.employees.all })
            queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(employeeId) })
            queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })
            onOpenChange(false)
            onSuccess()
        },
        onError: () => {
            setErrors({ submit: 'Failed to update employee' })
        },
    })

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

        updateMutation.mutate({
            name: formData.name,
            email: formData.email,
            teamId: formData.teamId === 'no-team' ? null : formData.teamId
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Employee</DialogTitle>
                    <DialogDescription>
                        Update employee information and team assignment.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                            id="name"
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
                        <Label htmlFor="team">Team</Label>
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
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? 'Updating...' : 'Update Employee'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
