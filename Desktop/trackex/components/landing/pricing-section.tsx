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
import { PRICING } from "@/lib/constants";
import { Building2, Check, X } from "lucide-react";
import Link from "next/link";

export function PricingSection() {
  return (
    <section id="pricing" className="section-padding bg-muted/30">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free with one employee. Pay only for additional seats.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mx-auto">
          {/* Free Plan */}
          <Card className="border-border">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl">{PRICING.starter.name}</CardTitle>
              <CardDescription>Perfect for getting started</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                1 employee included forever
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {PRICING.starter.features.map((feature) => (
                  <li key={feature} className="flex items-start text-sm">
                    <Check className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">
                  Limitations:
                </p>
                <ul className="space-y-1">
                  {PRICING.starter.limitations.map((limitation) => (
                    <li
                      key={limitation}
                      className="flex items-start text-xs text-muted-foreground"
                    >
                      <X className="h-3 w-3 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{limitation}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button className="w-full" variant="outline" asChild>
                <Link href="/login">Start for Free</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Team Plan - Featured */}
          <Card className="border-primary border-2 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground">
                Most Popular
              </Badge>
            </div>

            <CardHeader className="text-center pb-4 pt-8">
              <CardTitle className="text-xl">{PRICING.team.name}</CardTitle>
              <CardDescription>For growing remote teams</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">
                  ${PRICING.team.price}
                </span>
                <span className="text-muted-foreground">/seat/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Billed monthly per employee
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {PRICING.team.features.map((feature) => (
                  <li key={feature} className="flex items-start text-sm">
                    <Check className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button className="w-full" asChild>
                <Link href="/login">Get Started</Link>
              </Button>

              {/* Auto-screenshots add-on note */}
              <div className="pt-3 border-t border-border">
                <p className="text-sm font-medium mb-1">Optional Add-on:</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Auto Screenshots
                  </span>{" "}
                  — +${PRICING.autoScreenshots.price}/seat/month
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {PRICING.autoScreenshots.description}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Enterprise Plan */}
          <Card className="border-border">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl flex items-center justify-center gap-2">
                <Building2 className="h-5 w-5" />
                Enterprise
              </CardTitle>
              <CardDescription>For large organizations</CardDescription>
              <div className="mt-4">
                <span className="text-3xl font-bold">Custom</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Tailored to your needs
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <ul className="space-y-2">
                <li className="flex items-start text-sm">
                  <Check className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                  <span>Everything in Team</span>
                </li>
                <li className="flex items-start text-sm">
                  <Check className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                  <span>API access</span>
                </li>
                <li className="flex items-start text-sm">
                  <Check className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                  <span>Custom integrations</span>
                </li>
                <li className="flex items-start text-sm">
                  <Check className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                  <span>Dedicated support</span>
                </li>
                <li className="flex items-start text-sm">
                  <Check className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                  <span>SLA & compliance</span>
                </li>
                <li className="flex items-start text-sm">
                  <Check className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                  <span>Volume discounts</span>
                </li>
              </ul>

              <Button className="w-full" variant="outline" asChild>
                <Link href="/contact">Contact Sales</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <div className="mt-12 text-center">
          <h3 className="text-lg font-semibold mb-4">How Billing Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto text-sm">
            <div className="p-4 bg-background rounded-lg border">
              <div className="font-medium mb-1">1. Select Seats</div>
              <p className="text-muted-foreground">
                Choose how many employee seats you need
              </p>
            </div>
            <div className="p-4 bg-background rounded-lg border">
              <div className="font-medium mb-1">2. Add Employees</div>
              <p className="text-muted-foreground">
                Assign employee emails to your seats
              </p>
            </div>
            <div className="p-4 bg-background rounded-lg border">
              <div className="font-medium mb-1">3. Pay Monthly</div>
              <p className="text-muted-foreground">
                Billing starts when employees are added
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Link */}
        <div className="text-center mt-10">
          <p className="text-sm text-muted-foreground">
            Have questions?{" "}
            <Link href="/contact" className="text-primary hover:underline">
              Contact our team
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
