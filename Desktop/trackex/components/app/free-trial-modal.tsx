"use client"

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  BarChart3,
  CreditCard,
  Gift,
  Loader2,
  Monitor,
  Sparkles,
  Timer,
  TrendingUp,
  User,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Employee {
  id: string
  name: string
  email: string
  hasLicense?: boolean
}

interface FreeTrialModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function FreeTrialModal({
  open,
  onOpenChange,
  onSuccess,
}: FreeTrialModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [fetchingEmployees, setFetchingEmployees] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch employees when modal opens
  useEffect(() => {
    if (open) {
      fetchEmployees()
    }
  }, [open])

  const fetchEmployees = async () => {
    setFetchingEmployees(true)
    try {
      const response = await fetch("/api/employees?limit=100")
      if (response.ok) {
        const data = await response.json()
        // Filter to only show employees without active licenses
        const availableEmployees = (data.employees || []).filter(
          (emp: Employee & { license?: { status: string } }) =>
            !emp.license || emp.license.status !== "ACTIVE"
        )
        setEmployees(availableEmployees)

        // Auto-select first employee if available
        if (availableEmployees.length > 0 && !selectedEmployeeId) {
          setSelectedEmployeeId(availableEmployees[0].id)
        }
      }
    } catch (err) {
      console.error("Failed to fetch employees:", err)
    } finally {
      setFetchingEmployees(false)
    }
  }

  const handleStartTrial = async () => {
    if (!selectedEmployeeId && employees.length > 0) {
      setError("Please select an employee to assign the trial license")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/billing/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployeeId || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to start trial")
      }

      const data = await response.json()

      onSuccess()
      onOpenChange(false)

      // Show success message
      alert(
        data.message ||
          `Your 30-day free Starter tier license has been activated!`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start trial")
    } finally {
      setLoading(false)
    }
  }

  const starterFeatures = [
    { icon: User, text: "1 employee included" },
    { icon: Zap, text: "Real-time app monitoring" },
    { icon: TrendingUp, text: "Productivity scoring" },
    { icon: BarChart3, text: "Basic analytics & reports" },
    { icon: Timer, text: "Idle time detection" },
    { icon: Monitor, text: "Mac & Windows support" },
    { icon: CreditCard, text: "No credit card required" },
  ]

  const limitations = [
    "No screenshot capture",
    "Limited historical data (7 days)",
    "Basic support only",
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-blue-600" />
            Start Your Free License
          </DialogTitle>
          <DialogDescription>
            Get 1 free employee license every month with the Starter tier
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto">

          {/* What's Included */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">What&apos;s included:</Label>
            <div className="grid gap-2">
              {starterFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <feature.icon className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span>{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Limitations */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-muted-foreground">
              Starter tier limitations:
            </Label>
            <div className="grid gap-1.5">
              {limitations.map((limitation, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                  <span>{limitation}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Employee Selection */}
          {employees.length > 0 && (
            <div className="space-y-3 pt-2 border-t">
              <Label htmlFor="employee-select" className="text-sm font-medium">
                Select employee for trial license:
              </Label>
              <Select
                value={selectedEmployeeId}
                onValueChange={setSelectedEmployeeId}
                disabled={fetchingEmployees}
              >
                <SelectTrigger id="employee-select">
                  <SelectValue placeholder="Select an employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name} ({employee.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Get 1 free employee license every month with Starter tier.
                Upgrade to Team tier for unlimited employees.
              </p>
            </div>
          )}

          {employees.length === 0 && !fetchingEmployees && (
            <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-800 dark:text-orange-400">
                    No employees available
                  </p>
                  <p className="text-sm text-orange-600 dark:text-orange-300 mt-1">
                    Add an employee first to assign the trial license.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* CTA */}
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={handleStartTrial}
              disabled={
                loading ||
                fetchingEmployees ||
                (employees.length > 0 && !selectedEmployeeId)
              }
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Gift className="mr-2 h-4 w-4" />
              )}
              Activate Free License (1 Month)
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              No credit card required. Upgrade anytime to unlock more features.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
