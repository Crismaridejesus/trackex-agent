"use client"

import { EmployeeAppUsage } from "@/components/app/employee-app-usage";
import { EmployeeScreenshots } from "@/components/app/employee-screenshots";
import { AdvancedDateRangePicker } from "@/components/ui/advanced-date-range-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useEmployee, useEmployeeAnalytics } from "@/hooks/queries";
import { useTeams } from "@/hooks/queries/use-teams";
import { useTimezone } from "@/hooks/use-timezone";
import { useToast } from "@/hooks/use-toast";
import { Device, employeesApi, WorkSession } from "@/lib/api/employees.api";
import { queryKeys } from "@/lib/query-keys";
import { fmtDate, fmtTime } from "@/lib/time";
import { formatDuration, formatPercentage } from "@/lib/utils/format";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { subDays } from "date-fns";
import {
    Activity,
    ArrowLeft,
    Building,
    Calendar,
    Clock,
    Coffee,
    Edit,
    Mail,
    Save,
    Settings,
    TrendingUp,
    User,
    X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";

interface EmployeeDetailViewProps {
  employeeId: string
}

export function EmployeeDetailView({
  employeeId,
}: Readonly<EmployeeDetailViewProps>) {
  const router = useRouter()
  const { timezone } = useTimezone()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  })
  const [isEditingScreenshots, setIsEditingScreenshots] = useState(false)
  const [screenshotSettings, setScreenshotSettings] = useState({
    autoScreenshots: false,
    screenshotInterval: 30,
  })

  // Employee edit state
  const [isEditingEmployee, setIsEditingEmployee] = useState(false)
  const [employeeForm, setEmployeeForm] = useState({
    name: "",
    teamId: "",
  })

  const {
    data: employeeData,
    isLoading: isLoadingEmployee,
    error: employeeError,
  } = useEmployee(employeeId)
  const { data: teamsData } = useTeams()
  const teams = teamsData?.teams || []

  // Mutation for updating employee info (name, team)
  const updateEmployeeMutation = useMutation({
    mutationFn: (data: { name: string; teamId: string | null }) =>
      employeesApi.update(employeeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.employees.detail(employeeId),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.list() })
      toast({
        title: "Employee updated",
        description: "Employee information has been updated successfully.",
      })
      setIsEditingEmployee(false)
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const updateScreenshotsMutation = useMutation({
    mutationFn: (settings: {
      autoScreenshots: boolean
      screenshotInterval: number | null
    }) => employeesApi.update(employeeId, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.employees.detail(employeeId),
      })
      toast({
        title: "Settings updated",
        description:
          "Screenshot settings have been updated successfully. Changes will take effect on the desktop agent within 5 minutes.",
      })
      setIsEditingScreenshots(false)
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const { data: analyticsData, isLoading: isLoadingAnalytics } =
    useEmployeeAnalytics(
      employeeId,
      {
        startDate: dateRange?.from?.toISOString(),
        endDate: dateRange?.to?.toISOString(),
      },
      {
        enabled: !!dateRange?.from && !!dateRange?.to,
      }
    )

  // Sync screenshot settings when employee data loads
  useEffect(() => {
    if (employeeData?.employee) {
      setScreenshotSettings({
        autoScreenshots: employeeData.employee.autoScreenshots ?? false,
        screenshotInterval: employeeData.employee.screenshotInterval ?? 30,
      })
      // Sync employee form
      setEmployeeForm({
        name: employeeData.employee.name || "",
        teamId: employeeData.employee.team?.id || "",
      })
    }
  }, [employeeData?.employee])

  const handleEditEmployee = () => {
    if (employeeData?.employee) {
      setEmployeeForm({
        name: employeeData.employee.name || "",
        teamId: employeeData.employee.team?.id || "",
      })
    }
    setIsEditingEmployee(true)
  }

  const handleCancelEmployeeEdit = () => {
    setIsEditingEmployee(false)
    if (employeeData?.employee) {
      setEmployeeForm({
        name: employeeData.employee.name || "",
        teamId: employeeData.employee.team?.id || "",
      })
    }
  }

  const handleSaveEmployee = () => {
    updateEmployeeMutation.mutate({
      name: employeeForm.name,
      teamId: employeeForm.teamId || null,
    })
  }

  const handleEditScreenshots = () => {
    if (employeeData?.employee) {
      setScreenshotSettings({
        autoScreenshots: employeeData.employee.autoScreenshots ?? false,
        screenshotInterval: employeeData.employee.screenshotInterval ?? 30,
      })
    }
    setIsEditingScreenshots(true)
  }

  const handleCancelEdit = () => {
    setIsEditingScreenshots(false)
    if (employeeData?.employee) {
      setScreenshotSettings({
        autoScreenshots: employeeData.employee.autoScreenshots ?? false,
        screenshotInterval: employeeData.employee.screenshotInterval ?? 30,
      })
    }
  }

  const handleSaveScreenshots = () => {
    updateScreenshotsMutation.mutate({
      autoScreenshots: screenshotSettings.autoScreenshots,
      screenshotInterval: screenshotSettings.autoScreenshots
        ? screenshotSettings.screenshotInterval
        : null,
    })
  }

  if (isLoadingEmployee) {
    return <EmployeeDetailSkeleton />
  }

  if (employeeError || !employeeData?.employee) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-destructive">
            <p>Failed to load employee details. Please try again.</p>
            <Button
              className="mt-4"
              onClick={() => router.push("/app/employees")}
            >
              Back to Employees
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const employee = employeeData.employee
  const analytics =
    analyticsData?.analytics?.totals ||
    ({} as {
      totalWork?: number
      activeTime?: number
      idleTime?: number
      productivityScore?: number
      productiveTime?: number
    })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/app/employees">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Employees
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{employee.name}</h1>
            <p className="text-muted-foreground">Employee Details</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <AdvancedDateRangePicker
            date={dateRange}
            onDateChange={setDateRange}
          />
        </div>
      </div>

      {/* Analytics Summary */}
      {isLoadingAnalytics ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => {
            const key = `analytics-summary-skeleton-${i}`
            return (
              <Card key={key}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-20 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Work Time
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatDuration(analytics.totalWork || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                In selected period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Time</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatDuration(analytics.activeTime || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatPercentage(
                  (analytics.activeTime || 0) /
                    Math.max(analytics.totalWork || 1, 1)
                )}{" "}
                of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Idle Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatDuration(analytics.idleTime || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatPercentage(
                  (analytics.idleTime || 0) /
                    Math.max(analytics.totalWork || 1, 1)
                )}{" "}
                of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Productivity
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatPercentage((analytics.productivityScore || 0) / 100)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDuration(analytics.productiveTime || 0)} productive
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Basic Information
            </CardTitle>
            {!isEditingEmployee && (
              <Button variant="ghost" size="sm" onClick={handleEditEmployee}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {!isEditingEmployee ? (
              <>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Name:</span>
                  <span>{employee.name}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Email:</span>
                  <span>{employee.email}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Team:</span>
                  <span>{employee.team?.name || "No Team"}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Joined:</span>
                  <span>{fmtDate(new Date(employee.createdAt), timezone)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="employee-name">Name</Label>
                  <Input
                    id="employee-name"
                    value={employeeForm.name}
                    onChange={(e) =>
                      setEmployeeForm({ ...employeeForm, name: e.target.value })
                    }
                    placeholder="Employee name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employee-team">Team</Label>
                  <Select
                    value={employeeForm.teamId || "no-team"}
                    onValueChange={(value) =>
                      setEmployeeForm({
                        ...employeeForm,
                        teamId: value === "no-team" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-team">No Team</SelectItem>
                      {teams.map((team: { id: string; name: string }) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">
                    Email: {employee.email} (cannot be changed)
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEmployeeEdit}
                    disabled={updateEmployeeMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEmployee}
                    disabled={
                      updateEmployeeMutation.isPending ||
                      !employeeForm.name.trim()
                    }
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {updateEmployeeMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Settings & Statistics */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Settings & Statistics</CardTitle>
            {!isEditingScreenshots && (
              <Button variant="ghost" size="sm" onClick={handleEditScreenshots}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="font-medium">Total Devices:</span>
              <Badge variant="outline">{employee?.devices?.length || 0}</Badge>
            </div>

            <div className="flex justify-between">
              <span className="font-medium">Total Sessions:</span>
              <Badge variant="outline">{employee._count?.sessions || 0}</Badge>
            </div>

            <div className="border-t pt-4 space-y-4">
              {!isEditingScreenshots ? (
                <>
                  <div className="flex justify-between">
                    <span className="font-medium">Auto Screenshots:</span>
                    <Badge
                      variant={
                        employee.autoScreenshots ? "default" : "secondary"
                      }
                    >
                      {employee.autoScreenshots ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>

                  {employee.screenshotInterval && (
                    <div className="flex justify-between">
                      <span className="font-medium">Screenshot Interval:</span>
                      <span>{employee.screenshotInterval} minutes</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-screenshots" className="font-medium">
                        Auto Screenshots
                      </Label>
                      <Switch
                        id="auto-screenshots"
                        checked={screenshotSettings.autoScreenshots}
                        onCheckedChange={(checked) =>
                          setScreenshotSettings((prev) => ({
                            ...prev,
                            autoScreenshots: checked,
                          }))
                        }
                      />
                    </div>

                    {screenshotSettings.autoScreenshots && (
                      <div className="space-y-2">
                        <Label
                          htmlFor="screenshot-interval"
                          className="font-medium"
                        >
                          Screenshot Interval (minutes)
                        </Label>
                        <Input
                          id="screenshot-interval"
                          type="number"
                          min={30}
                          max={120}
                          value={screenshotSettings.screenshotInterval}
                          onChange={(e) => {
                            const value = parseInt(e.target.value)
                            if (!isNaN(value) && value >= 30 && value <= 120) {
                              setScreenshotSettings((prev) => ({
                                ...prev,
                                screenshotInterval: value,
                              }))
                            }
                          }}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          Min: 30 minutes, Max: 120 minutes
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={updateScreenshotsMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveScreenshots}
                      disabled={updateScreenshotsMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {updateScreenshotsMutation.isPending
                        ? "Saving..."
                        : "Save"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Work Sessions</CardTitle>
            <CardDescription>
              Last 10 work sessions for this employee
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!employee.sessions || employee.sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No work sessions recorded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {employee.sessions.map((session: WorkSession) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {fmtDate(new Date(session.clockIn), timezone)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {fmtTime(new Date(session.clockIn), timezone)} -{" "}
                        <span
                          className={
                            session.clockOut
                              ? "text-muted-foreground"
                              : "text-green-600"
                          }
                        >
                          {session.clockOut
                            ? fmtTime(new Date(session.clockOut), timezone)
                            : "Still active"}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">
                          <Activity className="h-3 w-3 mr-1" />
                          {session.activeTime != null
                            ? formatDuration(session.activeTime)
                            : "--"}
                        </Badge>
                        <Badge variant="outline">
                          <Coffee className="h-3 w-3 mr-1" />
                          {session.idleTime != null
                            ? formatDuration(session.idleTime)
                            : "--"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Total Time:{" "}
                        {session.totalWork
                          ? formatDuration(session.totalWork)
                          : "--"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Devices */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Registered Devices</CardTitle>
            <CardDescription>
              Devices registered to this employee
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!employee.devices || employee.devices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No devices registered yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {employee.devices.map((device: Device) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {device.deviceName || device.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {device.platform} • {device.version}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        Last seen:{" "}
                        {fmtDate(new Date(device.lastSeen), timezone)}
                      </p>
                      <Badge
                        variant={device.isActive ? "default" : "secondary"}
                      >
                        {device.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Application Usage Section */}
      <div className="space-y-6">
        {isLoadingAnalytics ? (
          <AppUsageSkeleton />
        ) : (
          <EmployeeAppUsage employeeId={employee.id} dateRange={dateRange} />
        )}
      </div>

      {/* Screenshots Section */}
      <EmployeeScreenshots employeeId={employee.id} dateRange={dateRange} />
    </div>
  )
}

function EmployeeDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="h-8 w-32 bg-muted rounded animate-pulse" />
          <div>
            <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-10 w-80 bg-muted rounded animate-pulse" />
          <div className="h-6 w-16 bg-muted rounded animate-pulse" />
        </div>
      </div>

      {/* Analytics Summary Skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => {
          const key = `analytics-summary-skeleton-${i}`
          return (
            <Card key={key}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-4 w-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-20 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 w-32 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information Skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 w-40 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => {
              const key = `basic-information-skeleton-${i}`
              return (
                <div key={key} className="flex items-center space-x-2">
                  <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Settings & Statistics Skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 w-40 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => {
              const key = `settings-statistics-skeleton-${i}`
              return (
                <div key={key} className="flex justify-between">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Recent Sessions Skeleton */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="h-6 w-40 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => {
                const key = `recent-sessions-skeleton-${i}`
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="h-4 w-32 bg-muted rounded animate-pulse mb-2" />
                      <div className="h-3 w-48 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                        <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                      </div>
                      <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Devices Skeleton */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="h-6 w-40 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => {
                const key = `devices-skeleton-${i}`
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="h-4 w-32 bg-muted rounded animate-pulse mb-2" />
                      <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="text-right">
                      <div className="h-3 w-28 bg-muted rounded animate-pulse mb-1" />
                      <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* App Usage Skeleton */}
      <AppUsageSkeleton />
    </div>
  )
}

function AppUsageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Time Overview Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="h-6 w-32 bg-muted rounded animate-pulse mb-2" />
              <div className="h-4 w-64 bg-muted rounded animate-pulse" />
            </div>
            <div className="flex space-x-2">
              {Array.from({ length: 3 }).map((_, i) => {
                const key = `time-overview-skeleton-${i}`
                return (
                  <div
                    key={key}
                    className="h-8 w-12 bg-muted rounded animate-pulse"
                  />
                )
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => {
              const key = `time-overview-skeleton-${i}`
              return (
                <div
                  key={key}
                  className="flex items-center space-x-3 p-4 border rounded-lg"
                >
                  <div className="p-2 bg-muted rounded-full">
                    <div className="h-5 w-5 bg-muted-foreground/20 rounded animate-pulse" />
                  </div>
                  <div>
                    <div className="h-4 w-20 bg-muted rounded animate-pulse mb-1" />
                    <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Application Usage Skeleton */}
      <Card>
        <CardHeader>
          <div className="h-6 w-40 bg-muted rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => {
              const key = `application-usage-skeleton-${i}`
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                      <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-12 bg-muted rounded animate-pulse" />
                      <div className="h-4 w-8 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-2 w-full bg-muted rounded animate-pulse" />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
