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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Building2,
  CreditCard,
  Loader2,
  MoreVertical,
  Search,
  Shield,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Organization {
  id: string
  name: string
  slug: string
  email: string
  companySize: string | null
  isBetaTester: boolean
  bypassPayment: boolean
  isActive: boolean
  createdAt: string
  subscription: {
    status: string
    quantity: number
    currentPeriodEnd: string
  } | null
  _count: {
    employees: number
    licenses: number
    users: number
  }
}

interface Summary {
  total: number
  active: number
  betaTesters: number
  bypassPayment: number
  withSubscription: number
}

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchOrganizations = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      params.set("includeInactive", "true")

      const response = await fetch(`/api/admin/organizations?${params}`)
      if (!response.ok) throw new Error("Failed to fetch")

      const data = await response.json()
      setOrganizations(data.organizations)
      setSummary(data.summary)
    } catch (error) {
      console.error("Failed to fetch organizations:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganizations()
  }, [search])

  const toggleBeta = async (orgId: string, enabled: boolean) => {
    setActionLoading(orgId)
    try {
      const response = await fetch(`/api/admin/organizations/${orgId}/beta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, bypassPayment: enabled }),
      })

      if (!response.ok) throw new Error("Failed to update")

      await fetchOrganizations()
    } catch (error) {
      console.error("Failed to toggle beta:", error)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
        <p className="text-muted-foreground">
          Manage all organizations on the platform
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summary.active}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Beta Testers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {summary.betaTesters}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Bypass Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {summary.bypassPayment}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                With Subscription
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {summary.withSubscription}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Organizations List */}
      <Card>
        <CardHeader>
          <CardTitle>All Organizations</CardTitle>
          <CardDescription>
            {organizations.length} organizations found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {organizations.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{org.name}</span>
                      {!org.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                      {org.isBetaTester && (
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200"
                        >
                          Beta
                        </Badge>
                      )}
                      {org.bypassPayment && !org.isBetaTester && (
                        <Badge
                          variant="outline"
                          className="bg-orange-50 text-orange-700 border-orange-200"
                        >
                          Bypass
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {org.email} • {org.slug}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {org._count.employees} employees
                      </span>
                      <span className="flex items-center gap-1">
                        <CreditCard className="h-4 w-4" />
                        {org._count.licenses} licenses
                      </span>
                    </div>
                    {org.subscription && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Subscription: {org.subscription.status} •{" "}
                        {org.subscription.quantity} seats
                      </div>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={actionLoading === org.id}
                      >
                        {actionLoading === org.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreVertical className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => toggleBeta(org.id, !org.isBetaTester)}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        {org.isBetaTester ? "Disable Beta" : "Enable Beta"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => {
                          // TODO: Implement deactivate
                        }}
                      >
                        <X className="mr-2 h-4 w-4" />
                        {org.isActive ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}

            {organizations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No organizations found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
