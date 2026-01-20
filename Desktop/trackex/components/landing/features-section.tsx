"use client"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { FEATURES } from "@/lib/constants";
import {
    Activity,
    BarChart3,
    Camera,
    Clock,
    Laptop,
    Monitor,
    Settings,
    TrendingUp,
    Users,
} from "lucide-react";

const iconMap = {
  Activity,
  Clock,
  TrendingUp,
  Settings,
  Camera,
  BarChart3,
  Users,
  Laptop,
  Monitor,
}

export function FeaturesSection() {
  return (
    <section id="features" className="section-padding">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to Track Productivity
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful monitoring tools that give you complete visibility into
            your remote team.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => {
            const Icon = iconMap[feature.icon as keyof typeof iconMap]

            return (
              <Card
                key={feature.title}
                className="border-border hover:border-primary/50 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
