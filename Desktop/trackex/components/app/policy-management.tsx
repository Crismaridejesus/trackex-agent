'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { ScrollableList } from '@/components/ui/scrollable-list'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Shield, Trash2, Edit, Star, Clock, Camera } from 'lucide-react'
import { usePolicies, useCreatePolicy, useUpdatePolicy, useDeletePolicy } from '@/hooks/queries/use-policies'

interface Policy {
    id: string
    name: string
    idleThresholdS: number
    countIdleAsWork: boolean
    autoScreenshots: boolean
    screenshotInterval: number | null
    redactTitles: boolean
    browserDomainOnly: boolean
    isDefault: boolean
    _count: {
        employees: number
        teamsDefault: number
    }
}

interface PolicyFormData {
    name: string
    idleThresholdS: number
    countIdleAsWork: boolean
    autoScreenshots: boolean
    screenshotInterval: number | null
    redactTitles: boolean
    browserDomainOnly: boolean
    isDefault: boolean
}

const defaultFormData: PolicyFormData = {
    name: '',
    idleThresholdS: 120,
    countIdleAsWork: false,
    autoScreenshots: false,
    screenshotInterval: 30,
    redactTitles: false,
    browserDomainOnly: true,
    isDefault: false,
}

function PolicyForm({
    initialData,
    onSubmit,
    onCancel,
    isLoading,
}: {
    initialData?: Policy
    onSubmit: (data: PolicyFormData) => void
    onCancel: () => void
    isLoading: boolean
}) {
    const [formData, setFormData] = useState<PolicyFormData>({
        name: initialData?.name || defaultFormData.name,
        idleThresholdS: initialData?.idleThresholdS || defaultFormData.idleThresholdS,
        countIdleAsWork: initialData?.countIdleAsWork ?? defaultFormData.countIdleAsWork,
        autoScreenshots: initialData?.autoScreenshots ?? defaultFormData.autoScreenshots,
        screenshotInterval: initialData?.screenshotInterval ?? defaultFormData.screenshotInterval,
        redactTitles: initialData?.redactTitles ?? defaultFormData.redactTitles,
        browserDomainOnly: initialData?.browserDomainOnly ?? defaultFormData.browserDomainOnly,
        isDefault: initialData?.isDefault ?? defaultFormData.isDefault,
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit({
            ...formData,
            screenshotInterval: formData.autoScreenshots ? formData.screenshotInterval : null,
        })
    }

    // Convert seconds to minutes for display
    const idleMinutes = Math.round(formData.idleThresholdS / 60)

    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
                {/* Policy Name */}
                <div className="space-y-2">
                    <Label htmlFor="name">Policy Name</Label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Standard Policy"
                        required
                    />
                </div>

                {/* Default Policy Toggle */}
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="flex items-center">
                            <Star className="mr-2 h-4 w-4 text-yellow-500" />
                            Default Policy
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Automatically assign this policy to new teams
                        </p>
                    </div>
                    <Switch
                        checked={formData.isDefault}
                        onCheckedChange={(checked) =>
                            setFormData((prev) => ({ ...prev, isDefault: checked }))
                        }
                    />
                </div>

                {/* Idle Settings */}
                <div className="space-y-2">
                    <Label className="flex items-center">
                        <Clock className="mr-2 h-4 w-4" />
                        Idle Threshold
                    </Label>
                    <div className="flex items-center space-x-2">
                        <Input
                            type="number"
                            min={1}
                            max={60}
                            value={idleMinutes}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    idleThresholdS: parseInt(e.target.value) * 60,
                                }))
                            }
                            className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">minutes of inactivity</span>
                    </div>
                </div>

                {/* Count Idle as Work */}
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Count Idle as Work</Label>
                        <p className="text-sm text-muted-foreground">
                            Include idle time in productive hours
                        </p>
                    </div>
                    <Switch
                        checked={formData.countIdleAsWork}
                        onCheckedChange={(checked) =>
                            setFormData((prev) => ({ ...prev, countIdleAsWork: checked }))
                        }
                    />
                </div>

                {/* Auto Screenshots */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="flex items-center">
                                <Camera className="mr-2 h-4 w-4" />
                                Auto Screenshots
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Automatically capture screenshots periodically
                            </p>
                        </div>
                        <Switch
                            checked={formData.autoScreenshots}
                            onCheckedChange={(checked) =>
                                setFormData((prev) => ({ ...prev, autoScreenshots: checked }))
                            }
                        />
                    </div>

                    {formData.autoScreenshots && (
                        <div className="ml-6 space-y-2">
                            <Label>Screenshot Interval</Label>
                            <div className="flex items-center space-x-2">
                                <Input
                                    type="number"
                                    min={30}
                                    max={120}
                                    value={formData.screenshotInterval || 30}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            screenshotInterval: parseInt(e.target.value),
                                        }))
                                    }
                                    className="w-24"
                                />
                                <span className="text-sm text-muted-foreground">minutes</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Privacy Settings */}
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Redact Window Titles</Label>
                        <p className="text-sm text-muted-foreground">
                            Hide sensitive window title information
                        </p>
                    </div>
                    <Switch
                        checked={formData.redactTitles}
                        onCheckedChange={(checked) =>
                            setFormData((prev) => ({ ...prev, redactTitles: checked }))
                        }
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Browser Domain Only</Label>
                        <p className="text-sm text-muted-foreground">
                            Privacy mode: Only track domain names (e.g., github.com) instead of full URLs
                        </p>
                    </div>
                    <Switch
                        checked={formData.browserDomainOnly}
                        onCheckedChange={(checked) =>
                            setFormData((prev) => ({ ...prev, browserDomainOnly: checked }))
                        }
                    />
                </div>
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading || !formData.name.trim()}>
                    {isLoading ? 'Saving...' : initialData ? 'Update Policy' : 'Create Policy'}
                </Button>
            </DialogFooter>
        </form>
    )
}

export function PolicyManagement() {
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null)
    const { toast } = useToast()

    // Use custom hooks with optimistic updates
    const { data: policiesData, isLoading } = usePolicies()
    const createMutation = useCreatePolicy()
    const updateMutation = useUpdatePolicy()
    const deleteMutation = useDeletePolicy()

    const handleCreate = (data: PolicyFormData) => {
        createMutation.mutate(data, {
            onSuccess: () => {
                setCreateDialogOpen(false)
                toast({
                    title: 'Policy Created',
                    description: 'New policy has been created successfully.',
                })
            },
            onError: (error) => {
                toast({
                    title: 'Error',
                    description: error instanceof Error ? error.message : 'Failed to create policy',
                    variant: 'destructive',
                })
            },
        })
    }

    const handleUpdate = (id: string, data: Partial<PolicyFormData>) => {
        updateMutation.mutate({ id, data }, {
            onSuccess: () => {
                setEditingPolicy(null)
                toast({
                    title: 'Policy Updated',
                    description: 'Policy has been updated successfully.',
                })
            },
            onError: (error) => {
                toast({
                    title: 'Error',
                    description: error instanceof Error ? error.message : 'Failed to update policy',
                    variant: 'destructive',
                })
            },
        })
    }

    const handleDelete = (id: string) => {
        deleteMutation.mutate(id, {
            onSuccess: () => {
                toast({
                    title: 'Policy Deleted',
                    description: 'Policy has been deleted successfully.',
                })
            },
            onError: (error) => {
                toast({
                    title: 'Error',
                    description: error instanceof Error ? error.message : 'Failed to delete policy',
                    variant: 'destructive',
                })
            },
        })
    }

    const policies: Policy[] = policiesData?.policies || []

    const formatIdleThreshold = (seconds: number) => {
        const minutes = Math.round(seconds / 60)
        return `${minutes} min`
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center">
                            <Shield className="mr-2 h-5 w-5" />
                            Policy Management
                        </CardTitle>
                        <CardDescription>
                            Create and manage tracking policies for teams and employees
                        </CardDescription>
                    </div>
                    <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Policy
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Create New Policy</DialogTitle>
                                <DialogDescription>
                                    Configure tracking settings for this policy
                                </DialogDescription>
                            </DialogHeader>
                            <PolicyForm
                                onSubmit={handleCreate}
                                onCancel={() => setCreateDialogOpen(false)}
                                isLoading={createMutation.isPending}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={`policy-skeleton-${i}`} className="h-16 bg-muted rounded animate-pulse" />
                        ))}
                    </div>
                ) : policies.length > 0 ? (
                    <ScrollableList maxHeight="max-h-[400px]" className="space-y-3">
                        {policies.map((policy) => (
                            <div
                                key={policy.id}
                                className="flex items-center justify-between p-4 border rounded-lg"
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                        <Shield className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <h5 className="font-medium">{policy.name}</h5>
                                            {policy.isDefault && (
                                                <Badge variant="secondary" className="text-xs">
                                                    <Star className="mr-1 h-3 w-3 text-yellow-500" />
                                                    Default
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-3 text-sm text-muted-foreground mt-1">
                                            <span>Idle: {formatIdleThreshold(policy.idleThresholdS)}</span>
                                            {policy.autoScreenshots && (
                                                <span className="flex items-center">
                                                    <Camera className="mr-1 h-3 w-3" />
                                                    Every {policy.screenshotInterval} min
                                                </span>
                                            )}
                                            {policy.redactTitles && (
                                                <Badge variant="outline" className="text-xs">
                                                    Titles Redacted
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Badge variant="outline">
                                        {policy._count.employees} employees
                                    </Badge>
                                    <Badge variant="outline">
                                        {policy._count.teamsDefault} teams
                                    </Badge>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditingPolicy(policy)}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            if (policy._count.employees > 0 || policy._count.teamsDefault > 0) {
                                                toast({
                                                    title: 'Cannot Delete',
                                                    description: 'This policy is in use by employees or teams.',
                                                    variant: 'destructive',
                                                })
                                                return
                                            }
                                            handleDelete(policy.id)
                                        }}
                                        disabled={deleteMutation.isPending}
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
                        <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <h4 className="text-lg font-medium mb-2">No policies yet</h4>
                        <p className="text-sm">
                            Create your first policy to configure tracking settings
                        </p>
                    </div>
                )}
            </CardContent>

            {/* Edit Dialog */}
            <Dialog open={!!editingPolicy} onOpenChange={(open) => !open && setEditingPolicy(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Policy</DialogTitle>
                        <DialogDescription>
                            Update tracking settings for this policy
                        </DialogDescription>
                    </DialogHeader>
                    {editingPolicy && (
                        <PolicyForm
                            initialData={editingPolicy}
                            onSubmit={(data) => handleUpdate(editingPolicy.id, data)}
                            onCancel={() => setEditingPolicy(null)}
                            isLoading={updateMutation.isPending}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    )
}
