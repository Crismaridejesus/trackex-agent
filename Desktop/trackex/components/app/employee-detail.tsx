"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  useEmployee,
  useEmployeeAnalytics,
  useEmployeeAppUsage,
} from "@/hooks/queries"
import {
  formatDuration,
  formatPercentage,
  formatRelativeTime,
} from "@/lib/utils/format"
import { subDays } from "date-fns"
import {
  Activity,
  ArrowLeft,
  Calendar,
  Camera,
  Clock,
  Key,
  Monitor,
  Smartphone,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"

interface EmployeeDetailProps {
  employeeId: string
}

export function EmployeeDetail({ employeeId }: Readonly<EmployeeDetailProps>) {
  // Calculate date range for last 7 days
  const dateRange = useMemo(
    () => ({
      startDate: subDays(new Date(), 7).toISOString(),
      endDate: new Date().toISOString(),
    }),
    []
  )

  const {
    data: employeeData,
    isLoading: employeeLoading,
    error: employeeError,
  } = useEmployee(employeeId)

  const { data: analyticsData, isLoading: analyticsLoading } =
    useEmployeeAnalytics(employeeId, dateRange)

  const { data: appUsageData, isLoading: appUsageLoading } =
    useEmployeeAppUsage(employeeId, dateRange)

  if (employeeLoading || analyticsLoading || appUsageLoading) {
    return <EmployeeDetailSkeleton />
  }

  if (employeeError) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">Failed to load employee data</p>
          <Button asChild className="mt-4">
            <Link href="/app/employees">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Employees
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { employee } = employeeData || {}
  const { analytics } = analyticsData || {}
  const { statistics, appSummary } = appUsageData || {}

  if (!employee) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Employee not found</p>
        </CardContent>
      </Card>
    )
  }

  const totals =
    analytics?.totals ||
    ({} as { totalWork?: number; activeTime?: number; idleTime?: number })
  const topApps = appSummary || analytics?.topApps || []
  const appStats =
    statistics ||
    ({} as {
      totalDuration?: number
      activeDuration?: number
      idleDuration?: number
    })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/app/employees">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">
              {employee.name}
            </h1>
            <Badge variant={employee.isActive ? "default" : "secondary"}>
              {employee.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {employee.email} • {employee.team?.name || "No team"}
          </p>
        </div>
        <Button>
          <Camera className="mr-2 h-4 w-4" />
          Request Screenshot
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Work Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(appStats.totalDuration || totals.totalWork || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatDuration(
                appStats.activeDuration || totals.activeTime || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(
                (appStats.activeDuration || 0) /
                  Math.max(appStats.totalDuration || 1, 1)
              )}{" "}
              of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Idle Time</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatDuration(appStats.idleDuration || 0)} -{" "}
              {appStats.idleDuration}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(
                (appStats.idleDuration || 0) /
                  Math.max(appStats.totalDuration || 1, 1)
              )}{" "}
              of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Screenshots</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employee._count?.screenshots || 0}
            </div>
            <p className="text-xs text-muted-foreground">Total captured</p>
          </CardContent>
        </Card>
      </div>

      {/* App Usage & Devices */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Applications</CardTitle>
            <CardDescription>Most used applications this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topApps.slice(0, 5).map(
                (
                  app: {
                    appName: string
                    activeDuration?: number
                    activeTime?: number
                    totalDuration?: number
                    idleDuration?: number
                    category: string
                    sessions?: number
                  },
                  index: number
                ) => (
                  <div
                    key={app.appName}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{app.appName}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDuration(
                            app.activeDuration ||
                              app.activeTime ||
                              app.totalDuration ||
                              0
                          )}
                          {app.idleDuration && app.idleDuration > 0 && (
                            <span className="text-orange-500 ml-1">
                              (+{formatDuration(app.idleDuration || 0)} idle)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <Badge
                        variant={
                          app.category === "PRODUCTIVE"
                            ? "default"
                            : app.category === "NEUTRAL"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {app.category.toLowerCase()}
                      </Badge>
                      {app.sessions && (
                        <span className="text-xs text-muted-foreground">
                          {app.sessions} sessions
                        </span>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Devices</CardTitle>
            <CardDescription>
              Employee&apos;s registered devices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employee.devices?.map(
                (device: {
                  id: string
                  deviceName: string
                  platform: string
                  lastSeen: string
                  isActive: boolean
                }) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      {device.platform === "macos" ||
                      device.platform === "windows" ? (
                        <Monitor className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Smartphone className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">{device.deviceName}</p>
                        <p className="text-sm text-muted-foreground">
                          {device.platform} • Last seen{" "}
                          {formatRelativeTime(device.lastSeen)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={device.isActive ? "default" : "secondary"}
                      >
                        {device.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Key className="mr-1 h-3 w-3" />
                        Token
                      </Button>
                    </div>
                  </div>
                )
              ) || (
                <p className="text-muted-foreground text-center py-4">
                  No devices registered
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
          <CardDescription>Work sessions from the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(employee._count?.sessions ?? 0) > 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Session data will be displayed here</p>
                <p className="text-sm">API integration in progress</p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No work sessions found</p>
                <p className="text-sm">
                  Sessions will appear here once the employee starts tracking
                  time
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function EmployeeDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="h-8 w-8 bg-muted rounded animate-pulse" />
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-6 w-16 bg-muted rounded animate-pulse" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => {
          const key = `kpi-card-skeleton-${i}`
          return (
            <Card key={key}>
              <CardHeader className="pb-2">
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 w-24 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
