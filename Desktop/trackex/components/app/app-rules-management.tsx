'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Edit, Trash2, ChevronUp, ChevronDown, Zap } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ScrollableList } from '@/components/ui/scrollable-list'
import { 
    useAppRules, 
    useCreateAppRule, 
    useUpdateAppRule, 
    useDeleteAppRule,
    useTestAppRule 
} from '@/hooks/queries/use-app-rules'

interface AppRule {
    id: string
    matcherType: string
    value: string
    category: string
    priority: number
    isActive: boolean
    createdAt: string
    updatedAt: string
}

export function AppRulesManagement() {
    const { toast } = useToast()
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [editingRule, setEditingRule] = useState<AppRule | null>(null)
    const [deletingRule, setDeletingRule] = useState<AppRule | null>(null)
    const [testDialogOpen, setTestDialogOpen] = useState(false)
    const [testingRule, setTestingRule] = useState<{ matcherType: string; value: string } | null>(null)
    const [testAppName, setTestAppName] = useState('')

    // Use custom hooks with optimistic updates
    const { data, isLoading, error } = useAppRules()
    const createMutation = useCreateAppRule()
    const updateMutation = useUpdateAppRule()
    const deleteMutation = useDeleteAppRule()
    const testMutation = useTestAppRule()

    // Wrap mutations with toast notifications
    const handleCreate = (rule: Omit<AppRule, 'id' | 'createdAt' | 'updatedAt'>) => {
        createMutation.mutate(rule as { matcherType: 'exact' | 'contains' | 'regex' | 'prefix' | 'suffix'; value: string; category: 'PRODUCTIVE' | 'NEUTRAL' | 'DISTRACTING'; priority?: number; isActive?: boolean }, {
            onSuccess: () => {
                setCreateDialogOpen(false)
                toast({ title: 'Success', description: 'App rule created successfully' })
            },
            onError: () => {
                toast({ title: 'Error', description: 'Failed to create app rule', variant: 'destructive' })
            },
        })
    }

    const handleUpdate = (id: string, rule: Partial<AppRule>) => {
        updateMutation.mutate({ id, data: rule as { matcherType?: 'exact' | 'contains' | 'regex' | 'prefix' | 'suffix'; value?: string; category?: 'PRODUCTIVE' | 'NEUTRAL' | 'DISTRACTING'; priority?: number; isActive?: boolean } }, {
            onSuccess: () => {
                setEditDialogOpen(false)
                toast({ title: 'Success', description: 'App rule updated successfully' })
            },
            onError: () => {
                toast({ title: 'Error', description: 'Failed to update app rule', variant: 'destructive' })
            },
        })
    }

    const handleDelete = (id: string) => {
        deleteMutation.mutate(id, {
            onSuccess: () => {
                toast({ title: 'Success', description: 'App rule deleted successfully' })
            },
            onError: () => {
                toast({ title: 'Error', description: 'Failed to delete app rule', variant: 'destructive' })
            },
        })
    }

    const handleTest = (rule: { matcherType: string; value: string }, testApp: string) => {
        testMutation.mutate({ rule, appName: testApp }, {
            onSuccess: (data) => {
                toast({
                    title: data.matches ? 'Match Found!' : 'No Match',
                    description: data.matches
                        ? `"${testApp}" matches this rule`
                        : `"${testApp}" does not match this rule`,
                })
            },
            onError: () => {
                toast({ title: 'Error', description: 'Failed to test app rule', variant: 'destructive' })
            },
        })
    }

    const handlePriorityChange = async (rule: AppRule, direction: 'up' | 'down') => {
        const rules = data?.rules || []
        const currentIndex = rules.findIndex((r: AppRule) => r.id === rule.id)

        if (
            (direction === 'up' && currentIndex === 0) ||
            (direction === 'down' && currentIndex === rules.length - 1)
        ) {
            return
        }

        const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
        const currentPriority = rules[currentIndex].priority
        const swapPriority = rules[swapIndex].priority

        await updateMutation.mutateAsync({ id: rules[currentIndex].id, data: { priority: swapPriority } })
        await updateMutation.mutateAsync({ id: rules[swapIndex].id, data: { priority: currentPriority } })
    }

    if (isLoading) {
        return <AppRulesManagementSkeleton />
    }

    if (error) {
        return (
            <Card>
                <CardContent className="p-6">
                    <p className="text-destructive">Failed to load app rules</p>
                </CardContent>
            </Card>
        )
    }

    const rules = data?.rules || []

    const unproductiveRules = rules.filter((r: AppRule) => r.category === 'UNPRODUCTIVE')
    const productiveRules = rules.filter((r: AppRule) => r.category === 'PRODUCTIVE')
    const neutralRules = rules.filter((r: AppRule) => r.category === 'NEUTRAL')

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                        <Zap className="mr-2 h-5 w-5" />
                        App Rules
                    </div>
                    <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="mr-2 h-4 w-4" />
                                Add Rule
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <AppRuleForm
                                onSubmit={(rule) => handleCreate(rule)}
                                onCancel={() => setCreateDialogOpen(false)}
                            />
                        </DialogContent>
                    </Dialog>
                </CardTitle>
                <CardDescription>
                    Define rules to automatically categorize applications as productive, neutral, or unproductive
                </CardDescription>
            </CardHeader>
            <CardContent>
                {rules.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant="destructive">
                            {unproductiveRules.length} Unproductive
                        </Badge>
                        <Badge variant="default">
                            {productiveRules.length} Productive
                        </Badge>
                        <Badge variant="secondary">
                            {neutralRules.length} Neutral
                        </Badge>
                    </div>
                )}
                {rules.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No app rules configured</p>
                        <p className="text-sm">Add rules to automatically categorize applications</p>
                    </div>
                ) : (
                    <ScrollableList maxHeight="max-h-[500px]" className="space-y-2">
                        {rules.map((rule: AppRule, index: number) => (
                            <div
                                key={rule.id}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="flex flex-col space-y-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={index === 0}
                                            onClick={() => handlePriorityChange(rule, 'up')}
                                        >
                                            <ChevronUp className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={index === rules.length - 1}
                                            onClick={() => handlePriorityChange(rule, 'down')}
                                        >
                                            <ChevronDown className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <p className="font-medium">{rule.value}</p>
                                            <Badge variant="outline">{rule.matcherType}</Badge>
                                            <Badge
                                                variant={
                                                    rule.category === 'PRODUCTIVE'
                                                        ? 'default'
                                                        : rule.category === 'NEUTRAL'
                                                            ? 'secondary'
                                                            : 'destructive'
                                                }
                                            >
                                                {rule.category}
                                            </Badge>
                                            {!rule.isActive && <Badge variant="outline">Inactive</Badge>}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Priority: {rule.priority}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setTestingRule({ matcherType: rule.matcherType, value: rule.value })
                                            setTestDialogOpen(true)
                                        }}
                                    >
                                        Test
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setEditingRule(rule)
                                            setEditDialogOpen(true)
                                        }}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setDeletingRule(rule)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </ScrollableList>
                )}
            </CardContent>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    {editingRule && (
                        <AppRuleForm
                            rule={editingRule}
                            onSubmit={(rule) => handleUpdate(editingRule.id, rule)}
                            onCancel={() => {
                                setEditDialogOpen(false)
                                setEditingRule(null)
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Test App Rule</DialogTitle>
                        <DialogDescription>
                            Test if an application name matches this rule
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Rule</Label>
                            <p className="text-sm text-muted-foreground">
                                {testingRule?.matcherType}: {testingRule?.value}
                            </p>
                        </div>
                        <div>
                            <Label htmlFor="test-app">Application Name</Label>
                            <Input
                                id="test-app"
                                value={testAppName}
                                onChange={(e) => setTestAppName(e.target.value)}
                                placeholder="e.g., Slack, Chrome, VS Code"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                if (testingRule && testAppName) {
                                    handleTest(testingRule, testAppName)
                                }
                            }}
                            disabled={!testAppName}
                        >
                            Test Rule
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletingRule} onOpenChange={() => setDeletingRule(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete App Rule?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the rule for{' '}
                            <strong>{deletingRule?.value}</strong>?
                            <br /><br />
                            This action cannot be undone and may affect how applications are categorized.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (deletingRule) {
                                    handleDelete(deletingRule.id)
                                    setDeletingRule(null)
                                }
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete Rule
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    )
}

interface AppRuleFormProps {
    rule?: AppRule
    onSubmit: (rule: Omit<AppRule, 'id' | 'createdAt' | 'updatedAt'>) => void
    onCancel: () => void
}

function AppRuleForm({ rule, onSubmit, onCancel }: Readonly<AppRuleFormProps>) {
    const [matcherType, setMatcherType] = useState(rule?.matcherType || 'EXACT')
    const [value, setValue] = useState(rule?.value || '')
    const [category, setCategory] = useState(rule?.category || 'NEUTRAL')
    const [priority, setPriority] = useState(rule?.priority || 100)
    const [isActive, setIsActive] = useState(rule?.isActive ?? true)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit({
            matcherType,
            value,
            category,
            priority,
            isActive,
        })
    }

    return (
        <form onSubmit={handleSubmit}>
            <DialogHeader>
                <DialogTitle>{rule ? 'Edit App Rule' : 'Create App Rule'}</DialogTitle>
                <DialogDescription>
                    Configure how applications are categorized based on their names
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div>
                    <Label htmlFor="matcher-type">Matcher Type</Label>
                    <Select value={matcherType} onValueChange={setMatcherType}>
                        <SelectTrigger id="matcher-type">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="EXACT">Exact Match</SelectItem>
                            <SelectItem value="GLOB">Glob Pattern</SelectItem>
                            <SelectItem value="REGEX">Regular Expression</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="value">Pattern/Value</Label>
                    <Input
                        id="value"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={
                            matcherType === 'EXACT'
                                ? 'e.g., Slack'
                                : matcherType === 'GLOB'
                                    ? 'e.g., *code*'
                                    : 'e.g., ^(VS Code|Visual Studio)$'
                        }
                        required
                    />
                </div>
                <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger id="category">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PRODUCTIVE">Productive</SelectItem>
                            <SelectItem value="NEUTRAL">Neutral</SelectItem>
                            <SelectItem value="UNPRODUCTIVE">Unproductive</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="priority">Priority (lower = higher priority)</Label>
                    <Input
                        id="priority"
                        type="number"
                        value={priority}
                        onChange={(e) => setPriority(parseInt(e.target.value))}
                        min={1}
                        max={1000}
                        required
                    />
                </div>
                <div className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        id="is-active"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="rounded border-gray-300"
                    />
                    <Label htmlFor="is-active">Active</Label>
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit">{rule ? 'Update' : 'Create'} Rule</Button>
            </DialogFooter>
        </form>
    )
}

function AppRulesManagementSkeleton() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <Zap className="mr-2 h-5 w-5" />
                    App Rules
                </CardTitle>
                <CardDescription>Loading app rules...</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => {
                        const key = `app-rules-management-skeleton-${i}`;
                        return (
                            <div key={key} className="flex items-center space-x-4 p-4 border rounded-lg">
                                <div className="w-10 h-10 bg-muted rounded animate-pulse" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                                    <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
