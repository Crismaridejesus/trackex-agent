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
import { Plus, Edit, Trash2, ChevronUp, ChevronDown, Globe, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollableList } from '@/components/ui/scrollable-list'
import { 
  useDomainRules, 
  useCreateDomainRule, 
  useUpdateDomainRule, 
  useDeleteDomainRule 
} from '@/hooks/queries'
import type { DomainRule } from '@/lib/api/domain-rules.api'

interface DomainRuleFormProps {
  rule?: DomainRule
  onSubmit: (rule: Partial<DomainRule>) => void
  onCancel: () => void
}

function DomainRuleForm({ rule, onSubmit, onCancel }: DomainRuleFormProps) {
  const [domain, setDomain] = useState(rule?.domain || '')
  const [matcherType, setMatcherType] = useState(rule?.matcherType || 'SUFFIX')
  const [category, setCategory] = useState(rule?.category || 'UNPRODUCTIVE')
  const [description, setDescription] = useState(rule?.description || '')
  const [priority, setPriority] = useState(rule?.priority || 100)
  const [isActive, setIsActive] = useState(rule?.isActive ?? true)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      domain,
      matcherType,
      category,
      description: description || null,
      priority,
      isActive,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{rule ? 'Edit Domain Rule' : 'Create Domain Rule'}</DialogTitle>
        <DialogDescription>
          Domain rules override app-level classification for browser activity.
          For example, mark youtube.com as unproductive even when using Chrome.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="domain">Domain</Label>
          <Input
            id="domain"
            placeholder="e.g., youtube.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            Enter the domain without protocol (e.g., youtube.com, not https://youtube.com)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="matcherType">Match Type</Label>
          <Select value={matcherType} onValueChange={setMatcherType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SUFFIX">
                <div>
                  <span className="font-medium">Suffix</span>
                  <span className="text-muted-foreground ml-2">
                    (matches domain and all subdomains)
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="EXACT">
                <div>
                  <span className="font-medium">Exact</span>
                  <span className="text-muted-foreground ml-2">
                    (exact domain match only)
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="CONTAINS">
                <div>
                  <span className="font-medium">Contains</span>
                  <span className="text-muted-foreground ml-2">
                    (domain contains this text)
                  </span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PRODUCTIVE">Productive</SelectItem>
              <SelectItem value="NEUTRAL">Neutral</SelectItem>
              <SelectItem value="UNPRODUCTIVE">Unproductive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Input
            id="description"
            placeholder="e.g., Video streaming"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Input
            id="priority"
            type="number"
            min={1}
            max={1000}
            value={priority}
            onChange={(e) => setPriority(parseInt(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Lower numbers = higher priority (checked first)
          </p>
        </div>

        {rule && (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{rule ? 'Update' : 'Create'}</Button>
      </DialogFooter>
    </form>
  )
}

function DomainRulesManagementSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-80 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function DomainRulesManagement() {
  const { toast } = useToast()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<DomainRule | null>(null)
  const [deletingRule, setDeletingRule] = useState<DomainRule | null>(null)

  const { data, isLoading, error } = useDomainRules()

  const createMutation = useCreateDomainRule({
    onSuccess: () => {
      setCreateDialogOpen(false)
      toast({
        title: 'Success',
        description: 'Domain rule created successfully',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create domain rule',
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useUpdateDomainRule({
    onSuccess: () => {
      setEditDialogOpen(false)
      toast({
        title: 'Success',
        description: 'Domain rule updated successfully',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update domain rule',
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useDeleteDomainRule({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Domain rule deleted successfully',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete domain rule',
        variant: 'destructive',
      })
    },
  })

  const handlePriorityChange = async (rule: DomainRule, direction: 'up' | 'down') => {
    const rules = data?.rules || []
    const currentIndex = rules.findIndex((r: DomainRule) => r.id === rule.id)

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
    return <DomainRulesManagementSkeleton />
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">Failed to load domain rules</p>
        </CardContent>
      </Card>
    )
  }

  const rules = data?.rules || []

  // Group rules by category for display
  const unproductiveRules = rules.filter((r: DomainRule) => r.category === 'UNPRODUCTIVE')
  const productiveRules = rules.filter((r: DomainRule) => r.category === 'PRODUCTIVE')
  const neutralRules = rules.filter((r: DomainRule) => r.category === 'NEUTRAL')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Globe className="mr-2 h-5 w-5" />
            Domain Rules
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DomainRuleForm
                onSubmit={(rule) => {
                  createMutation.mutate(rule as Omit<DomainRule, 'id' | 'createdAt' | 'updatedAt'>)
                }}
                onCancel={() => setCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 mt-0.5 text-amber-500" />
            <span>
              Domain rules <strong>override</strong> app rules. If Chrome is marked productive but
              youtube.com is marked unproductive, time on YouTube will count as unproductive.
            </span>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No domain rules configured</p>
            <p className="text-sm">Add rules to classify websites by productivity</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary badges */}
            <div className="flex flex-wrap gap-2">
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

            {/* Rules list */}
            <ScrollableList maxHeight="max-h-[500px]" className="space-y-2">
              {rules.map((rule: DomainRule, index: number) => (
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
                        <p className="font-medium font-mono">{rule.domain}</p>
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
                      <div className="flex items-center space-x-2 mt-1">
                        {rule.description && (
                          <p className="text-sm text-muted-foreground">{rule.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Priority: {rule.priority}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
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
          </div>
        )}
      </CardContent>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          {editingRule && (
            <DomainRuleForm
              rule={editingRule}
              onSubmit={(rule) => {
                updateMutation.mutate({ id: editingRule.id, data: rule })
              }}
              onCancel={() => {
                setEditDialogOpen(false)
                setEditingRule(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingRule} onOpenChange={() => setDeletingRule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Domain Rule?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the rule for{' '}
              <strong>{deletingRule?.domain}</strong>?
              <br /><br />
              This action cannot be undone and may affect how domains are categorized.
              Domain rules override app rules.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingRule) {
                  deleteMutation.mutate(deletingRule.id)
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
