'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Filter,
    RefreshCw,
    User,
    Shield,
    FileText,
    Settings,
    Camera,
    Download,
    Loader2
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils/format'
import { useInfiniteAuditLogs } from '@/hooks/queries/use-audit-logs'
import type { AuditLog } from '@/lib/api/audit.api'
import { ScrollableList } from '@/components/ui/scrollable-list'

export function AuditLogViewer() {
    const [actionFilter, setActionFilter] = useState<string | undefined>(undefined)
    const loadMoreRef = useRef<HTMLDivElement>(null)

    // Use infinite query hook
    const {
        data,
        isLoading,
        error,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteAuditLogs({
        action: actionFilter,
    })

    // Flatten all pages into a single array
    const allLogs = useMemo(() => {
        return data?.pages.flatMap(page => page.logs) ?? []
    }, [data?.pages])

    const totalAvailable = data?.pages[0]?.pagination.total ?? 0

    // Intersection Observer for infinite scroll
    useEffect(() => {
        if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage()
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        )

        observer.observe(loadMoreRef.current)

        return () => observer.disconnect()
    }, [hasNextPage, isFetchingNextPage, fetchNextPage])

    const getActionIcon = (action: string) => {
        if (action.includes('employee')) return <User className="h-4 w-4" />
        if (action.includes('policy')) return <Shield className="h-4 w-4" />
        if (action.includes('app_rule')) return <Settings className="h-4 w-4" />
        if (action.includes('screenshot')) return <Camera className="h-4 w-4" />
        if (action.includes('export')) return <Download className="h-4 w-4" />
        return <FileText className="h-4 w-4" />
    }

    const getActionVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
        if (action.includes('create')) return 'default'
        if (action.includes('update')) return 'secondary'
        if (action.includes('delete')) return 'destructive'
        return 'outline'
    }

    const actionOptions = [
        { value: 'all', label: 'All Actions' },
        { value: 'employee_create', label: 'Employee Created' },
        { value: 'employee_update', label: 'Employee Updated' },
        { value: 'employee_delete', label: 'Employee Deleted' },
        { value: 'policy_create', label: 'Policy Created' },
        { value: 'policy_update', label: 'Policy Updated' },
        { value: 'policy_delete', label: 'Policy Deleted' },
        { value: 'app_rule_create', label: 'App Rule Created' },
        { value: 'app_rule_update', label: 'App Rule Updated' },
        { value: 'app_rule_delete', label: 'App Rule Deleted' },
        { value: 'screenshot_request', label: 'Screenshot Requested' },
        { value: 'screenshot_view', label: 'Screenshot Viewed' },
        { value: 'export_home_analytics', label: 'Home Analytics Exported' },
        { value: 'export_employee_sessions', label: 'Employee Sessions Exported' },
        { value: 'export_app_usage', label: 'App Usage Exported' },
    ]

    if (isLoading) {
        return <AuditLogSkeleton />
    }

    if (error) {
        return (
            <Card>
                <CardContent className="p-6">
                    <p className="text-destructive">Failed to load audit logs</p>
                    <Button onClick={() => refetch()} className="mt-2">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Retry
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    Audit Log
                </CardTitle>
                <CardDescription>
                    Administrative actions and system events
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select
                            value={actionFilter || 'all'}
                            onValueChange={(value) => setActionFilter(value === 'all' ? undefined : value)}
                        >
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Filter by action" />
                            </SelectTrigger>
                            <SelectContent>
                                {actionOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                </div>

                {/* Audit Log List */}
                <ScrollableList maxHeight="max-h-[500px]">
                    <div className="space-y-2">
                        {allLogs.length > 0 ? (
                        allLogs.map((log: AuditLog) => (
                            <div
                                key={log.id}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                                        {getActionIcon(log.action)}
                                    </div>
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <Badge variant={getActionVariant(log.action)}>
                                                {log.action.replace(/_/g, ' ')}
                                            </Badge>
                                            {log.entityType && (
                                                <span className="text-sm text-muted-foreground">
                                                    {log.entityType}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            {log.user ? (
                                                <span>by {log.user.name} ({log.user.email})</span>
                                            ) : log.userId === 'owner' ? (
                                                <span>by Administrator</span>
                                            ) : (
                                                <span>by System</span>
                                            )}
                                            {log.details && (
                                                <span className="ml-2">
                                                    • {log.details.substring(0, 100)}
                                                    {log.details.length > 100 && '...'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-medium">
                                        {formatDateTime(log.createdAt)}
                                    </div>
                                    {log.ipAddress && (
                                        <div className="text-xs text-muted-foreground">
                                            {log.ipAddress}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No audit logs found</p>
                            <p className="text-sm">Audit logs will appear here as actions are performed</p>
                        </div>
                        )}
                    </div>

                    {/* Infinite Scroll Trigger & Loading Indicator */}
                    <div ref={loadMoreRef} className="flex items-center justify-center py-4">
                    {isFetchingNextPage && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Loading more logs...</span>
                        </div>
                        )}
                    </div>
                </ScrollableList>

                {/* Pagination Info */}
                {totalAvailable > 0 && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
                        <span>
                            Showing {allLogs.length} of {totalAvailable} entries
                        </span>
                        {hasNextPage && !isFetchingNextPage && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchNextPage()}
                            >
                                Load More
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function AuditLogSkeleton() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {Array.from({ length: 5 }, (_, i) => (
                        <div key={`audit-skeleton-${i}`} className="flex items-center space-x-4 p-4 border rounded-lg">
                            <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                                <div className="h-3 w-48 bg-muted rounded animate-pulse" />
                            </div>
                            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
