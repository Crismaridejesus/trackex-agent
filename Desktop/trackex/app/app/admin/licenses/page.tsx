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
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useQuery } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  Check,
  CheckCircle,
  Eye,
  Key,
  Loader2,
  MoreVertical,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  User,
  XCircle,
} from "lucide-react"
import { useMemo, useState } from "react"

interface Employee {
  id: string
  name: string
  email: string
  isActive: boolean
  hasLicense: boolean
  organization: {
    id: string
    name: string
  }
  license?: {
    id: string
    status: string
    source: string
    tier: string | null
    includesAutoScreenshots?: boolean
    activatedAt: string | null
    expiresAt: string | null
  } | null
}

interface Organization {
  id: string
  name: string
  slug: string
}

export default function AdminLicensesPage() {
  const { toast } = useToast()
  
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(
    new Set()
  )
  const [source, setSource] = useState<"MANUAL" | "BETA_BYPASS">("MANUAL")
  const [tier, setTier] = useState<"STARTER" | "TEAM">("TEAM")
  const [includeAutoScreenshots, setIncludeAutoScreenshots] = useState(false)
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedOrgId, setSelectedOrgId] = useState<string>("all")
  const [result, setResult] = useState<{
    success: boolean
    message: string
    activated?: number
    failed?: number
  } | null>(null)

  // Modal states
  const [deactivatingLicense, setDeactivatingLicense] = useState<{
    license: Employee["license"]
    employee: Employee
  } | null>(null)
  const [removingAddOn, setRemovingAddOn] = useState<{
    license: Employee["license"]
    employee: Employee
  } | null>(null)
  const [reactivatingLicense, setReactivatingLicense] = useState<{
    license: Employee["license"]
    employee: Employee
  } | null>(null)
  const [activationConfirm, setActivationConfirm] = useState(false)
  const [bulkDeactivateConfirm, setBulkDeactivateConfirm] = useState(false)
  const [bulkRemoveAddOnConfirm, setBulkRemoveAddOnConfirm] = useState(false)

  // Fetch organizations
  const { data: organizationsData } = useQuery({
    queryKey: ["admin-organizations"],
    queryFn: async () => {
      const response = await fetch("/api/admin/organizations")
      if (!response.ok) throw new Error("Failed to fetch organizations")
      return response.json()
    },
    staleTime: 5 * 60 * 1000,
  })

  const organizations = useMemo(
    () => (organizationsData?.organizations || []) as Organization[],
    [organizationsData]
  )

  // Fetch employees
  const {
    data: employeesData,
    isLoading: loadingEmployees,
    refetch,
  } = useQuery({
    queryKey: ["admin-employees"],
    queryFn: async () => {
      const response = await fetch(
        "/api/employees?limit=1000&includeInactive=true"
      )
      if (!response.ok) throw new Error("Failed to fetch employees")
      return response.json()
    },
    staleTime: 60 * 1000,
  })

  const employees = useMemo(
    () => (employeesData?.employees || []) as Employee[],
    [employeesData]
  )

  // Filter employees by search and organization
  const filteredEmployees = useMemo(() => {
    let filtered = employees

    // Filter by organization
    if (selectedOrgId !== "all") {
      filtered = filtered.filter((e) => e.organization.id === selectedOrgId)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(query) ||
          e.email.toLowerCase().includes(query) ||
          e.organization.name.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [employees, searchQuery, selectedOrgId])

  // Split into licensed and unlicensed
  const { licensedEmployees, unlicensedEmployees } = useMemo(() => {
    const licensed = filteredEmployees.filter((e) => e.hasLicense)
    const unlicensed = filteredEmployees.filter((e) => !e.hasLicense)
    return { licensedEmployees: licensed, unlicensedEmployees: unlicensed }
  }, [filteredEmployees])

  // Compute selected licensed employees with add-ons
  const selectedLicensedWithAddOns = useMemo(() => {
    return licensedEmployees.filter(
      (e) =>
        selectedEmployees.has(e.id) &&
        e.license?.includesAutoScreenshots === true
    )
  }, [licensedEmployees, selectedEmployees])

  const selectedLicensedActive = useMemo(() => {
    return licensedEmployees.filter(
      (e) =>
        selectedEmployees.has(e.id) && e.license?.status === "ACTIVE"
    )
  }, [licensedEmployees, selectedEmployees])

  const toggleEmployee = (employeeId: string) => {
    const newSelection = new Set(selectedEmployees)
    if (newSelection.has(employeeId)) {
      newSelection.delete(employeeId)
    } else {
      newSelection.add(employeeId)
    }
    setSelectedEmployees(newSelection)
  }

  const selectAll = () => {
    const allIds = new Set(filteredEmployees.map((e) => e.id))
    setSelectedEmployees(allIds)
  }

  const deselectAll = () => {
    setSelectedEmployees(new Set())
  }

  const selectAllUnlicensed = () => {
    const unlicensedIds = new Set(unlicensedEmployees.map((e) => e.id))
    setSelectedEmployees(unlicensedIds)
  }

  const activateLicenses = async () => {
    if (selectedEmployees.size === 0) {
      setResult({
        success: false,
        message: "Please select at least one employee",
      })
      return
    }

    // Show confirmation modal instead of directly activating
    setActivationConfirm(true)
  }

  const confirmActivation = async () => {
    setLoading(true)
    setResult(null)
    setActivationConfirm(false)

    try {
      const response = await fetch("/api/admin/licenses/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeIds: Array.from(selectedEmployees),
          source,
          tier,
          includesAutoScreenshots: includeAutoScreenshots,
          notes: notes || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to activate licenses")
      }

      setResult({
        success: true,
        message: `Successfully activated ${data.activated} licenses`,
        activated: data.activated,
        failed: data.failed,
      })

      if (data.activated > 0) {
        setSelectedEmployees(new Set())
        setNotes("")
        refetch()
      }
      
      toast({
        title: "Success",
        description: `Successfully activated ${data.activated} licenses`,
      })
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to activate licenses",
      })
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to activate licenses",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivateLicense = async () => {
    if (!deactivatingLicense) return

    try {
      const response = await fetch(
        `/api/admin/licenses/${deactivatingLicense.license?.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notes: `Deactivated via admin panel`,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to deactivate license")
      }

      toast({
        title: "License Deactivated",
        description: `License for ${deactivatingLicense.employee.name} has been deactivated`,
      })

      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to deactivate license",
        variant: "destructive",
      })
    } finally {
      setDeactivatingLicense(null)
    }
  }

  const handleRemoveAddOn = async () => {
    if (!removingAddOn) return

    try {
      const response = await fetch(
        `/api/admin/licenses/${removingAddOn.license?.id}/addons`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            includesAutoScreenshots: false,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove add-on")
      }

      toast({
        title: "Add-on Removed",
        description: `Auto-screenshots removed for ${removingAddOn.employee.name}`,
      })

      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove add-on",
        variant: "destructive",
      })
    } finally {
      setRemovingAddOn(null)
    }
  }

  const handleReactivateLicense = async () => {
    if (!reactivatingLicense) return

    try {
      const response = await fetch(
        `/api/admin/licenses/${reactivatingLicense.license?.id}/reactivate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notes: `Reactivated via admin panel`,
            extendExpiry: true,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to reactivate license")
      }

      toast({
        title: "License Reactivated",
        description: `License for ${reactivatingLicense.employee.name} has been reactivated`,
      })

      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reactivate license",
        variant: "destructive",
      })
    } finally {
      setReactivatingLicense(null)
    }
  }

  const handleBulkDeactivate = async () => {
    setBulkDeactivateConfirm(false)

    try {
      let deactivated = 0
      const errors: string[] = []

      for (const emp of selectedLicensedActive) {
        try {
          const response = await fetch(`/api/admin/licenses/${emp.license?.id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              notes: `Bulk deactivated via admin panel`,
            }),
          })

          if (response.ok) {
            deactivated++
          } else {
            errors.push(emp.name)
          }
        } catch {
          errors.push(emp.name)
        }
      }

      toast({
        title: "Bulk Deactivation Complete",
        description: `Successfully deactivated ${deactivated} license${deactivated !== 1 ? "s" : ""}${errors.length > 0 ? `. Failed: ${errors.length}` : ""}`,
        variant: errors.length > 0 ? "destructive" : "default",
      })

      setSelectedEmployees(new Set())
      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to deactivate licenses",
        variant: "destructive",
      })
    }
  }

  const handleBulkRemoveAddOn = async () => {
    setBulkRemoveAddOnConfirm(false)

    try {
      let removed = 0
      const errors: string[] = []

      for (const emp of selectedLicensedWithAddOns) {
        try {
          const response = await fetch(
            `/api/admin/licenses/${emp.license?.id}/addons`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                includesAutoScreenshots: false,
              }),
            }
          )

          if (response.ok) {
            removed++
          } else {
            errors.push(emp.name)
          }
        } catch {
          errors.push(emp.name)
        }
      }

      toast({
        title: "Bulk Add-on Removal Complete",
        description: `Removed screenshots from ${removed} license${removed !== 1 ? "s" : ""}${errors.length > 0 ? `. Failed: ${errors.length}` : ""}`,
        variant: errors.length > 0 ? "destructive" : "default",
      })

      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove add-ons",
        variant: "destructive",
      })
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "STRIPE":
        return <Badge className="bg-purple-100 text-purple-800">STRIPE</Badge>
      case "MANUAL":
        return <Badge className="bg-blue-100 text-blue-800">MANUAL</Badge>
      case "BETA_BYPASS":
        return (
          <Badge className="bg-orange-100 text-orange-800">BETA_BYPASS</Badge>
        )
      case "TRIAL":
        return <Badge className="bg-green-100 text-green-800">TRIAL</Badge>
      default:
        return <Badge variant="outline">{source}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="default">ACTIVE</Badge>
      case "INACTIVE":
        return <Badge variant="secondary">INACTIVE</Badge>
      case "EXPIRED":
        return <Badge variant="destructive">EXPIRED</Badge>
      case "PENDING":
        return <Badge variant="outline">PENDING</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          License Management
        </h1>
        <p className="text-muted-foreground">
          Activate or manage employee licenses across your organization
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Licensed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {employees.filter((e) => e.hasLicense).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unlicensed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {employees.filter((e) => !e.hasLicense).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Selected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {selectedEmployees.size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* License Activation Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Bulk License Activation
          </CardTitle>
          <CardDescription>
            Select employees below and activate their licenses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">License Source</label>
              <Select value={source} onValueChange={(v) => setSource(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Manual (Super Admin)
                    </div>
                  </SelectItem>
                  <SelectItem value="BETA_BYPASS">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Beta Bypass
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">License Tier</label>
              <Select value={tier} onValueChange={(v) => setTier(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STARTER">
                    <div className="flex items-center gap-2">
                      Starter Tier
                    </div>
                  </SelectItem>
                  <SelectItem value="TEAM">
                    <div className="flex items-center gap-2">
                      Team Tier
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Input
                placeholder="Reason for activation..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Add-ons</Label>
            <div className="flex items-center space-x-2 p-3 rounded-lg border bg-muted/50">
              <Checkbox
                id="auto-screenshots"
                checked={includeAutoScreenshots}
                onCheckedChange={(checked) =>
                  setIncludeAutoScreenshots(checked === true)
                }
                disabled={loading}
              />
              <label
                htmlFor="auto-screenshots"
                className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                <Camera className="h-4 w-4" />
                Auto Screenshots
                <span className="text-xs text-muted-foreground">
                  (+$1.50/seat/month)
                </span>
              </label>
            </div>
          </div>

          {result && (
            <div
              className={`p-3 rounded-md flex items-start gap-2 ${
                result.success
                  ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"
              }`}
            >
              {result.success ? (
                <CheckCircle className="h-5 w-5 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 mt-0.5" />
              )}
              <div>
                <p className="font-medium">{result.message}</p>
                {result.failed && result.failed > 0 && (
                  <p className="text-sm mt-1">
                    {result.failed} failed to activate
                  </p>
                )}
              </div>
            </div>
          )}

          <Button
            onClick={activateLicenses}
            disabled={loading || selectedEmployees.size === 0}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Activating...
              </>
            ) : (
              <>
                <Key className="mr-2 h-4 w-4" />
                Activate {selectedEmployees.size} License
                {selectedEmployees.size !== 1 ? "s" : ""} ({tier}
                {includeAutoScreenshots ? " + Screenshots" : ""})
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Employee Selection Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Employee Selection</CardTitle>
              <CardDescription>
                Select employees to activate licenses
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Filter by organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organizations</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingEmployees ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">
                Loading employees...
              </span>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No employees found
            </div>
          ) : (
            <div className="space-y-6">
              {/* Bulk Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  disabled={loading}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllUnlicensed}
                  disabled={loading}
                >
                  Select Unlicensed
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAll}
                  disabled={loading || selectedEmployees.size === 0}
                >
                  Deselect All
                </Button>
                
                {selectedLicensedActive.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setBulkDeactivateConfirm(true)}
                    disabled={loading}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Deactivate {selectedLicensedActive.length} License{selectedLicensedActive.length !== 1 ? "s" : ""}
                  </Button>
                )}
                
                {selectedLicensedWithAddOns.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkRemoveAddOnConfirm(true)}
                    disabled={loading}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Remove Screenshots ({selectedLicensedWithAddOns.length})
                  </Button>
                )}
              </div>

              {/* Unlicensed Employees */}
              {unlicensedEmployees.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <h3 className="text-sm font-semibold text-orange-600">
                      Unlicensed Employees ({unlicensedEmployees.length})
                    </h3>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <ScrollArea className="h-[400px]">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50 sticky top-0 z-10">
                            <tr>
                              <th className="w-12 p-3"></th>
                              <th className="text-left p-3 font-medium">
                                Employee
                              </th>
                              <th className="text-left p-3 font-medium">
                                Organization
                              </th>
                              <th className="text-left p-3 font-medium">
                                Status
                              </th>
                              <th className="text-left p-3 font-medium">
                                License Status
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {unlicensedEmployees.map((employee) => (
                              <tr
                                key={employee.id}
                                className="border-t hover:bg-muted/30 cursor-pointer"
                                onClick={(e) => {
                                  // Don't toggle if clicking on checkbox
                                  if (
                                    (e.target as HTMLElement).closest(
                                      "[role='checkbox']"
                                    )
                                  ) {
                                    return
                                  }
                                  toggleEmployee(employee.id)
                                }}
                              >
                                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={selectedEmployees.has(employee.id)}
                                    onCheckedChange={() =>
                                      toggleEmployee(employee.id)
                                    }
                                    disabled={loading}
                                  />
                                </td>
                                <td className="p-3">
                                  <div>
                                    <p className="font-medium">{employee.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {employee.email}
                                    </p>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <p className="text-sm text-muted-foreground">
                                    {employee.organization.name}
                                  </p>
                                </td>
                                <td className="p-3">
                                  {employee.isActive ? (
                                    <Badge variant="outline">Active</Badge>
                                  ) : (
                                    <Badge variant="secondary">Inactive</Badge>
                                  )}
                                </td>
                                <td className="p-3">
                                  <Badge variant="secondary">No License</Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              )}

              {/* Licensed Employees */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <h3 className="text-sm font-semibold text-green-600">
                    Licensed Employees ({licensedEmployees.length})
                  </h3>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  {licensedEmployees.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px] text-center p-6 bg-muted/20">
                      <CheckCircle className="h-12 w-12 text-muted-foreground/50 mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">
                        No Licensed Employees
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Select unlicensed employees above to activate licenses
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50 sticky top-0 z-10">
                            <tr>
                              <th className="w-12 p-3"></th>
                              <th className="text-left p-3 font-medium">
                                Employee
                              </th>
                              <th className="text-left p-3 font-medium">
                                Organization
                              </th>
                              <th className="text-left p-3 font-medium">
                                Status
                              </th>
                              <th className="text-left p-3 font-medium">
                                License Status
                              </th>
                              <th className="text-left p-3 font-medium">
                                Source
                              </th>
                              <th className="text-left p-3 font-medium">
                                Add-ons
                              </th>
                              <th className="text-left p-3 font-medium">
                                Activated
                              </th>
                              <th className="text-left p-3 font-medium">
                                Expires
                              </th>
                              <th className="text-left p-3 font-medium">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {licensedEmployees.map((employee) => (
                              <tr
                                key={employee.id}
                                className="border-t hover:bg-muted/30 cursor-pointer"
                                onClick={(e) => {
                                  // Don't toggle if clicking on button, dropdown, or checkbox
                                  if (
                                    (e.target as HTMLElement).closest(
                                      "button, [role='checkbox']"
                                    )
                                  ) {
                                    return
                                  }
                                  toggleEmployee(employee.id)
                                }}
                              >
                                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={selectedEmployees.has(employee.id)}
                                    onCheckedChange={() =>
                                      toggleEmployee(employee.id)
                                    }
                                    disabled={loading}
                                  />
                                </td>
                                <td className="p-3">
                                  <div>
                                    <p className="font-medium">{employee.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {employee.email}
                                    </p>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <p className="text-sm text-muted-foreground">
                                    {employee.organization.name}
                                  </p>
                                </td>
                                <td className="p-3">
                                  {employee.isActive ? (
                                    <Badge variant="outline">Active</Badge>
                                  ) : (
                                    <Badge variant="secondary">Inactive</Badge>
                                  )}
                                </td>
                                <td className="p-3">
                                  {employee.license &&
                                    getStatusBadge(employee.license.status)}
                                </td>
                                <td className="p-3">
                                  {employee.license &&
                                    getSourceBadge(employee.license.source)}
                                </td>
                                <td className="p-3">
                                  <div className="flex flex-wrap gap-1">
                                    {employee.license?.includesAutoScreenshots && (
                                      <Badge variant="outline" className="text-xs">
                                        <Camera className="h-3 w-3 mr-1" />
                                        Screenshots
                                      </Badge>
                                    )}
                                    {!employee.license?.includesAutoScreenshots && (
                                      <span className="text-xs text-muted-foreground">None</span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 text-muted-foreground">
                                  {formatDate(employee.license?.activatedAt || null)}
                                </td>
                                <td className="p-3 text-muted-foreground">
                                  {formatDate(employee.license?.expiresAt || null)}
                                </td>
                                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {employee.license?.status === "INACTIVE" ? (
                                        <DropdownMenuItem
                                          onClick={() =>
                                            setReactivatingLicense({
                                              license: employee.license,
                                              employee,
                                            })
                                          }
                                        >
                                          <RotateCcw className="mr-2 h-4 w-4" />
                                          Reactivate License
                                        </DropdownMenuItem>
                                      ) : (
                                        <>
                                          {employee.license?.includesAutoScreenshots && (
                                            <DropdownMenuItem
                                              onClick={() =>
                                                setRemovingAddOn({
                                                  license: employee.license,
                                                  employee,
                                                })
                                              }
                                            >
                                              <Camera className="mr-2 h-4 w-4" />
                                              Remove Auto screenshots
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            onClick={() =>
                                              setDeactivatingLicense({
                                                license: employee.license,
                                                employee,
                                              })
                                            }
                                            className="text-destructive"
                                          >
                                            <AlertTriangle className="mr-2 h-4 w-4" />
                                            Deactivate License
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* License Sources Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>License Sources</CardTitle>
            <CardDescription>How licenses can be activated</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Badge className="bg-purple-100 text-purple-800">STRIPE</Badge>
              <div>
                <p className="font-medium text-sm">Stripe Payment</p>
                <p className="text-xs text-muted-foreground">
                  Automatically activated when organization pays for subscription
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Badge className="bg-blue-100 text-blue-800">MANUAL</Badge>
              <div>
                <p className="font-medium text-sm">Manual Activation</p>
                <p className="text-xs text-muted-foreground">
                  Activated by Super Admin, bypasses payment
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Badge className="bg-orange-100 text-orange-800">
                BETA_BYPASS
              </Badge>
              <div>
                <p className="font-medium text-sm">Beta Bypass</p>
                <p className="text-xs text-muted-foreground">
                  For beta testing organizations
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>License Tiers & Add-ons</CardTitle>
            <CardDescription>Available license configurations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Badge variant="outline">STARTER</Badge>
              <div>
                <p className="font-medium text-sm">Starter Tier</p>
                <p className="text-xs text-muted-foreground">
                  Basic features for small teams
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Badge variant="default">TEAM</Badge>
              <div>
                <p className="font-medium text-sm">Team Tier</p>
                <p className="text-xs text-muted-foreground">
                  Full features for larger teams
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
              <Camera className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Auto Screenshots Add-on</p>
                <p className="text-xs text-muted-foreground">
                  +$1.50/seat/month - Automatic screenshot capture
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Modals */}
      
      {/* Activation Confirmation */}
      <AlertDialog open={activationConfirm} onOpenChange={setActivationConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate Licenses?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to activate <strong>{selectedEmployees.size}</strong> license
              {selectedEmployees.size !== 1 ? "s" : ""} with the following settings:
              <br /><br />
              • Source: <strong>{source}</strong>
              <br />
              • Tier: <strong>{tier}</strong>
              <br />
              • Auto Screenshots: <strong>{includeAutoScreenshots ? "Yes" : "No"}</strong>
              <br />
              • Expiry: <strong>30 days from activation</strong>
              <br /><br />
              This will grant access to the desktop agent for the selected employees.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmActivation} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Activating...
                </>
              ) : (
                "Activate Licenses"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivation Confirmation */}
      <AlertDialog
        open={!!deactivatingLicense}
        onOpenChange={() => setDeactivatingLicense(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate License?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p>
                  This will revoke access for{" "}
                  <strong>{deactivatingLicense?.employee.name}</strong>.
                </p>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 space-y-1">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div className="text-sm text-amber-900 dark:text-amber-100">
                      <p className="font-medium">Warning:</p>
                      <ul className="list-disc list-inside space-y-1 mt-1 text-xs">
                        <li>Desktop agent will be logged out immediately</li>
                        <li>Active work sessions will be clocked out</li>
                        <li>User will be unable to track work</li>
                        <li>This can be reversed by reactivating later</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateLicense}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate License
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add-on Removal Confirmation */}
      <AlertDialog
        open={!!removingAddOn}
        onOpenChange={() => setRemovingAddOn(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Auto-Screenshots?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p>
                  Remove automatic screenshots for{" "}
                  <strong>{removingAddOn?.employee.name}</strong>?
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 space-y-1">
                  <div className="text-sm text-blue-900 dark:text-blue-100">
                    <p className="font-medium">Changes:</p>
                    <ul className="list-disc list-inside space-y-1 mt-1 text-xs">
                      <li>Will stop taking automatic screenshots</li>
                      <li>Screenshots can still be requested manually</li>
                      <li>Billing will be adjusted (-$1.50/month)</li>
                      <li>License remains active</li>
                    </ul>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveAddOn}>
              Remove Add-on
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivation Confirmation */}
      <AlertDialog
        open={!!reactivatingLicense}
        onOpenChange={() => setReactivatingLicense(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate License?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p>
                  Restore access for{" "}
                  <strong>{reactivatingLicense?.employee.name}</strong>?
                </p>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3 space-y-1">
                  <div className="text-sm text-green-900 dark:text-green-100">
                    <p className="font-medium">This will:</p>
                    <ul className="list-disc list-inside space-y-1 mt-1 text-xs">
                      <li>Grant access to the desktop agent</li>
                      <li>Set a new 30-day expiry date</li>
                      <li>Allow user to track work again</li>
                      <li>Restore all license features</li>
                    </ul>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReactivateLicense}>
              Reactivate License
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Deactivate Confirmation */}
      <AlertDialog
        open={bulkDeactivateConfirm}
        onOpenChange={setBulkDeactivateConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bulk Deactivate Licenses?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p>
                  This will revoke access for{" "}
                  <strong>{selectedLicensedActive.length}</strong> employee
                  {selectedLicensedActive.length !== 1 ? "s" : ""}.
                </p>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 space-y-1">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div className="text-sm text-amber-900 dark:text-amber-100">
                      <p className="font-medium">Warning:</p>
                      <ul className="list-disc list-inside space-y-1 mt-1 text-xs">
                        <li>All selected desktop agents will be logged out immediately</li>
                        <li>Active work sessions will be clocked out</li>
                        <li>Users will be unable to track work</li>
                        <li>This can be reversed by reactivating later</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate {selectedLicensedActive.length} License{selectedLicensedActive.length !== 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Remove Add-on Confirmation */}
      <AlertDialog
        open={bulkRemoveAddOnConfirm}
        onOpenChange={setBulkRemoveAddOnConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Screenshots from Multiple Licenses?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p>
                  Remove automatic screenshots from{" "}
                  <strong>{selectedLicensedWithAddOns.length}</strong> license
                  {selectedLicensedWithAddOns.length !== 1 ? "s" : ""}?
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 space-y-1">
                  <div className="text-sm text-blue-900 dark:text-blue-100">
                    <p className="font-medium">Changes:</p>
                    <ul className="list-disc list-inside space-y-1 mt-1 text-xs">
                      <li>Will stop taking automatic screenshots for all selected users</li>
                      <li>Screenshots can still be requested manually</li>
                      <li>Billing will be adjusted (-$1.50/month per license)</li>
                      <li>Licenses remain active</li>
                    </ul>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkRemoveAddOn}>
              Remove Add-on from {selectedLicensedWithAddOns.length} License{selectedLicensedWithAddOns.length !== 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
