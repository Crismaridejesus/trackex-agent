'use client'

import { useState } from 'react'
import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'

interface CreateTeamModalProps {
    children?: React.ReactNode
    onTeamCreated?: () => void
}

export function CreateTeamModal({ children, onTeamCreated }: Readonly<CreateTeamModalProps>) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [teamName, setTeamName] = useState('')
    const [error, setError] = useState('')
    const queryClient = useQueryClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!teamName.trim()) {
            setError('Team name is required')
            return
        }

        setIsLoading(true)
        setError('')

        try {
            const response = await fetch('/api/teams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: teamName.trim() })
            })

            if (response.ok) {
                setTeamName('')
                setOpen(false)

                // Invalidate all teams queries to refresh all dropdowns
                queryClient.invalidateQueries({ queryKey: ['teams'] })

                onTeamCreated?.()
                // Show success (you could add a toast here if needed)
            } else {
                setError('Failed to create team')
            }
        } catch (error) {
            console.error('Failed to create team:', error)
            setError('Failed to create team')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Team
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create Team</DialogTitle>
                    <DialogDescription>
                        Create a new team to organize your employees.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="teamName">Team Name</Label>
                        <Input
                            id="teamName"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            placeholder="Enter team name"
                            required
                        />
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || !teamName.trim()}
                        >
                            {isLoading ? 'Creating...' : 'Create Team'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
