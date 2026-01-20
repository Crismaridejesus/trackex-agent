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
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { subDays } from "date-fns"
import { Activity, BarChart3, Clock, Coffee, Globe } from "lucide-react"
import { useEffect, useState } from "react"

interface AppUsageData {
  appName: string
  appId: string | null
  category: string
  totalDuration: number
  activeDuration: number
  idleDuration: number
  sessions: number
  /** For browser entries, lists domains that contributed to this category */
  domains?: string[]
  /** Whether this is a browser entry (split by category based on domain) */
  isBrowser?: boolean
}

interface AppUsageResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  appUsage: any[]
  statistics: {
    totalDuration: number
    activeDuration: number
    idleDuration: number
    totalSessions: number
  }
  appSummary: AppUsageData[]
}

import { DateRange } from "react-day-picker"

interface EmployeeAppUsageProps {
  employeeId: string
  dateRange?: DateRange
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }

  const hours = Math.floor(seconds / (60 * 60))
  const minutes = Math.floor((seconds % (60 * 60)) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

// function getCategoryColor(category: string): string {
//   switch (category.toLowerCase()) {
//     case 'productive':
//       return 'bg-green-500'
//     case 'neutral':
//       return 'bg-yellow-500'
//     case 'unproductive':
//       return 'bg-red-500'
//     case 'communication':
//       return 'bg-blue-500'
//     case 'development':
//       return 'bg-purple-500'
//     default:
//       return 'bg-gray-500'
//   }
// }

function getCategoryBadgeVariant(category: string) {
  switch (category.toLowerCase()) {
    case "productive":
      return "default"
    case "neutral":
      return "secondary"
    case "unproductive":
      return "destructive"
    case "communication":
      return "outline"
    default:
      return "secondary"
  }
}

export function EmployeeAppUsage({
  employeeId,
  dateRange: propDateRange,
}: Readonly<EmployeeAppUsageProps>) {
  const [data, setData] = useState<AppUsageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month">("week")
  const [showAllApps, setShowAllApps] = useState(false)

  const fetchAppUsage = async (
    range: "day" | "week" | "month" | "custom",
    customStart?: Date,
    customEnd?: Date
  ) => {
    setLoading(true)
    setError(null)

    try {
      let endDate: Date
      let startDate: Date

      if (range === "custom" && customStart && customEnd) {
        startDate = customStart
        endDate = customEnd
      } else {
        endDate = new Date()

        switch (range) {
          case "day":
            startDate = subDays(endDate, 1)
            break
          case "week":
            startDate = subDays(endDate, 7)
            break
          case "month":
            startDate = subDays(endDate, 30)
            break
          default:
            startDate = subDays(endDate, 7)
        }
      }

      const response = await fetch(
        `/api/employees/${employeeId}/app-usage?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )

      if (!response.ok) {
        throw new Error("Failed to fetch app usage data")
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initial fetch
    if (propDateRange?.from && propDateRange?.to) {
      fetchAppUsage("custom", propDateRange.from, propDateRange.to)
    } else {
      fetchAppUsage(timeRange)
    }

    // Auto-refresh every 15 seconds for near real-time updates
    const intervalId = setInterval(() => {
      if (propDateRange?.from && propDateRange?.to) {
        fetchAppUsage("custom", propDateRange.from, propDateRange.to)
      } else {
        fetchAppUsage(timeRange)
      }
    }, 15000)

    return () => clearInterval(intervalId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, timeRange, propDateRange])

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-64"></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-red-500 opacity-50" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchAppUsage(timeRange)} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Time Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Time Overview
              </CardTitle>
              <CardDescription>
                Total active and idle time breakdown
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              {(["day", "week", "month"] as const).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                >
                  {range === "day" ? "24h" : range === "week" ? "7d" : "30d"}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-4 border rounded-lg">
              <div className="p-2 bg-blue-100 rounded-full">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Time
                </p>
                <p className="text-2xl font-bold">
                  {formatDuration(data.statistics?.totalDuration || 0)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 border rounded-lg">
              <div className="p-2 bg-green-100 rounded-full">
                <Activity className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Time
                </p>
                <p className="text-2xl font-bold">
                  {formatDuration(data.statistics?.activeDuration || 0)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 border rounded-lg">
              <div className="p-2 bg-yellow-100 rounded-full">
                <Coffee className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Idle Time
                </p>
                <p className="text-2xl font-bold">
                  {formatDuration(data.statistics?.idleDuration || 0)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Application Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Application Usage
          </CardTitle>
          <CardDescription>
            Time spent in different applications during active work time (
            {data.appSummary?.length || 0} apps tracked)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!data.appSummary || data.appSummary.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No application usage data available for this time period</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(showAllApps
                ? data.appSummary
                : data.appSummary.slice(0, 10)
              ).map((app) => {
                // Calculate percentage based on active time only (excludes idle time)
                // This represents what % of active work time was spent in each app
                const activeDuration = data.statistics?.activeDuration || 1
                const percentage = (app.activeDuration / activeDuration) * 100

                // For browser entries, create unique key with category
                const uniqueKey = app.isBrowser
                  ? `${app.appName}-${app.category}`
                  : app.appName

                // Format domains for display (show top 3 + count)
                const displayDomains = app.domains?.slice(0, 3).join(", ") || ""
                const extraDomainsCount = (app.domains?.length || 0) - 3

                return (
                  <div key={uniqueKey} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium min-w-[200px] truncate">
                          {app.appName}
                        </span>
                        <Badge
                          variant={getCategoryBadgeVariant(app.category)}
                          className="text-xs"
                        >
                          {app.category}
                        </Badge>
                        {/* Show domain indicator for browser entries */}
                        {app.isBrowser &&
                          app.domains &&
                          app.domains.length > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center text-xs text-muted-foreground cursor-help">
                                    <Globe className="h-3 w-3 mr-1" />
                                    <span className="max-w-[200px] truncate">
                                      {displayDomains}
                                      {extraDomainsCount > 0 &&
                                        ` +${extraDomainsCount}`}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="bottom"
                                  className="max-w-[300px]"
                                >
                                  <p className="font-medium mb-1">
                                    Domains visited:
                                  </p>
                                  <ul className="text-xs space-y-0.5">
                                    {app.domains.map((domain) => (
                                      <li key={domain}>{domain}</li>
                                    ))}
                                  </ul>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <span>
                          {app.activeDuration > 59
                            ? formatDuration(app.activeDuration)
                            : app.activeDuration + "s"}
                        </span>
                        <span>({percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Progress value={percentage} className="flex-1 h-2" />
                    </div>
                  </div>
                )
              })}

              {data.appSummary.length > 10 && (
                <div className="text-center pt-4">
                  {!showAllApps ? (
                    <Button
                      variant="outline"
                      onClick={() => setShowAllApps(true)}
                      className="mb-2"
                    >
                      Show All {data.appSummary.length} Apps
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setShowAllApps(false)}
                      className="mb-2"
                    >
                      Show Top 10 Only
                    </Button>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {showAllApps
                      ? `Showing all ${data.appSummary.length} tracked applications.`
                      : `Showing top 10 applications. ${data.appSummary.length - 10} more apps tracked.`}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
