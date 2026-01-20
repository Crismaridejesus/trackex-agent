'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    Clock,
    Users,
    TrendingUp,
    Activity,
    Download,
    Globe,
    Eye,
    Settings,
    Loader2
} from 'lucide-react'
import { formatDuration, formatPercentage } from '@/lib/utils/format'
import Link from 'next/link'
import { AdvancedDateRangePicker } from '@/components/ui/advanced-date-range-picker'
import { DateRange } from 'react-day-picker'
import { subDays, format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { useHomeAnalytics, usePrefetchAnalytics } from '@/hooks/queries/use-analytics'
import { useTeams } from '@/hooks/queries/use-teams'
import { normalizeToDateString } from '@/lib/utils/date'

// Type definitions for analytics data (kept flexible to match actual API response)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppUsage = any

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DomainUsage = any

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DailyAnalytics = any

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnalyticsTotals = any

interface Team {
    id: string
    name: string
}

export function HomeAnalytics() {
    const { toast } = useToast()
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 7),
        to: new Date(),
    })
    const [selectedTeam, setSelectedTeam] = useState<string>('all')
    const [isExporting, setIsExporting] = useState(false)

    // Use custom hooks
    const { data: teamsData } = useTeams()
    const prefetchAnalytics = usePrefetchAnalytics()

    // Normalize dates to stable ISO datetime strings for cache hits on navigation
    // Start date uses start of day (00:00:00), end date uses end of day (23:59:59)
    const normalizedStartDate = dateRange?.from ? normalizeToDateString(dateRange.from) : undefined
    const normalizedEndDate = dateRange?.to ? normalizeToDateString(dateRange.to, true) : undefined

    // Analytics data with prefetching
    const teamIds = selectedTeam === 'all' ? undefined : [selectedTeam]
    const { data, isLoading, error } = useHomeAnalytics({
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
        teamIds,
        enabled: !!(dateRange?.from && dateRange?.to),
    })

    // Prefetch analytics when date range changes
    const handleDateChange = (newDateRange: DateRange | undefined) => {
        setDateRange(newDateRange)
        // Prefetch for the new date range using normalized dates for stable cache keys
        if (newDateRange?.from && newDateRange?.to) {
            prefetchAnalytics({
                startDate: normalizeToDateString(newDateRange.from),
                endDate: normalizeToDateString(newDateRange.to, true),
                teamIds,
            })
        }
    }

    const handleExportCSV = async () => {
        if (!dateRange?.from || !dateRange?.to) {
            toast({
                title: 'Date range required',
                description: 'Please select a date range to export data.',
                variant: 'destructive',
            })
            return
        }

        setIsExporting(true)
        try {
            const params = new URLSearchParams({
                startDate: dateRange.from.toISOString(),
                endDate: dateRange.to.toISOString(),
            })
            if (selectedTeam !== 'all') {
                params.append('teamId', selectedTeam)
            }

            const response = await fetch(`/api/exports/home-analytics?${params.toString()}`)
            if (!response.ok) throw new Error('Failed to export data')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            const fromDate = format(dateRange.from, 'yyyy-MM-dd')
            const toDate = format(dateRange.to, 'yyyy-MM-dd')
            a.download = `trackex-analytics-${fromDate}-to-${toDate}.csv`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)

            toast({
                title: 'Export successful',
                description: 'Analytics data has been exported to CSV.',
            })
        } catch (error) {
            toast({
                title: 'Export failed',
                description: error instanceof Error ? error.message : 'Failed to export data',
                variant: 'destructive',
            })
        } finally {
            setIsExporting(false)
        }
    }


    // Show skeleton only on initial load (no cached data available)
    // This enables stale-while-revalidate: show cached data immediately, refetch in background
    if (isLoading && !data) {
        return <HomeAnalyticsSkeleton />
    }

    if (error && !data) {
        return (
            <Card>
                <CardContent className="p-6">
                    <p className="text-destructive">Failed to load analytics data</p>
                    <p className="text-sm text-muted-foreground mt-2">
                        {error instanceof Error ? error.message : 'Unknown error occurred'}
                    </p>
                </CardContent>
            </Card>
        )
    }

    if (!data?.analytics) {
        return (
            <Card>
                <CardContent className="p-6">
                    <p className="text-muted-foreground">No analytics data available</p>
                </CardContent>
            </Card>
        )
    }

    const { analytics } = data;
    const { totals, dailyAnalytics, topApps, topDomains, employeeCount } = analytics;

    return (
        <div className="space-y-6">
            {/* Date Range Picker and Team Filter */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Analytics Overview</h2>
                    <p className="text-muted-foreground">Track employee productivity and time metrics</p>
                </div>
                <div className="flex items-center space-x-2">
                    {/* Quick Actions */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" asChild>
                                    <Link href="/app/live">
                                        <Eye className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Live Activity</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" asChild>
                                    <Link href="/app/employees">
                                        <Users className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Manage Employees</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    onClick={handleExportCSV}
                                    disabled={isExporting}
                                >
                                    {isExporting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Download className="h-4 w-4" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Export to CSV</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" asChild>
                                    <Link href="/app/settings">
                                        <Settings className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Settings & Policies</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <div className="w-px h-6 bg-border mx-1" />

                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="All Teams" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Teams</SelectItem>
                            {teamsData?.teams?.map((team: Team) => (
                                <SelectItem key={team.id} value={team.id}>
                                    {team.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <AdvancedDateRangePicker
                        date={dateRange}
                        onDateChange={handleDateChange}
                    />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Work Time</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatDuration(totals.totalWork)}</div>
                        <p className="text-xs text-muted-foreground">
                            {dateRange?.from && dateRange?.to ?
                                `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}` :
                                'Last 7 days'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{employeeCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Avg {formatDuration(totals.avgPerEmployee || 0)} per employee
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Productivity</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {formatPercentage((totals.productivityScore || 0) / 100)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {formatDuration(totals.productiveTime)} productive
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Activity Rate</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatPercentage(totals.activeTime && totals.totalWork > 0 ? totals.activeTime / totals.totalWork : 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {formatDuration(totals.activeTime)} active
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Top Apps */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Top Applications</CardTitle>
                        <CardDescription>Most used applications this week</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {topApps.slice(0, 5).map((app: AppUsage, index: number) => (
                                <div key={app.appName} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-sm font-medium">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-medium">{app.appName}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDuration(app.activeTime)}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant={
                                        app.category === 'PRODUCTIVE' ? 'default' :
                                            app.category === 'NEUTRAL' ? 'secondary' : 'destructive'
                                    }>
                                        {app.category.toLowerCase()}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5" />
                            Top Domains
                        </CardTitle>
                        <CardDescription>Most visited websites this week</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {topDomains && topDomains.length > 0 ? (
                            <div className="space-y-4">
                                {topDomains.slice(0, 5).map((domain: DomainUsage, index: number) => (
                                    <div key={domain.domain} className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-sm font-medium">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="font-medium">{domain.domain}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {formatDuration(domain.activeTime)}
                                                    {domain.overrodeAppRule && (
                                                        <span className="ml-2 text-xs text-orange-500" title="Domain rule applied">
                                                            ⚡ domain rule
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant={
                                            domain.category === 'PRODUCTIVE' ? 'default' :
                                                domain.category === 'NEUTRAL' ? 'secondary' : 'destructive'
                                        }>
                                            {domain.category.toLowerCase()}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No domain data available</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Daily Trend */}
            {dailyAnalytics.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Daily Activity</CardTitle>
                        <CardDescription>Work time distribution over the last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {dailyAnalytics.slice(-7).map((day: DailyAnalytics) => (
                                <div key={day.date} className="flex items-center justify-between py-2">
                                    <div className="text-sm font-medium">
                                        {new Date(day.date).toLocaleDateString('en-US', {
                                            weekday: 'short',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </div>
                                    <div className="flex items-center space-x-4 text-sm">
                                        <span className="text-muted-foreground">
                                            {formatDuration(day.totalWork)}
                                        </span>
                                        <div className="flex space-x-1">
                                            <Badge variant="default" className="text-xs">
                                                {formatPercentage(day.activeTime > 0 ? Math.min(day.productiveTime / day.activeTime, 1) : 0)} productive
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

function HomeAnalyticsSkeleton() {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
                <Card key={`skeleton-card-${i}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-8 w-24 bg-muted rounded animate-pulse mb-2" />
                        <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
