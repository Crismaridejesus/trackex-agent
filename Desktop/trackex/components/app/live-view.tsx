"use client"

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    useLiveViewWithSSE,
    useRequestLiveScreenshot,
} from "@/hooks/queries/use-live-view";
import { useTeams } from "@/hooks/queries/use-teams";
import { useTimezone } from "@/hooks/use-timezone";
import { useToast } from "@/hooks/use-toast";
import type { FinishedSession, OnlineEmployee } from "@/lib/api/live.api";
import { fmtTime } from "@/lib/time";
import { formatDuration, formatRelativeTime } from "@/lib/utils/format";
import {
    Activity,
    AlertTriangle,
    Clock,
    Laptop,
    Monitor,
    Radio,
    RefreshCw,
    Smartphone,
    User,
    Users,
    Wifi,
    WifiOff,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ScreenshotPopup } from "./screenshot-popup";

// Connection status type
type ConnectionStatus = "connected" | "streaming" | "limited" | "offline"

// Custom hook for internet connectivity detection
function useConnectionStatus(isStreaming: boolean) {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connected")

  useEffect(() => {
    const checkConnectivity = async () => {
      if (!navigator.onLine) {
        setConnectionStatus("offline")
        return
      }

      // If streaming is active, show streaming status
      if (isStreaming) {
        setConnectionStatus("streaming")
        return
      }

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        const res = await fetch("/api/live/online", {
          method: "HEAD",
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        setConnectionStatus(res.ok ? "connected" : "limited")
      } catch {
        setConnectionStatus("limited")
      }
    }

    // Check on mount and periodically
    checkConnectivity()
    const interval = setInterval(checkConnectivity, 30000) // Every 30 seconds

    // Listen for online/offline events
    window.addEventListener("online", checkConnectivity)
    window.addEventListener("offline", () => setConnectionStatus("offline"))

    return () => {
      clearInterval(interval)
      window.removeEventListener("online", checkConnectivity)
      window.removeEventListener("offline", () =>
        setConnectionStatus("offline")
      )
    }
  }, [isStreaming])

  return connectionStatus
}

export function LiveView() {
  const { toast } = useToast()
  const router = useRouter()
  const [screenshotJobId, setScreenshotJobId] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string>("all")
  const { timezone } = useTimezone()

  // Use custom hooks for data fetching
  const { data: teamsData } = useTeams()

  const { data, isLoading, error, refetch, isStreaming, connectionError } =
    useLiveViewWithSSE({ teamId: selectedTeam })

  const connectionStatus = useConnectionStatus(isStreaming)

  // Screenshot mutation using custom hook
  const screenshotMutation = useRequestLiveScreenshot()

  const handleRequestScreenshot = (employeeId: string, deviceId: string) => {
    screenshotMutation.mutate(
      { employeeId, deviceId },
      {
        onSuccess: (data) => {
          toast({
            title: "Screenshot Requested",
            description: "Manual screenshot request sent successfully",
          })
          setScreenshotJobId(data.jobId)
        },
        onError: (error: any) => {
          // Check if it's a license tier restriction (403)
          const isLicenseRestriction =
            error?.status === 403 || error?.data?.requiresUpgrade

          if (isLicenseRestriction) {
            toast({
              title: "Upgrade Required",
              description:
                error?.data?.error ||
                "Manual screenshots require Team plan. Visit Billing to upgrade.",
              variant: "destructive",
            })
            // Navigate to billing page after a short delay
            setTimeout(() => router.push("/app/billing"), 2000)
          } else {
            toast({
              title: "Screenshot Failed",
              description:
                error instanceof Error
                  ? error.message
                  : "Failed to request screenshot",
              variant: "destructive",
            })
          }
        },
      }
    )
  }

  if (isLoading) {
    return <LiveViewSkeleton />
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">Failed to load live data</p>
          {connectionError && (
            <p className="text-sm text-muted-foreground mt-1">
              {connectionError}
            </p>
          )}
          <Button onClick={() => refetch()} className="mt-2">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const online = data?.online || []
  const finishedSessions = data?.finishedSessions || []
  const lastUpdated = data?.lastUpdated || new Date().toISOString()
  const totalActiveTime = data?.totalActiveTime || 0
  const totalIdleTime = data?.totalIdleTime || 0

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "macos":
      case "windows":
      case "linux":
        return <Laptop className="h-4 w-4" />
      case "simulator":
        return <Monitor className="h-4 w-4" />
      default:
        return <Smartphone className="h-4 w-4" />
    }
  }

  // Calculate summary statistics
  const totalActiveEmployees = online.length

  // Determine styling based on productivity status
  const getProductivityStyles = (productivityStatus: string) => {
    switch (productivityStatus) {
      case "unproductive":
        return {
          borderColor: "border-red-300",
          bgColor: "bg-red-50",
          iconBg: "bg-red-100",
          iconText: "text-red-600",
          badgeBg: "bg-red-100",
          badgeText: "text-red-700",
          label: "Unproductive",
        }
      case "idle":
        return {
          borderColor: "border-yellow-300",
          bgColor: "bg-yellow-50",
          iconBg: "bg-yellow-100",
          iconText: "text-yellow-600",
          badgeBg: "bg-yellow-100",
          badgeText: "text-yellow-700",
          label: "Idle",
        }
      case "neutral":
        return {
          borderColor: "border-gray-300",
          bgColor: "bg-gray-50",
          iconBg: "bg-gray-100",
          iconText: "text-gray-600",
          badgeBg: "bg-gray-100",
          badgeText: "text-gray-700",
          label: "Neutral",
        }
      case "productive":
      default:
        return {
          borderColor: "border-green-300",
          bgColor: "",
          iconBg: "bg-green-100",
          iconText: "text-green-600",
          badgeBg: "bg-green-100",
          badgeText: "text-green-700",
          label: "Productive",
        }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Live Activity Monitor
          </h2>
          <p className="text-muted-foreground">
            Real-time view of employee activity
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teamsData?.teams?.map((team: { id: string; name: string }) => (
                <SelectItem key={`team-select-item-${team.id}`} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Now</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActiveEmployees}</div>
            <p className="text-xs text-muted-foreground">employees active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Time Today
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(totalActiveTime)}
            </div>
            <p className="text-xs text-muted-foreground">
              combined active time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Idle Time Today
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(totalIdleTime)}
            </div>
            <p className="text-xs text-muted-foreground">combined idle time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Status</CardTitle>
            {connectionStatus === "streaming" && (
              <Radio className="h-4 w-4 text-green-500 animate-pulse" />
            )}
            {connectionStatus === "connected" && (
              <Wifi className="h-4 w-4 text-muted-foreground" />
            )}
            {connectionStatus === "limited" && (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            )}
            {connectionStatus === "offline" && (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge
                variant="outline"
                className={`flex items-center space-x-1 ${
                  connectionStatus === "streaming"
                    ? "border-green-200 bg-green-50"
                    : connectionStatus === "connected"
                      ? "border-green-200 bg-green-50"
                      : connectionStatus === "limited"
                        ? "border-yellow-200 bg-yellow-50"
                        : "border-red-200 bg-red-50"
                }`}
              >
                {connectionStatus === "streaming" && (
                  <Radio className="w-3 h-3 text-green-500" />
                )}
                {connectionStatus === "connected" && (
                  <Wifi className="w-3 h-3 text-green-500" />
                )}
                {connectionStatus === "limited" && (
                  <AlertTriangle className="w-3 h-3 text-yellow-500" />
                )}
                {connectionStatus === "offline" && (
                  <WifiOff className="w-3 h-3 text-red-500" />
                )}
                <span
                  className={`text-xs ${
                    connectionStatus === "streaming" ||
                    connectionStatus === "connected"
                      ? "text-green-700"
                      : connectionStatus === "limited"
                        ? "text-yellow-700"
                        : "text-red-700"
                  }`}
                >
                  {connectionStatus === "streaming" && "Live Streaming"}
                  {connectionStatus === "connected" && "Polling"}
                  {connectionStatus === "limited" && "Limited"}
                  {connectionStatus === "offline" && "Offline"}
                </span>
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {connectionStatus === "streaming" &&
                `Real-time updates • Last: ${formatRelativeTime(lastUpdated)}`}
              {connectionStatus === "connected" &&
                `Last update: ${formatRelativeTime(lastUpdated)}`}
              {connectionStatus === "limited" &&
                "API connection issues detected"}
              {connectionStatus === "offline" && "No internet connection"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Online Employees */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5 text-green-500" />
            Online Now ({online.length})
          </CardTitle>
          <CardDescription>
            Employees currently active and working
          </CardDescription>
        </CardHeader>
        <CardContent>
          {online.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No employees are currently online
            </div>
          ) : (
            <div className="space-y-4">
              {[...online]
                .sort((a, b) => {
                  const statusOrder: Record<string, number> = {
                    unproductive: 0,
                    idle: 1,
                    productive: 2,
                    neutral: 3,
                  }
                  const statusA = a.productivityStatus || "neutral"
                  const statusB = b.productivityStatus || "neutral"
                  const orderDiff =
                    (statusOrder[statusA] ?? 3) - (statusOrder[statusB] ?? 3)
                  if (orderDiff === 0) {
                    return a.employeeName.localeCompare(b.employeeName)
                  }
                  return orderDiff
                })
                .map(
                  (
                    employee: OnlineEmployee & { productivityStatus?: string }
                  ) => {
                    const styles = getProductivityStyles(
                      employee.productivityStatus || "neutral"
                    )

                    return (
                      <div
                        key={`online-employee-${employee.employeeId}`}
                        className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer ${styles.borderColor} ${styles.bgColor}`}
                        onClick={() =>
                          router.push(`/app/employees/${employee.employeeId}`)
                        }
                      >
                        <div className="flex items-center space-x-4">
                          <div
                            className={`flex items-center justify-center w-10 h-10 rounded-full ${styles.iconBg} ${styles.iconText}`}
                          >
                            <User className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {employee.employeeName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {employee.team?.name || "No team"} •{" "}
                              {employee.employeeEmail}
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              {getPlatformIcon(employee.platform)}
                              <span className="text-sm text-muted-foreground">
                                {employee.deviceName}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <Badge
                            variant="secondary"
                            className={`${styles.badgeBg} ${styles.badgeText} font-semibold`}
                          >
                            {styles.label}
                          </Badge>
                          <div className="text-sm text-muted-foreground min-w-[80px]">
                            {formatRelativeTime(employee.lastSeen)}
                          </div>
                          <div className="flex items-center space-x-2 min-w-[200px]">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRequestScreenshot(
                                  employee.employeeId,
                                  employee.deviceId
                                )
                              }}
                              disabled={
                                screenshotMutation.isPending ||
                                !employee.canRequestScreenshot
                              }
                              title={
                                !employee.canRequestScreenshot
                                  ? "Manual screenshots require Team plan"
                                  : "Take screenshot"
                              }
                            >
                              📸
                            </Button>
                            {employee.currentApp ? (
                              <div className="flex flex-col">
                                <span className="text-base font-semibold text-blue-700">
                                  {employee.currentApp.name}
                                  {employee.currentApp.domain && (
                                    <span className="text-sm font-normal text-blue-500 ml-1">
                                      • {employee.currentApp.domain}
                                    </span>
                                  )}
                                </span>
                                {employee.currentApp.window_title &&
                                  !employee.currentApp.domain && (
                                    <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                                      {employee.currentApp.window_title}
                                    </span>
                                  )}
                              </div>
                            ) : (
                              <span className="text-base text-muted-foreground">
                                No app
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  }
                )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recently Finished Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5 text-blue-500" />
            Recently Finished Sessions
          </CardTitle>
          <CardDescription>Completed work sessions from today</CardDescription>
        </CardHeader>
        <CardContent>
          {finishedSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No completed sessions today
            </div>
          ) : (
            <div className="space-y-4">
              {finishedSessions.slice(0, 10).map((session: FinishedSession) => (
                <div
                  key={`finished-session-${session.sessionId}`}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium">{session.employeeName}</div>
                      <div className="text-sm text-muted-foreground">
                        {session.team?.name || "No team"} •{" "}
                        {session.employeeEmail}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        {getPlatformIcon(session.device.platform)}
                        <span className="text-sm text-muted-foreground">
                          {session.device.deviceName}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {formatDuration(session.totalWork || 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {fmtTime(new Date(session.clockIn), timezone)} -{" "}
                      {fmtTime(new Date(session.clockOut), timezone)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Active: {formatDuration(session.activeTime || 0)} • Idle:{" "}
                      {session.idleTime != null
                        ? formatDuration(session.idleTime)
                        : "--"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Screenshot Popup */}
      <ScreenshotPopup
        jobId={screenshotJobId}
        onClose={() => setScreenshotJobId(null)}
      />
    </div>
  )
}

function LiveViewSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Online Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`live-view-skeleton-${i}`}
                className="flex items-center space-x-4 p-4 border rounded-lg"
              >
                <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-6 w-16 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
