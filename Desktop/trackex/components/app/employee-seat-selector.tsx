"use client"

import { useQuery } from '@tanstack/react-query'
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  Camera,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  User,
  UserX,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

interface Employee {
  id: string
  name: string
  email: string
  hasLicense: boolean
  licenseTier: string | null
  licenseExpirationDate: string | null
  includesAutoScreenshots?: boolean
  license?: {
    status: string
    source: string
    expiresAt: string | null
    includesAutoScreenshots?: boolean
  } | null
}

export interface EmployeeSeatSelection {
  employeeId: string
  addOns: string[] // Array of add-on IDs (e.g., ['auto-screenshots', 'future-addon'])
  isRenewal: boolean // True if employee already has a license
}

interface EmployeeSeatSelectorProps {
  selectedSeats: EmployeeSeatSelection[]
  onSelectionChange: (seats: EmployeeSeatSelection[]) => void
  disabled?: boolean
  showLicensedEmployees?: boolean // Show licensed employees section for renewals
}

export function EmployeeSeatSelector({
  selectedSeats,
  onSelectionChange,
  disabled = false,
  showLicensedEmployees = true,
}: EmployeeSeatSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch employees using React Query
  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['employees', 'billing-selector'],
    queryFn: async () => {
      const response = await fetch(
        "/api/employees?limit=500&includeInactive=false"
      )
      if (!response.ok) throw new Error("Failed to fetch employees")
      return response.json()
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - keep data fresh for billing
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  })

  const employees = useMemo(() => (data?.employees || []) as Employee[], [data?.employees])
  const error = queryError ? (queryError instanceof Error ? queryError.message : "Failed to load employees") : null

  // Split employees into licensed and unlicensed
  const { licensedEmployees, unlicensedEmployees } = useMemo(() => {
    const licensed = employees.filter((e: Employee) => e.hasLicense)
    const unlicensed = employees.filter((e: Employee) => !e.hasLicense)
    return { licensedEmployees: licensed, unlicensedEmployees: unlicensed }
  }, [employees])

  // Filter by search
  const filteredLicensed = useMemo(() => {
    if (!searchQuery) return licensedEmployees
    const query = searchQuery.toLowerCase()
    return licensedEmployees.filter(
      (e: Employee) =>
        e.name.toLowerCase().includes(query) ||
        e.email.toLowerCase().includes(query)
    )
  }, [licensedEmployees, searchQuery])

  const filteredUnlicensed = useMemo(() => {
    if (!searchQuery) return unlicensedEmployees
    const query = searchQuery.toLowerCase()
    return unlicensedEmployees.filter(
      (e: Employee) =>
        e.name.toLowerCase().includes(query) ||
        e.email.toLowerCase().includes(query)
    )
  }, [unlicensedEmployees, searchQuery])

  const getSelection = (employeeId: string) => {
    return selectedSeats.find((s) => s.employeeId === employeeId)
  }

  const isSelected = (employeeId: string) => {
    return selectedSeats.some((s) => s.employeeId === employeeId)
  }

  const toggleEmployee = (employee: Employee) => {
    if (disabled) return

    if (isSelected(employee.id)) {
      onSelectionChange(
        selectedSeats.filter((s) => s.employeeId !== employee.id)
      )
    } else {
      onSelectionChange([
        ...selectedSeats,
        {
          employeeId: employee.id,
          addOns: employee.license?.includesAutoScreenshots
            ? ["auto-screenshots"]
            : [],
          isRenewal: employee.hasLicense,
        },
      ])
    }
  }

  const toggleAddOn = (
    employeeId: string,
    addOnId: string,
    enabled: boolean
  ) => {
    if (disabled) return

    onSelectionChange(
      selectedSeats.map((s) => {
        if (s.employeeId !== employeeId) return s

        const newAddOns = enabled
          ? [...s.addOns, addOnId]
          : s.addOns.filter((id) => id !== addOnId)

        return { ...s, addOns: newAddOns }
      })
    )
  }

  const selectAllUnlicensed = () => {
    if (disabled) return
    const unlicensedSelections = unlicensedEmployees.map((e: Employee) => ({
      employeeId: e.id,
      addOns: [],
      isRenewal: false,
    }))
    // Keep existing licensed selections, add unlicensed
    const licensedSelections = selectedSeats.filter((s) =>
      licensedEmployees.some((e: Employee) => e.id === s.employeeId)
    )
    onSelectionChange([...licensedSelections, ...unlicensedSelections])
  }

  const deselectAllUnlicensed = () => {
    if (disabled) return
    // Keep only licensed selections
    onSelectionChange(
      selectedSeats.filter((s) =>
        licensedEmployees.some((e: Employee) => e.id === s.employeeId)
      )
    )
  }

  const [globalAddOns, setGlobalAddOns] = useState<string[]>([])

  const applyGlobalAddOns = () => {
    if (disabled) return
    onSelectionChange(
      selectedSeats.map((s) => ({ ...s, addOns: [...globalAddOns] }))
    )
  }

  const toggleGlobalAddOn = (addOnId: string, enabled: boolean) => {
    setGlobalAddOns((prev) =>
      enabled ? [...prev, addOnId] : prev.filter((id) => id !== addOnId)
    )
  }

  const formatExpirationDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading employees...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  if (employees.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
          <div>
            <p className="font-medium text-orange-800 dark:text-orange-400">
              No employees found
            </p>
            <p className="text-sm text-orange-600 dark:text-orange-300 mt-1">
              Add employees first before purchasing licenses.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const selectedCount = selectedSeats.length
  const newLicenseCount = selectedSeats.filter((s) => !s.isRenewal).length
  const renewalCount = selectedSeats.filter((s) => s.isRenewal).length
  const withAutoScreenshots = selectedSeats.filter((s) =>
    s.addOns.includes("auto-screenshots")
  ).length

  // Available add-ons
  const AVAILABLE_ADDONS = [
    {
      id: "auto-screenshots",
      name: "Auto Screenshots",
      icon: Camera,
      price: 1.5,
    },
  ]

  return (
    <div className="space-y-4">
      {/* Header with search */}
      <div className="flex items-center justify-between gap-4">
        <Label className="text-lg font-semibold whitespace-nowrap">
          Select Employees
        </Label>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="font-medium">{selectedCount} selected</span>
        {newLicenseCount > 0 && (
          <Badge variant="outline" className="text-xs">
            {newLicenseCount} new
          </Badge>
        )}
        {renewalCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            <RefreshCw className="h-3 w-3 mr-1" />
            {renewalCount} renewal
          </Badge>
        )}
        {withAutoScreenshots > 0 && (
          <Badge className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            <Camera className="h-3 w-3 mr-1" />
            {withAutoScreenshots} with screenshots
          </Badge>
        )}
      </div>

      {/* Global Add-on Selector */}
      {selectedCount > 0 && (
        <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">
                Apply Add-ons to All Selected
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Choose add-ons to apply to all {selectedCount} selected employee
                {selectedCount !== 1 ? "s" : ""}
              </p>
            </div>
            <Button
              onClick={applyGlobalAddOns}
              disabled={disabled || globalAddOns.length === 0}
              size="sm"
              variant="default"
            >
              Apply to {selectedCount} Selected
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {AVAILABLE_ADDONS.map((addon) => {
              const isSelected = globalAddOns.includes(addon.id)
              return (
                <button
                  key={addon.id}
                  onClick={() => toggleGlobalAddOn(addon.id, !isSelected)}
                  disabled={disabled}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-md border transition-all text-sm
                    ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted border-input"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <addon.icon className="h-4 w-4" />
                  {addon.name}
                  <span className="text-xs opacity-75">+${addon.price}</span>
                  {isSelected && <Check className="h-3 w-3" />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Two-Column Layout for Employee Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Unlicensed Employees Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-muted-foreground">
              Employees Without License ({filteredUnlicensed.length})
            </Label>
            {filteredUnlicensed.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={selectAllUnlicensed}
                  disabled={disabled}
                  className="text-primary hover:underline disabled:opacity-50"
                >
                  Select all
                </button>
                <span className="text-muted-foreground">|</span>
                <button
                  onClick={deselectAllUnlicensed}
                  disabled={disabled}
                  className="text-primary hover:underline disabled:opacity-50"
                >
                  Deselect all
                </button>
              </div>
            )}
          </div>

          {filteredUnlicensed.length > 0 ? (
            <ScrollArea className="h-[400px] rounded-lg border">
              <div className="p-2 space-y-1">
                {filteredUnlicensed.map((employee: Employee) => (
                  <EmployeeRow
                    key={employee.id}
                    employee={employee}
                    isSelected={isSelected(employee.id)}
                    selection={getSelection(employee.id)}
                    onToggle={() => toggleEmployee(employee)}
                    onToggleAddOn={toggleAddOn}
                    disabled={disabled}
                    formatExpirationDate={formatExpirationDate}
                    availableAddons={AVAILABLE_ADDONS}
                  />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="h-[400px] rounded-lg border border-dashed flex items-center justify-center bg-muted/20">
              <div className="text-center py-12 px-4">
                <UserX className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No unlicensed employees
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  All employees have active licenses
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Licensed Employees Section */}
        {showLicensedEmployees && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Licensed Employees ({filteredLicensed.length})
              {filteredLicensed.length > 0 && (
                <span className="font-normal text-xs">
                  - Select to renew/upgrade
                </span>
              )}
            </Label>

            {filteredLicensed.length > 0 ? (
              <ScrollArea className="h-[400px] rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
                <div className="p-2 space-y-1">
                  {filteredLicensed.map((employee: Employee) => (
                    <EmployeeRow
                      key={employee.id}
                      employee={employee}
                      isSelected={isSelected(employee.id)}
                      selection={getSelection(employee.id)}
                      onToggle={() => toggleEmployee(employee)}
                      onToggleAddOn={toggleAddOn}
                      disabled={disabled}
                      formatExpirationDate={formatExpirationDate}
                      showLicenseInfo
                      availableAddons={AVAILABLE_ADDONS}
                    />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-[400px] rounded-lg border border-dashed border-green-200 dark:border-green-800 bg-green-50/20 dark:bg-green-900/5 flex items-center justify-center">
                <div className="text-center py-12 px-4">
                  <UserX className="h-12 w-12 text-green-600/30 mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">
                    No licensed employees yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start by selecting employees to license
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedCount === 0 && (
        <p className="text-sm text-orange-600">
          Please select at least one employee to purchase licenses for.
        </p>
      )}
    </div>
  )
}

// Individual employee row component
function EmployeeRow({
  employee,
  isSelected,
  selection,
  onToggle,
  onToggleAddOn,
  disabled,
  formatExpirationDate,
  showLicenseInfo = false,
  availableAddons,
}: {
  employee: Employee
  isSelected: boolean
  selection: EmployeeSeatSelection | undefined
  onToggle: () => void
  onToggleAddOn: (employeeId: string, addOnId: string, enabled: boolean) => void
  disabled: boolean
  formatExpirationDate: (date: string | null) => string
  showLicenseInfo?: boolean
  availableAddons: Array<{ id: string; name: string; icon: React.ComponentType<{ className?: string }>; price: number }>
}) {
  const hasActiveLicense = employee.hasLicense
  const selectedAddOns = selection?.addOns || []

  return (
    <div
      className={`
        flex items-center justify-between p-3 rounded-lg transition-all
        ${
          isSelected
            ? "bg-primary/10 border border-primary"
            : "hover:bg-muted/50 border border-transparent"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <div
        onClick={onToggle}
        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
      >
        <Checkbox
          checked={isSelected}
          disabled={disabled}
          onCheckedChange={onToggle}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        />
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{employee.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {employee.email}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* License info for licensed employees */}
        {showLicenseInfo && hasActiveLicense && (
          <div className="text-right text-xs mr-2">
            <Badge
              variant="secondary"
              className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            >
              {employee.licenseTier || "Licensed"}
            </Badge>
            {employee.licenseExpirationDate && (
              <p className="text-muted-foreground mt-1 flex items-center gap-1 justify-end">
                <Clock className="h-3 w-3" />
                {formatExpirationDate(employee.licenseExpirationDate)}
              </p>
            )}
          </div>
        )}

        {!hasActiveLicense && !isSelected && (
          <Badge variant="outline" className="text-xs">
            No License
          </Badge>
        )}

        {/* Add-ons dropdown - only show when selected */}
        {isSelected && (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  className="h-9"
                >
                  {selectedAddOns.length > 0 ? (
                    <>
                      <Badge variant="secondary" className="mr-1 h-5 px-1.5">
                        {selectedAddOns.length}
                      </Badge>
                      Add-ons
                    </>
                  ) : (
                    "Add-ons"
                  )}
                  <ChevronDown className="ml-2 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Select Add-ons</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableAddons.map((addon) => {
                  const isChecked = selectedAddOns.includes(addon.id)
                  const Icon = addon.icon
                  return (
                    <DropdownMenuCheckboxItem
                      key={addon.id}
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        onToggleAddOn(employee.id, addon.id, checked)
                      }
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{addon.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground ml-2">
                          +${addon.price}
                        </span>
                      </div>
                    </DropdownMenuCheckboxItem>
                  )
                })}
                {selectedAddOns.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-7 text-xs"
                        onClick={() => {
                          selectedAddOns.forEach((addonId) => {
                            onToggleAddOn(employee.id, addonId, false)
                          })
                        }}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear All
                      </Button>
                    </div>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  )
}
