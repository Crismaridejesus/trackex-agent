'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AdvancedDateRangePicker } from '@/components/ui/advanced-date-range-picker'
import { Users, FileText, Clock, Activity, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { DeviceTokenModal } from '@/components/app/device-token-modal'
import { EmployeeActionsMenu } from '@/components/app/employee-actions-menu'
import { EditEmployeeModal } from '@/components/app/edit-employee-modal'
import { formatDuration, formatPercentage } from '@/lib/utils/format'
import { DateRange } from 'react-day-picker'
import { subDays, format } from 'date-fns'
import { LogIn, LogOut } from 'lucide-react'
import { useEmployees, useDeleteEmployee } from '@/hooks/queries/use-employees'
import { useTeams } from '@/hooks/queries/use-teams'
import { queryKeys } from '@/lib/query-keys'
import { normalizeToDateString } from '@/lib/utils/date'
import { ScrollableList } from '@/components/ui/scrollable-list'

interface Team {
    id: string
    name: string
}

interface EmployeeWithAnalytics {
    id: string
    name: string
    email: string
    team: { id?: string; name: string } | null | undefined
    latestClockIn?: string | null
    latestClockOut?: string | null
    analytics?: {
        totalWork: number
        activeTime: number
        idleTime: number
        productiveTime: number
        productivityScore: number
    }
    isActive: boolean
}

export function EmployeeList() {
    const queryClient = useQueryClient()
    const [editModalOpen, setEditModalOpen] = useState(false)
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
    const [selectedTeam, setSelectedTeam] = useState<string>('all')
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 7),
        to: new Date(),
    })
    const [noActivityExpanded, setNoActivityExpanded] = useState(false)
    const router = useRouter()

    // Use custom hooks
    const { data: teamsData } = useTeams()
    
    // Normalize dates to stable ISO datetime strings for cache hits on navigation
    // Start date uses start of day (00:00:00), end date uses end of day (23:59:59)
    const normalizedStartDate = dateRange?.from ? normalizeToDateString(dateRange.from) : undefined
    const normalizedEndDate = dateRange?.to ? normalizeToDateString(dateRange.to, true) : undefined
    
    const { data, isLoading, error } = useEmployees({
        teamId: selectedTeam,
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
        enabled: !!(dateRange?.from && dateRange?.to),
    })

    const deleteEmployeeMutation = useDeleteEmployee()

    // Show skeleton only on initial load (no cached data available)
    // This enables stale-while-revalidate: show cached data immediately, refetch in background
    if (isLoading && !data) {
        return <EmployeeListSkeleton />
    }

    if (error && !data) {
        return (
            <Card>
                <CardContent className="p-8">
                    <div className="text-center text-destructive">
                        <p>Failed to load employees. Please try again.</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const allEmployees = (data?.employees || []) as EmployeeWithAnalytics[]
    
    // Split employees into active and no-activity groups
    const activeEmployees = allEmployees.filter((employee) => 
        (employee.analytics?.totalWork || 0) > 0
    )
    const noActivityEmployees = allEmployees.filter((employee) => 
        (employee.analytics?.totalWork || 0) === 0
    )

    const handleEmployeeEdit = (employeeId: string) => {
        setSelectedEmployeeId(employeeId)
        setEditModalOpen(true)
    }

    const handleEmployeeDelete = async (employeeId: string) => {
        deleteEmployeeMutation.mutate(employeeId, {
            onError: (error) => {
                console.error('Failed to delete employee:', error)
            },
        })
    }

    return (
        <>
            <div className="space-y-6">
                {/* Header with filters */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Employee Management</h2>
                        <p className="text-muted-foreground">Monitor employee productivity and time metrics</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                            <SelectTrigger className="w-[200px]">
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
                            onDateChange={setDateRange}
                        />
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Users className="mr-2 h-5 w-5" />
                            Team Members
                        </CardTitle>
                        <CardDescription>
                            {allEmployees.length} employee{allEmployees.length === 1 ? '' : 's'} total
                            {activeEmployees.length > 0 && ` • ${activeEmployees.length} active`}
                            {noActivityEmployees.length > 0 && ` • ${noActivityEmployees.length} with no activity`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {allEmployees.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <h4 className="text-lg font-medium mb-2">No employees found</h4>
                                <p className="text-sm">
                                    Add your first employee to start tracking their productivity.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Active Employees Section */}
                                {activeEmployees.length > 0 && (
                                    <div>
                                        <div className="mb-3">
                                            <h3 className="text-sm font-semibold text-foreground flex items-center">
                                                <Activity className="h-4 w-4 mr-2 text-green-500" />
                                                Active Team Members
                                                <span className="ml-2 text-xs font-normal text-muted-foreground">({activeEmployees.length})</span>
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-1">Employees with tracked time in the selected period</p>
                                        </div>
                                        <div className="overflow-x-auto">
                                <table className="w-full table-fixed">
                                    <colgroup>
                                        <col className="w-[200px]" />
                                        <col className="w-[120px]" />
                                        <col className="w-[140px]" />
                                        <col className="w-[140px]" />
                                        <col className="w-[100px]" />
                                        <col className="w-[100px]" />
                                        <col className="w-[80px]" />
                                        <col className="w-[100px]" />
                                        <col className="w-[100px]" />
                                    </colgroup>
                                    <thead className="sticky top-0 z-10 bg-background">
                                        <tr className="border-b">
                                            <th className="text-left py-3 px-4 bg-background">Employee</th>
                                            <th className="text-left py-3 px-4 bg-background">Team</th>
                                            <th className="text-center py-3 px-4 bg-background">Latest Clock-in</th>
                                            <th className="text-center py-3 px-4 bg-background">Latest Clock-out</th>
                                            <th className="text-center py-3 px-4 bg-background">Total Work</th>
                                            <th className="text-center py-3 px-4 bg-background">Active Time</th>
                                            <th className="text-center py-3 px-4 bg-background">Idle Time</th>
                                            <th className="text-center py-3 px-4 bg-background">Productive</th>
                                            <th className="text-right py-3 px-4 bg-background">Actions</th>
                                        </tr>
                                    </thead>
                                </table>
                                <ScrollableList maxHeight="max-h-[600px]">
                                    <table className="w-full table-fixed">
                                        <colgroup>
                                            <col className="w-[200px]" />
                                            <col className="w-[120px]" />
                                            <col className="w-[140px]" />
                                            <col className="w-[140px]" />
                                            <col className="w-[100px]" />
                                            <col className="w-[100px]" />
                                            <col className="w-[80px]" />
                                            <col className="w-[100px]" />
                                            <col className="w-[100px]" />
                                        </colgroup>
                                        <tbody>
                                        {activeEmployees.map((employee: EmployeeWithAnalytics) => (
                                            <tr
                                                key={`employee-row-${employee.id}`}
                                                className="border-b hover:bg-muted/50 cursor-pointer"
                                                onClick={() => router.push(`/app/employees/${employee.id}`)}
                                            >
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                                            <Users className="h-5 w-5 text-primary" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-medium truncate">{employee.name}</h4>
                                                            <p className="text-sm text-muted-foreground truncate">{employee.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="text-sm truncate block">{employee.team?.name || 'No team'}</span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <div className="flex items-center justify-center space-x-1">
                                                        <LogIn className="h-4 w-4 text-green-500 flex-shrink-0" />
                                                        <span className="text-sm whitespace-nowrap">
                                                            {employee.latestClockIn 
                                                                ? format(new Date(employee.latestClockIn), 'MMM d, h:mm a')
                                                                : '-'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <div className="flex items-center justify-center space-x-1">
                                                        <LogOut className="h-4 w-4 text-red-500 flex-shrink-0" />
                                                        <span className="text-sm whitespace-nowrap">
                                                            {employee.latestClockOut 
                                                                ? format(new Date(employee.latestClockOut), 'MMM d, h:mm a')
                                                                : '-'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <div className="flex items-center justify-center space-x-1">
                                                        <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                                        <span className="font-medium whitespace-nowrap">{formatDuration(employee.analytics?.totalWork || 0)}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <div className="flex items-center justify-center space-x-1">
                                                        <Activity className="h-4 w-4 text-green-500 flex-shrink-0" />
                                                        <span className="font-medium whitespace-nowrap">{formatDuration(employee.analytics?.activeTime || 0)}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <div className="flex items-center justify-center space-x-1">
                                                        <Clock className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                                        <span className="font-medium whitespace-nowrap">{formatDuration(employee.analytics?.idleTime || 0)}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <div className="flex items-center justify-center space-x-1">
                                                        <TrendingUp className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                                        <span className="font-medium whitespace-nowrap">
                                                            {formatPercentage((employee.analytics?.productivityScore || 0) / 100)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center justify-end space-x-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                router.push(`/app/employees/${employee.id}`);
                                                            }}
                                                        >
                                                            <FileText className="h-4 w-4" />
                                                        </Button>

                                                        <DeviceTokenModal
                                                            employeeId={employee.id}
                                                            employeeName={employee.name}
                                                            employeeEmail={employee.email}
                                                        />

                                                        <EmployeeActionsMenu
                                                            employee={employee}
                                                            onEdit={handleEmployeeEdit}
                                                            onDelete={handleEmployeeDelete}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </ScrollableList>
                                        </div>
                                    </div>
                                )}

                                {/* No Activity Section */}
                                {noActivityEmployees.length > 0 && (
                                    <div>
                                        <button
                                            onClick={() => setNoActivityExpanded(!noActivityExpanded)}
                                            className="w-full mb-3 flex items-center justify-between hover:bg-muted/50 p-2 rounded transition-colors"
                                        >
                                            <div className="flex items-center">
                                                {noActivityExpanded ? (
                                                    <ChevronDown className="h-4 w-4 mr-2 text-muted-foreground" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4 mr-2 text-muted-foreground" />
                                                )}
                                                <h3 className="text-sm font-semibold text-foreground flex items-center">
                                                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                                    No Activity
                                                    <span className="ml-2 text-xs font-normal text-muted-foreground">({noActivityEmployees.length})</span>
                                                </h3>
                                            </div>
                                            <p className="text-xs text-muted-foreground">No tracked time in this period</p>
                                        </button>
                                        
                                        {noActivityExpanded && (
                                            <div className="overflow-x-auto">
                                                <table className="w-full table-fixed">
                                                    <colgroup>
                                                        <col className="w-[200px]" />
                                                        <col className="w-[120px]" />
                                                        <col className="w-[140px]" />
                                                        <col className="w-[140px]" />
                                                        <col className="w-[100px]" />
                                                        <col className="w-[100px]" />
                                                        <col className="w-[80px]" />
                                                        <col className="w-[100px]" />
                                                        <col className="w-[100px]" />
                                                    </colgroup>
                                                    <thead className="sticky top-0 z-10 bg-background">
                                                        <tr className="border-b">
                                                            <th className="text-left py-3 px-4 bg-background">Employee</th>
                                                            <th className="text-left py-3 px-4 bg-background">Team</th>
                                                            <th className="text-center py-3 px-4 bg-background">Latest Clock-in</th>
                                                            <th className="text-center py-3 px-4 bg-background">Latest Clock-out</th>
                                                            <th className="text-center py-3 px-4 bg-background">Total Work</th>
                                                            <th className="text-center py-3 px-4 bg-background">Active Time</th>
                                                            <th className="text-center py-3 px-4 bg-background">Idle Time</th>
                                                            <th className="text-center py-3 px-4 bg-background">Productive</th>
                                                            <th className="text-right py-3 px-4 bg-background">Actions</th>
                                                        </tr>
                                                    </thead>
                                                </table>
                                                <ScrollableList maxHeight="max-h-[400px]">
                                                    <table className="w-full table-fixed">
                                                        <colgroup>
                                                            <col className="w-[200px]" />
                                                            <col className="w-[120px]" />
                                                            <col className="w-[140px]" />
                                                            <col className="w-[140px]" />
                                                            <col className="w-[100px]" />
                                                            <col className="w-[100px]" />
                                                            <col className="w-[80px]" />
                                                            <col className="w-[100px]" />
                                                            <col className="w-[100px]" />
                                                        </colgroup>
                                                        <tbody>
                                                        {noActivityEmployees.map((employee: EmployeeWithAnalytics) => (
                                                            <tr
                                                                key={`employee-row-${employee.id}`}
                                                                className="border-b hover:bg-muted/50 cursor-pointer"
                                                                onClick={() => router.push(`/app/employees/${employee.id}`)}
                                                            >
                                                                <td className="py-3 px-4">
                                                                    <div className="flex items-center space-x-3">
                                                                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                                                            <Users className="h-5 w-5 text-primary" />
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <h4 className="font-medium truncate">{employee.name}</h4>
                                                                            <p className="text-sm text-muted-foreground truncate">{employee.email}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="py-3 px-4">
                                                                    <span className="text-sm truncate block">{employee.team?.name || 'No team'}</span>
                                                                </td>
                                                                <td className="py-3 px-4 text-center">
                                                                    <div className="flex items-center justify-center space-x-1">
                                                                        <LogIn className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                                                                        <span className="text-sm text-muted-foreground">-</span>
                                                                    </div>
                                                                </td>
                                                                <td className="py-3 px-4 text-center">
                                                                    <div className="flex items-center justify-center space-x-1">
                                                                        <LogOut className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                                                                        <span className="text-sm text-muted-foreground">-</span>
                                                                    </div>
                                                                </td>
                                                                <td className="py-3 px-4 text-center">
                                                                    <span className="text-sm text-muted-foreground">-</span>
                                                                </td>
                                                                <td className="py-3 px-4 text-center">
                                                                    <span className="text-sm text-muted-foreground">-</span>
                                                                </td>
                                                                <td className="py-3 px-4 text-center">
                                                                    <span className="text-sm text-muted-foreground">-</span>
                                                                </td>
                                                                <td className="py-3 px-4 text-center">
                                                                    <span className="text-sm text-muted-foreground">-</span>
                                                                </td>
                                                                <td className="py-3 px-4">
                                                                    <div className="flex items-center justify-end space-x-1">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                router.push(`/app/employees/${employee.id}`);
                                                                            }}
                                                                        >
                                                                            <FileText className="h-4 w-4" />
                                                                        </Button>

                                                                        <DeviceTokenModal
                                                                            employeeId={employee.id}
                                                                            employeeName={employee.name}
                                                                            employeeEmail={employee.email}
                                                                        />

                                                                        <EmployeeActionsMenu
                                                                            employee={employee}
                                                                            onEdit={handleEmployeeEdit}
                                                                            onDelete={handleEmployeeDelete}
                                                                        />
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        </tbody>
                                                    </table>
                                                </ScrollableList>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Empty state when no employees have activity */}
                                {activeEmployees.length === 0 && noActivityEmployees.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <h4 className="text-lg font-medium mb-2">No employees found</h4>
                                        <p className="text-sm">
                                            Try adjusting your filters or add new employees.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {selectedEmployeeId && (
                <EditEmployeeModal
                    employeeId={selectedEmployeeId}
                    open={editModalOpen}
                    onOpenChange={setEditModalOpen}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: queryKeys.employees.all })
                    }}
                />
            )}
        </>
    )
}

function EmployeeListSkeleton() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Team Members
                </CardTitle>
                <CardDescription>Loading employees...</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={`employee-list-skeleton-${i}`} className="flex items-center space-x-4 p-4 border rounded-lg">
                            <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                                <div className="h-3 w-48 bg-muted rounded animate-pulse" />
                            </div>
                            <div className="flex space-x-2">
                                <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                                <div className="h-6 w-20 bg-muted rounded animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
