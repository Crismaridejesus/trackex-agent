/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { ScrollableList } from '@/components/ui/scrollable-list'
import { Users, UserPlus, UserMinus, Eye } from 'lucide-react'
import Link from 'next/link'
import { queryKeys } from '@/lib/query-keys'
import { teamsApi, TeamDetailResponse, TeamMembersResponse } from '@/lib/api/teams.api'
import { employeesApi, Employee } from '@/lib/api/employees.api'
import { policiesApi, Policy } from '@/lib/api/policies.api'

interface TeamDetailModalProps {
    children?: React.ReactNode
    team: {
        id: string
        name: string
        defaultPolicy?: { id: string, name: string } | null
        _count?: { employees: number }
    }
}

export function TeamDetailModal({ children, team }: Readonly<TeamDetailModalProps>) {
    const [open, setOpen] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState('')
    const [selectedPolicy, setSelectedPolicy] = useState<string>(team.defaultPolicy?.id || 'no-policy')
    const queryClient = useQueryClient()

    // Fetch team details
    const { data: teamData, isLoading: isLoadingTeam } = useQuery({
        queryKey: queryKeys.teams.detail(team.id),
        queryFn: () => teamsApi.getById(team.id),
        enabled: open,
    })

    // Fetch team members
    const { data: membersData, isLoading: isLoadingMembers } = useQuery({
        queryKey: ['teams', team.id, 'members'],
        queryFn: () => teamsApi.getMembers(team.id),
        enabled: open,
    })

    // Fetch available employees (not in this team)
    const { data: availableEmployeesData, isLoading: isLoadingEmployees } = useQuery({
        queryKey: [...queryKeys.employees.all, 'exclude', team.id],
        queryFn: () => employeesApi.getAll({ excludeTeam: team.id }),
        enabled: open,
    })

    // Fetch all policies
    const { data: policiesData, isLoading: isLoadingPolicies } = useQuery({
        queryKey: queryKeys.policies.all,
        queryFn: policiesApi.list,
        enabled: open,
    })

    const currentPolicy = (teamData as TeamDetailResponse)?.team?.defaultPolicy || null
    const teamMembers = (membersData as TeamMembersResponse)?.employees || []
    const availableEmployees = availableEmployeesData?.employees || []
    const policies: { id: string; name: string }[] = policiesData?.policies || []
    const isLoading = isLoadingTeam || isLoadingMembers || isLoadingEmployees || isLoadingPolicies

    // Sync selected policy when team data loads
    useEffect(() => {
        if ((teamData as TeamDetailResponse)?.team?.defaultPolicy) {
            setSelectedPolicy((teamData as TeamDetailResponse).team.defaultPolicy?.id || 'no-policy')
        }
    }, [teamData])

    // Mutation to add employee to team
    const addEmployeeMutation = useMutation({
        mutationFn: (employeeId: string) => 
            employeesApi.update(employeeId, { teamId: team.id }),
        onSuccess: () => {
            setSelectedEmployee('')
            queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })
            queryClient.invalidateQueries({ queryKey: queryKeys.teams.detail(team.id) })
            queryClient.invalidateQueries({ queryKey: ['teams', team.id, 'members'] })
            queryClient.invalidateQueries({ queryKey: queryKeys.employees.all })
        },
    })

    // Mutation to remove employee from team
    const removeEmployeeMutation = useMutation({
        mutationFn: (employeeId: string) => 
            employeesApi.update(employeeId, { teamId: null }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })
            queryClient.invalidateQueries({ queryKey: queryKeys.teams.detail(team.id) })
            queryClient.invalidateQueries({ queryKey: ['teams', team.id, 'members'] })
            queryClient.invalidateQueries({ queryKey: queryKeys.employees.all })
        },
    })

    // Mutation to update team policy
    const updatePolicyMutation = useMutation({
        mutationFn: (policyId: string | null) => 
            teamsApi.update(team.id, { defaultPolicyId: policyId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })
            queryClient.invalidateQueries({ queryKey: queryKeys.teams.detail(team.id) })
        },
        onError: () => {
            // Reset selection on error
            setSelectedPolicy(currentPolicy?.id || 'no-policy')
        },
    })

    const addEmployeeToTeam = () => {
        if (!selectedEmployee) return
        addEmployeeMutation.mutate(selectedEmployee)
    }

    const removeEmployeeFromTeam = (employeeId: string) => {
        removeEmployeeMutation.mutate(employeeId)
    }

    const updateTeamPolicy = () => {
        if (selectedPolicy === (currentPolicy?.id || 'no-policy')) {
            return // No change
        }
        updatePolicyMutation.mutate(selectedPolicy === 'no-policy' ? null : selectedPolicy)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {team.name}
                    </DialogTitle>
                    <DialogDescription>
                        Manage team members and assignments
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Policy Configuration Section */}
                    <Card>
                        <CardContent className="p-4">
                            <h4 className="font-medium mb-3">Team Policy</h4>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span className="font-medium">Current Policy:</span>
                                    {currentPolicy ? (
                                        <Badge variant="outline">{currentPolicy.name}</Badge>
                                    ) : (
                                        <Badge variant="secondary">No Policy</Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <Select value={selectedPolicy} onValueChange={setSelectedPolicy}>
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Select a policy..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="no-policy">No Policy</SelectItem>
                                            {policies.map((policy) => (
                                                <SelectItem key={policy.id} value={policy.id}>
                                                    {policy.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        onClick={updateTeamPolicy}
                                        disabled={selectedPolicy === (currentPolicy?.id || 'no-policy') || updatePolicyMutation.isPending || isLoading}
                                        size="sm"
                                    >
                                        {updatePolicyMutation.isPending ? 'Updating...' : 'Update'}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Add Employee Section */}
                    <Card>
                        <CardContent className="p-4">
                            <h4 className="font-medium mb-3">Add Employee to Team</h4>
                            <div className="flex items-center gap-3">
                                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Select an employee..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableEmployees.map((employee) => (
                                            <SelectItem key={employee.id} value={employee.id}>
                                                {employee.name} ({employee.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    onClick={addEmployeeToTeam}
                                    disabled={!selectedEmployee || addEmployeeMutation.isPending}
                                    size="sm"
                                >
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    {addEmployeeMutation.isPending ? 'Adding...' : 'Add'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Team Members Section */}
                    <Card>
                        <CardContent className="p-4">
                            <h4 className="font-medium mb-3">
                                Team Members ({teamMembers.length})
                            </h4>

                            {isLoading ? (
                                <div className="text-center py-4 text-muted-foreground">
                                    Loading team members...
                                </div>
                            ) : teamMembers.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No team members yet</p>
                                    <p className="text-sm">Add employees to this team using the form above</p>
                                </div>
                            ) : (
                                <ScrollableList maxHeight="max-h-[400px]" className="space-y-3">
                                    {teamMembers.map((member) => (
                                        <div
                                            key={member.id}
                                            className="flex items-center justify-between p-3 border rounded-lg"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                                    <Users className="h-4 w-4 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{member.name}</p>
                                                    <p className="text-sm text-muted-foreground">{member.email}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <Badge variant={member.isActive ? "default" : "secondary"}>
                                                    {member.isActive ? "Active" : "Inactive"}
                                                </Badge>

                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={`/app/employees/${member.id}`}>
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeEmployeeFromTeam(member.id)}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <UserMinus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </ScrollableList>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="flex justify-end pt-4">
                    <Button onClick={() => setOpen(false)}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
