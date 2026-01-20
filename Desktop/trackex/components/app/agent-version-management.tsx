'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Plus, Package, Trash2, Edit, Download, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import {
  useAgentVersions,
  useCreateAgentVersion,
  useUpdateAgentVersion,
  useDeleteAgentVersion,
  useToggleAgentVersionActive,
} from '@/hooks/queries/use-agent-versions'
import type { AgentVersion, Platform, Architecture, CreateAgentVersionData } from '@/lib/api/agent-versions.api'

interface AgentVersionFormData {
  version: string
  platform: Platform
  arch: Architecture
  downloadUrl: string
  signature: string
  releaseNotes: string
  isActive: boolean
  mandatory: boolean
  fileSize: string // stored as string for form input, converted to number
}

const defaultFormData: AgentVersionFormData = {
  version: '',
  platform: 'darwin',
  arch: 'aarch64',
  downloadUrl: '',
  signature: '',
  releaseNotes: '',
  isActive: true,
  mandatory: false,
  fileSize: '',
}

function AgentVersionForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: {
  initialData?: AgentVersion
  onSubmit: (data: AgentVersionFormData) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState<AgentVersionFormData>({
    version: initialData?.version || defaultFormData.version,
    platform: initialData?.platform || defaultFormData.platform,
    arch: initialData?.arch || defaultFormData.arch,
    downloadUrl: initialData?.downloadUrl || defaultFormData.downloadUrl,
    signature: initialData?.signature || defaultFormData.signature,
    releaseNotes: initialData?.releaseNotes || defaultFormData.releaseNotes,
    isActive: initialData?.isActive ?? defaultFormData.isActive,
    mandatory: initialData?.mandatory ?? defaultFormData.mandatory,
    fileSize: initialData?.fileSize?.toString() || defaultFormData.fileSize,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4">
        {/* Version */}
        <div className="space-y-2">
          <Label htmlFor="version">
            Version <span className="text-destructive">*</span>
          </Label>
          <Input
            id="version"
            value={formData.version}
            onChange={(e) => setFormData((prev) => ({ ...prev, version: e.target.value }))}
            placeholder="e.g., 1.0.4"
            required
          />
          <p className="text-xs text-muted-foreground">Semantic version format (e.g., 1.0.4)</p>
        </div>

        {/* Platform & Architecture */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="platform">
              Platform <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.platform}
              onValueChange={(value: Platform) =>
                setFormData((prev) => ({ ...prev, platform: value }))
              }
            >
              <SelectTrigger id="platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="darwin">macOS (darwin)</SelectItem>
                <SelectItem value="windows">Windows</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="arch">
              Architecture <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.arch}
              onValueChange={(value: Architecture) =>
                setFormData((prev) => ({ ...prev, arch: value }))
              }
            >
              <SelectTrigger id="arch">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aarch64">ARM64 (aarch64)</SelectItem>
                <SelectItem value="x86_64">x86_64</SelectItem>
                <SelectItem value="universal">Universal (macOS)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Download URL */}
        <div className="space-y-2">
          <Label htmlFor="downloadUrl">
            Download URL <span className="text-destructive">*</span>
          </Label>
          <Input
            id="downloadUrl"
            value={formData.downloadUrl}
            onChange={(e) => setFormData((prev) => ({ ...prev, downloadUrl: e.target.value }))}
            placeholder="https://trackex.app/downloads/macos/TrackEx-Agent_1.0.4_universal.dmg"
            required
            type="url"
          />
          <p className="text-xs text-muted-foreground">Publicly accessible URL to the installer</p>
        </div>

        {/* Signature */}
        <div className="space-y-2">
          <Label htmlFor="signature">
            Tauri Signature <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="signature"
            value={formData.signature}
            onChange={(e) => setFormData((prev) => ({ ...prev, signature: e.target.value }))}
            placeholder="dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkK..."
            required
            rows={3}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            Generate with: <code className="text-xs">npx tauri signer sign &lt;file&gt; -k trackex.key</code>
          </p>
        </div>

        {/* Release Notes */}
        <div className="space-y-2">
          <Label htmlFor="releaseNotes">
            Release Notes <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="releaseNotes"
            value={formData.releaseNotes}
            onChange={(e) => setFormData((prev) => ({ ...prev, releaseNotes: e.target.value }))}
            placeholder="# Version 1.0.4&#10;&#10;## New Features&#10;- Feature 1&#10;- Feature 2&#10;&#10;## Bug Fixes&#10;- Fix 1"
            required
            rows={6}
          />
          <p className="text-xs text-muted-foreground">Markdown format supported</p>
        </div>

        {/* File Size (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="fileSize">File Size (bytes)</Label>
          <Input
            id="fileSize"
            value={formData.fileSize}
            onChange={(e) => setFormData((prev) => ({ ...prev, fileSize: e.target.value }))}
            placeholder="24086000"
            type="number"
          />
          <p className="text-xs text-muted-foreground">Optional - file size in bytes</p>
        </div>

        {/* Switches */}
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Active</Label>
              <p className="text-sm text-muted-foreground">
                Make this version available for updates
              </p>
            </div>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isActive: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Mandatory Update</Label>
              <p className="text-sm text-muted-foreground">
                Force users to update (cannot skip)
              </p>
            </div>
            <Switch
              checked={formData.mandatory}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, mandatory: checked }))
              }
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            isLoading ||
            !formData.version.trim() ||
            !formData.downloadUrl.trim() ||
            !formData.signature.trim() ||
            !formData.releaseNotes.trim()
          }
        >
          {isLoading ? 'Saving...' : initialData ? 'Update Version' : 'Create Version'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function AgentVersionManagement() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingVersion, setEditingVersion] = useState<AgentVersion | null>(null)
  const [deletingVersion, setDeletingVersion] = useState<AgentVersion | null>(null)
  const [creatingVersionData, setCreatingVersionData] = useState<AgentVersionFormData | null>(null)
  const [togglingVersion, setTogglingVersion] = useState<AgentVersion | null>(null)
  const { toast } = useToast()

  const { data: versions = [], isLoading } = useAgentVersions()
  const createMutation = useCreateAgentVersion()
  const updateMutation = useUpdateAgentVersion()
  const deleteMutation = useDeleteAgentVersion()
  const toggleActiveMutation = useToggleAgentVersionActive()

  const handleCreate = (data: AgentVersionFormData) => {
    setCreatingVersionData(data)
  }

  const confirmCreate = () => {
    if (!creatingVersionData) return

    const payload: CreateAgentVersionData = {
      version: creatingVersionData.version,
      platform: creatingVersionData.platform,
      arch: creatingVersionData.arch,
      downloadUrl: creatingVersionData.downloadUrl,
      signature: creatingVersionData.signature,
      releaseNotes: creatingVersionData.releaseNotes,
      isActive: creatingVersionData.isActive,
      mandatory: creatingVersionData.mandatory,
      fileSize: creatingVersionData.fileSize ? parseInt(creatingVersionData.fileSize, 10) : null,
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        setCreateDialogOpen(false)
        setCreatingVersionData(null)
        toast({
          title: 'Version Created',
          description: `Version ${creatingVersionData.version} for ${creatingVersionData.platform}-${creatingVersionData.arch} has been created.`,
        })
      },
      onError: (error) => {
        setCreatingVersionData(null)
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to create version',
          variant: 'destructive',
        })
      },
    })
  }

  const handleUpdate = (data: AgentVersionFormData) => {
    if (!editingVersion) return

    const payload = {
      version: data.version,
      platform: data.platform,
      arch: data.arch,
      downloadUrl: data.downloadUrl,
      signature: data.signature,
      releaseNotes: data.releaseNotes,
      isActive: data.isActive,
      mandatory: data.mandatory,
      fileSize: data.fileSize ? parseInt(data.fileSize, 10) : null,
    }

    updateMutation.mutate(
      { id: editingVersion.id, data: payload },
      {
        onSuccess: () => {
          setEditingVersion(null)
          toast({
            title: 'Version Updated',
            description: `Version ${data.version} has been updated.`,
          })
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: error instanceof Error ? error.message : 'Failed to update version',
            variant: 'destructive',
          })
        },
      }
    )
  }

  const handleDelete = () => {
    if (!deletingVersion) return

    deleteMutation.mutate(deletingVersion.id, {
      onSuccess: () => {
        setDeletingVersion(null)
        toast({
          title: 'Version Deleted',
          description: `Version ${deletingVersion.version} has been deleted.`,
        })
      },
      onError: (error) => {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to delete version',
          variant: 'destructive',
        })
      },
    })
  }

  const handleToggleActive = (version: AgentVersion) => {
    setTogglingVersion(version)
  }

  const confirmToggleActive = () => {
    if (!togglingVersion) return

    toggleActiveMutation.mutate(
      { id: togglingVersion.id, isActive: !togglingVersion.isActive },
      {
        onSuccess: () => {
          const wasActive = togglingVersion.isActive
          setTogglingVersion(null)
          toast({
            title: wasActive ? 'Version Deactivated' : 'Version Activated',
            description: `Version ${togglingVersion.version} is now ${!wasActive ? 'active' : 'inactive'}.`,
          })
        },
        onError: (error) => {
          setTogglingVersion(null)
          toast({
            title: 'Error',
            description: error instanceof Error ? error.message : 'Failed to toggle version status',
            variant: 'destructive',
          })
        },
      }
    )
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A'
    const mb = bytes / 1024 / 1024
    return `${mb.toFixed(2)} MB`
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Agent Versions
              </CardTitle>
              <CardDescription>
                Manage desktop agent update versions for auto-update system
              </CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Version
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Agent Version</DialogTitle>
                  <DialogDescription>
                    Add a new desktop agent version for the auto-update system
                  </DialogDescription>
                </DialogHeader>
                <AgentVersionForm
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
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading versions...</p>
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-lg font-medium">No agent versions yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first version to enable auto-updates
              </p>
            </div>
          ) : (
            <ScrollableList maxHeight="600px">
              <div className="space-y-3">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="rounded-lg border p-4 transition-colors hover:bg-accent/50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">v{version.version}</h4>
                          <Badge variant={version.platform === 'darwin' ? 'default' : 'secondary'}>
                            {version.platform === 'darwin' ? '🍎 macOS' : '🪟 Windows'}
                          </Badge>
                          <Badge variant="outline">{version.arch}</Badge>
                          {version.isActive ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Inactive
                            </Badge>
                          )}
                          {version.mandatory && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Mandatory
                            </Badge>
                          )}
                        </div>

                        <div className="text-sm text-muted-foreground">
                          <div>Released: {formatDate(version.releasedAt)}</div>
                          <div>Size: {formatFileSize(version.fileSize)}</div>
                          <div className="mt-2 max-w-2xl truncate">
                            <Download className="mr-1 inline h-3 w-3" />
                            {version.downloadUrl}
                          </div>
                        </div>

                        <details className="text-sm">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            View Release Notes
                          </summary>
                          <div className="mt-2 rounded border bg-muted/50 p-3">
                            <pre className="whitespace-pre-wrap font-sans text-xs">
                              {version.releaseNotes}
                            </pre>
                          </div>
                        </details>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(version)}
                          disabled={toggleActiveMutation.isPending}
                        >
                          {version.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingVersion(version)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingVersion(version)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollableList>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingVersion} onOpenChange={() => setEditingVersion(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Agent Version</DialogTitle>
            <DialogDescription>
              Update the agent version details
            </DialogDescription>
          </DialogHeader>
          {editingVersion && (
            <AgentVersionForm
              initialData={editingVersion}
              onSubmit={handleUpdate}
              onCancel={() => setEditingVersion(null)}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingVersion} onOpenChange={() => setDeletingVersion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent Version</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete version <strong>{deletingVersion?.version}</strong> for{' '}
              <strong>
                {deletingVersion?.platform}-{deletingVersion?.arch}
              </strong>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Confirmation Dialog */}
      <AlertDialog open={!!creatingVersionData} onOpenChange={() => setCreatingVersionData(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create Agent Version?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p>
                  You are about to create a new agent version with the following details:
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 space-y-1">
                  <p className="text-sm">
                    <strong>Version:</strong> {creatingVersionData?.version}
                  </p>
                  <p className="text-sm">
                    <strong>Platform:</strong> {creatingVersionData?.platform === 'darwin' ? 'macOS' : 'Windows'} ({creatingVersionData?.arch})
                  </p>
                  <p className="text-sm">
                    <strong>Status:</strong> {creatingVersionData?.isActive ? 'Active' : 'Inactive'}
                  </p>
                  {creatingVersionData?.mandatory && (
                    <p className="text-sm">
                      <strong>⚠️ Mandatory Update:</strong> Users will be required to update
                    </p>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {creatingVersionData?.isActive
                    ? 'This version will be immediately available to users via auto-update.'
                    : 'This version will not be available until activated.'}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCreate} disabled={createMutation.isPending}>
              Create Version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toggle Active Confirmation Dialog */}
      <AlertDialog open={!!togglingVersion} onOpenChange={() => setTogglingVersion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {togglingVersion?.isActive ? 'Deactivate' : 'Activate'} Agent Version?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p>
                  {togglingVersion?.isActive ? (
                    <>
                      Deactivate version <strong>{togglingVersion?.version}</strong> for{' '}
                      <strong>{togglingVersion?.platform === 'darwin' ? 'macOS' : 'Windows'}</strong>?
                    </>
                  ) : (
                    <>
                      Activate version <strong>{togglingVersion?.version}</strong> for{' '}
                      <strong>{togglingVersion?.platform === 'darwin' ? 'macOS' : 'Windows'}</strong>?
                    </>
                  )}
                </p>
                <div className={`border rounded-md p-3 space-y-1 ${
                  togglingVersion?.isActive
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                    : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                }`}>
                  {togglingVersion?.isActive ? (
                    <>
                      <p className="text-sm font-medium">⚠️ Impact:</p>
                      <ul className="text-sm space-y-1 ml-4 list-disc">
                        <li>This version will no longer be available for auto-updates</li>
                        <li>Users won't be able to download or install this version</li>
                        <li>Existing installations will continue to work</li>
                      </ul>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium">✓ Impact:</p>
                      <ul className="text-sm space-y-1 ml-4 list-disc">
                        <li>This version will be available via auto-update</li>
                        <li>Users will be able to download and install this version</li>
                        {togglingVersion?.mandatory && (
                          <li className="font-semibold">⚠️ Mandatory update: Users will be required to update</li>
                        )}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmToggleActive}
              disabled={toggleActiveMutation.isPending}
              className={togglingVersion?.isActive ? 'bg-amber-600 hover:bg-amber-700' : ''}
            >
              {togglingVersion?.isActive ? 'Deactivate' : 'Activate'} Version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
