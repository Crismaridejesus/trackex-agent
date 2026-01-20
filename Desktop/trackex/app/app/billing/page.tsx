"use client"

import {
  EmployeeSeatSelection,
  EmployeeSeatSelector,
} from "@/components/app/employee-seat-selector";
import { FreeTrialModal } from "@/components/app/free-trial-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TRIAL } from "@/lib/constants";
import {
  AlertTriangle,
  Camera,
  Check,
  Clock,
  CreditCard,
  ExternalLink,
  Gift,
  Loader2,
  Shield,
  User,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface SubscriptionData {
  hasSubscription: boolean
  subscription: {
    status: string
    tier: string
    billingCycle: string
    quantity: number
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
    pricePerLicense: number
  } | null
  activeLicenseCount: number
  totalEmployeeCount: number
  isBetaTester: boolean
  bypassPayment: boolean
  hasAutoScreenshots: boolean
}

interface LicenseDetail {
  id: string
  status: string
  tier: string
  source: string
  includesAutoScreenshots: boolean
  expiresAt: string | null
  activatedAt: string | null
  employee: {
    id: string
    name: string
    email: string
    isActive: boolean
  }
}

interface TrialData {
  trial: {
    isActive: boolean
    isExpired: boolean
    hasNeverStarted: boolean
    daysRemaining: number
    endsAt: string | null
  }
  productAccess: {
    canUse: boolean
    reason: string
  }
  effectiveTier: {
    tier: string
    source: string
  }
}

export default function BillingPage() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SubscriptionData | null>(null)
  const [trialData, setTrialData] = useState<TrialData | null>(null)
  const [licenses, setLicenses] = useState<LicenseDetail[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [checkoutSuccess, setCheckoutSuccess] = useState(false)

  // Checkout configuration - per-employee seat selection with add-on tracking
  const [selectedSeats, setSelectedSeats] = useState<EmployeeSeatSelection[]>(
    []
  )

  // Trial modal state
  const [trialModalOpen, setTrialModalOpen] = useState(false)

  const fetchSubscription = async () => {
    try {
      const response = await fetch("/api/billing/subscription")
      if (!response.ok) throw new Error("Failed to fetch")

      const result = await response.json()
      setData(result)
      
      // Fetch license details if subscription exists
      if (result.hasSubscription) {
        fetchLicenseDetails()
      }
      // Note: selectedEmployeeIds is now managed by EmployeeSeatSelector
    } catch (error) {
      console.error("Failed to fetch subscription:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLicenseDetails = async () => {
    try {
      const response = await fetch("/api/billing/licenses")
      if (response.ok) {
        const result = await response.json()
        setLicenses(result.licenses || [])
      }
    } catch (error) {
      console.error("Failed to fetch license details:", error)
    }
  }

  const fetchTrialStatus = async () => {
    try {
      const response = await fetch("/api/billing/trial")
      if (response.ok) {
        const result = await response.json()
        setTrialData(result)
      }
    } catch (error) {
      console.error("Failed to fetch trial status:", error)
    }
  }

  useEffect(() => {
    // Check for checkout result
    if (searchParams.get("checkout") === "success") {
      setCheckoutSuccess(true)
    }

    fetchSubscription()
    fetchTrialStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleTrialSuccess = async () => {
    await fetchTrialStatus()
    await fetchSubscription()
  }

  const startCheckout = async () => {
    if (selectedSeats.length === 0) {
      alert("Please select at least one employee to purchase licenses for.")
      return
    }

    setActionLoading("checkout")
    try {
      const response = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seats: selectedSeats.map((s) => ({
            employeeId: s.employeeId,
            includeAutoScreenshots: s.addOns.includes("auto-screenshots"),
          })),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create checkout")
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error("Failed to start checkout:", error)
      alert(error instanceof Error ? error.message : "Failed to start checkout")
    } finally {
      setActionLoading(null)
    }
  }

  const openBillingPortal = async () => {
    setActionLoading("portal")
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to open billing portal")

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error("Failed to open billing portal:", error)
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

  const formatPriceLocal = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Calculate total price - $5/seat + optional $1.50/seat for auto-screenshots (per employee)
  const SEAT_PRICE = 500 // $5.00 in cents
  const AUTO_SCREENSHOTS_PRICE = 150 // $1.50 in cents
  const seatCount = selectedSeats.length
  const seatsWithAutoScreenshots = selectedSeats.filter((s) =>
    s.addOns.includes("auto-screenshots")
  ).length

  const calculateTotal = () => {
    const baseCost = SEAT_PRICE * seatCount
    const addonCost = AUTO_SCREENSHOTS_PRICE * seatsWithAutoScreenshots
    return baseCost + addonCost
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and employee licenses
        </p>
      </div>

      {/* Success message after checkout */}
      {checkoutSuccess && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-600" />
              <p className="text-green-800 dark:text-green-400">
                Subscription activated successfully! Your licenses are now
                active.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trial Banner */}
      {trialData?.trial.isActive && (
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-purple-600" />
                <div>
                  <p className="font-semibold text-purple-800 dark:text-purple-400">
                    Free License Active - {trialData.trial.daysRemaining} days
                    remaining
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-300">
                    Ends{" "}
                    {trialData.trial.endsAt
                      ? formatDate(trialData.trial.endsAt)
                      : "soon"}
                    . Subscribe to keep your data and continue using TrackEx.
                  </p>
                </div>
              </div>
              <Button
                onClick={() =>
                  document
                    .getElementById("pricing-section")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Subscribe Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trial Expired Banner */}
      {trialData?.trial.isExpired && !data?.subscription && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-400">
                  Your free license has expired
                </p>
                <p className="text-sm text-red-600 dark:text-red-300">
                  Subscribe now to continue using TrackEx and access your data.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Beta/Bypass Notice */}
      {(data?.isBetaTester || data?.bypassPayment) && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-400">
                  {data.isBetaTester
                    ? "Beta Tester Account"
                    : "Payment Bypass Enabled"}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  All employees can use the desktop agent without payment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Status */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Licenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.activeLicenseCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              of {data?.totalEmployeeCount || 0} employees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Subscription Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.subscription ? (
              <>
                <Badge
                  variant={
                    data.subscription.status === "active"
                      ? "default"
                      : "secondary"
                  }
                  className="text-sm"
                >
                  {data.subscription.status}
                </Badge>
                {data.subscription.cancelAtPeriodEnd && (
                  <p className="text-xs text-orange-600 mt-1">
                    Cancels at period end
                  </p>
                )}
              </>
            ) : data?.isBetaTester || data?.bypassPayment ? (
              <Badge variant="outline" className="text-sm">
                Bypass Active
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-sm">
                No Subscription
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* License Overview */}
      {data?.subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              License Overview
            </CardTitle>
            <CardDescription>
              Your per-seat subscription with optional add-ons
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Cost Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Base License Cost</p>
                  <p className="text-xs text-muted-foreground">
                    {data.subscription.quantity} seat{data.subscription.quantity !== 1 ? 's' : ''} × {formatPriceLocal(data.subscription.pricePerLicense)}/month
                  </p>
                </div>
                <p className="text-lg font-semibold">
                  {formatPriceLocal(data.subscription.pricePerLicense * data.subscription.quantity)}/mo
                </p>
              </div>

              {data.hasAutoScreenshots && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Auto Screenshots Add-on
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {licenses.filter((l) => l.status === "ACTIVE" && l.includesAutoScreenshots).length} of {data.subscription.quantity} seats have this add-on
                    </p>
                  </div>
                  <p className="text-lg font-semibold">
                    +{formatPriceLocal(150 * licenses.filter((l) => l.status === "ACTIVE" && l.includesAutoScreenshots).length)}/mo
                  </p>
                </div>
              )}

              <div className="pt-3 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Billing Period</p>
                    <p className="text-sm font-medium">
                      Now - {formatDate(data.subscription.currentPeriodEnd)}
                    </p>
                  </div>
                  <Badge variant="outline">Monthly</Badge>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button
                onClick={openBillingPortal}
                disabled={actionLoading === "portal"}
              >
                {actionLoading === "portal" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                Manage Subscription
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Add/remove seats, configure per-employee add-ons, update payment method, view invoices
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-Employee License Details */}
      {data?.subscription && licenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Employee Licenses
            </CardTitle>
            <CardDescription>
              Individual license status and add-on configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Employee</th>
                    <th className="text-left py-3 px-2 font-medium">Status</th>
                    <th className="text-left py-3 px-2 font-medium">Add-ons</th>
                    <th className="text-right py-3 px-2 font-medium">Monthly Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {licenses
                    .filter((license) => license.status === "ACTIVE")
                    .map((license) => {
                      const baseCost = data.subscription?.pricePerLicense || 500
                      const addonCost = license.includesAutoScreenshots ? 150 : 0
                      const totalCost = baseCost + addonCost
                      
                      return (
                        <tr key={license.id} className="border-b last:border-0">
                          <td className="py-3 px-2">
                            <div>
                              <p className="font-medium">{license.employee.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {license.employee.email}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant="default" className="text-xs">
                              {license.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-2">
                            {license.includesAutoScreenshots ? (
                              <div className="flex items-center gap-1 text-xs">
                                <Camera className="h-3 w-3" />
                                <span>Auto Screenshots</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                None
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-right font-medium">
                            {formatPriceLocal(totalCost)}/mo
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
              
              {licenses.filter((l) => l.status === "ACTIVE").length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No active licenses found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Purchase/Renew Licenses - Always show for subscribers and non-subscribers */}
      {!data?.isBetaTester && !data?.bypassPayment && (
        <div id="pricing-section" className="space-y-6">
          {/* Start Trial Option */}
          {trialData?.trial.hasNeverStarted && (
            <Card className="border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-purple-600" />
                  Get Your Free License
                </CardTitle>
                <CardDescription>
                  Activate 1 free employee license every month with the
                  Starter tier
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {TRIAL.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => setTrialModalOpen(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Gift className="mr-2 h-4 w-4" />
                  Activate Free License
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Free Trial Modal */}
          <FreeTrialModal
            open={trialModalOpen}
            onOpenChange={setTrialModalOpen}
            onSuccess={handleTrialSuccess}
          />

          {/* Pricing Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscribe to TrackEx
              </CardTitle>
              <CardDescription>
                $5 per seat per month. Add auto-screenshots for +$1.50/seat.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Employee Selection with per-employee add-on toggles */}
              <EmployeeSeatSelector
                selectedSeats={selectedSeats}
                onSelectionChange={setSelectedSeats}
                disabled={actionLoading === "checkout"}
                showLicensedEmployees={true}
              />

              {/* Total and Checkout */}
              <div className="pt-4 border-t">
                {/* Breakdown */}
                <div className="mb-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>
                      {seatCount} {seatCount === 1 ? "seat" : "seats"} ×
                      $5/month
                    </span>
                    <span>{formatPriceLocal(SEAT_PRICE * seatCount)}/mo</span>
                  </div>
                  {seatsWithAutoScreenshots > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>
                        Auto Screenshots ({seatsWithAutoScreenshots} × $1.50)
                      </span>
                      <span>
                        +
                        {formatPriceLocal(
                          AUTO_SCREENSHOTS_PRICE * seatsWithAutoScreenshots
                        )}
                        /mo
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-lg font-semibold">Total</p>
                    <p className="text-sm text-muted-foreground">
                      Billed monthly
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">
                      {formatPriceLocal(calculateTotal())}
                    </p>
                    <p className="text-sm text-muted-foreground">per month</p>
                  </div>
                </div>

                <Button
                  onClick={startCheckout}
                  disabled={actionLoading === "checkout" || seatCount === 0}
                  size="lg"
                  className="w-full"
                >
                  {actionLoading === "checkout" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 h-4 w-4" />
                  )}
                  {seatCount === 0
                    ? "Select Employees to Subscribe"
                    : `Subscribe Now (${seatCount} seat${seatCount !== 1 ? "s" : ""})`}
                </Button>

                <p className="text-xs text-center text-muted-foreground mt-3">
                  Secure payment powered by Stripe. Cancel anytime.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* License Usage Warning */}
      {data &&
        data.activeLicenseCount < data.totalEmployeeCount &&
        !data.isBetaTester &&
        !data.bypassPayment && (
          <Card className="border-orange-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-800 dark:text-orange-400">
                    {data.totalEmployeeCount - data.activeLicenseCount}{" "}
                    employees without licenses
                  </p>
                  <p className="text-sm text-orange-600 dark:text-orange-300">
                    These employees cannot use the desktop agent until licenses
                    are activated.
                    {data.subscription && (
                      <> Use the billing portal to add more licenses.</>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  )
}
