'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Plus, Users, Trash2 } from 'lucide-react'
import { TeamDetailModal } from '@/components/app/team-detail-modal'
import { useTeams, useCreateTeam, useDeleteTeam } from '@/hooks/queries/use-teams'
import { ScrollableList } from '@/components/ui/scrollable-list'

export function TeamManagement() {
    const [newTeamName, setNewTeamName] = useState('')
    const { toast } = useToast()

    // Use custom hooks with optimistic updates
    const { data: teamsData, isLoading } = useTeams()
    
    const createTeamMutation = useCreateTeam()
    const deleteTeamMutation = useDeleteTeam()

    const handleCreateTeam = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newTeamName.trim()) return

        createTeamMutation.mutate(
            { name: newTeamName.trim() },
            {
                onSuccess: () => {
                    setNewTeamName('')
                    toast({
                        title: 'Team Created',
                        description: 'New team has been created successfully.',
                    })
                },
                onError: (error) => {
                    toast({
                        title: 'Error',
                        description: error instanceof Error ? error.message : 'Failed to create team',
                        variant: 'destructive',
                    })
                },
            }
        )
    }

    const handleDeleteTeam = (teamId: string) => {
        deleteTeamMutation.mutate(teamId, {
            onSuccess: () => {
                toast({
                    title: 'Team Deleted',
                    description: 'Team has been deleted successfully.',
                })
            },
            onError: (error) => {
                toast({
                    title: 'Error',
                    description: error instanceof Error ? error.message : 'Failed to delete team',
                    variant: 'destructive',
                })
            },
        })
    }

    const teams = teamsData?.teams || []

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Team Management
                </CardTitle>
                <CardDescription>
                    Create and manage teams for organizing employees
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Create Team Form */}
                <form onSubmit={handleCreateTeam} className="flex items-end space-x-4">
                    <div className="flex-1">
                        <Label htmlFor="teamName">Team Name</Label>
                        <Input
                            id="teamName"
                            value={newTeamName}
                            onChange={(e) => setNewTeamName(e.target.value)}
                            placeholder="Enter team name..."
                            className="mt-1"
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={!newTeamName.trim() || createTeamMutation.isPending}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Team
                    </Button>
                </form>

                {/* Teams List */}
                <div className="space-y-3">
                    <h4 className="text-sm font-medium">Existing Teams</h4>

                    {isLoading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={`team-management-skeleton-${i}`} className="h-12 bg-muted rounded animate-pulse" />
                            ))}
                        </div>
                    ) : teams.length > 0 ? (
                        <ScrollableList maxHeight="max-h-[400px]" className="space-y-2">
                            {teams.map((team: { id: string, name: string, defaultPolicy?: { id: string, name: string } | null, _count?: { employees: number } }) => (
                                <div
                                    key={team.id}
                                    className="flex items-center justify-between p-3 border rounded-lg"
                                >
                                    <TeamDetailModal team={team}>
                                        <div className="flex items-center space-x-3 cursor-pointer hover:bg-muted/50 p-2 -m-2 rounded">
                                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                                <Users className="h-4 w-4 text-primary" />
                                            </div>
                                            <div>
                                                <h5 className="font-medium text-primary hover:underline">{team.name}</h5>
                                                <p className="text-sm text-muted-foreground">
                                                    {team._count?.employees || 0} employees
                                                </p>
                                            </div>
                                        </div>
                                    </TeamDetailModal>

                                    <div className="flex items-center space-x-2">
                                        <Badge variant="outline">
                                            {team._count?.employees || 0} members
                                        </Badge>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteTeam(team.id)}
                                            disabled={deleteTeamMutation.isPending}
                                            className="text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </ScrollableList>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <h4 className="text-lg font-medium mb-2">No teams yet</h4>
                            <p className="text-sm">
                                Create your first team to start organizing employees
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
