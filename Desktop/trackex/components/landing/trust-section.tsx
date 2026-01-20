"use client"

import { Shield, Lock, Eye, FileCheck } from "lucide-react"

const features = [
    {
        icon: Lock,
        title: "Encrypted Data",
        description: "All data encrypted in transit and at rest.",
    },
    {
        icon: Eye,
        title: "Transparent Monitoring",
        description: "Employees know when tracking is active.",
    },
    {
        icon: Shield,
        title: "Role-Based Access",
        description: "Control who sees sensitive data.",
    },
    {
        icon: FileCheck,
        title: "GDPR Compliant",
        description: "Built with privacy regulations in mind.",
    },
]

export function TrustSection() {
    return (
        <section className="section-padding">
            <div className="container mx-auto px-4 max-w-6xl">
                {/* Section Header */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Security & Privacy
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Enterprise-grade security with privacy built in from day one.
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {features.map((feature) => {
                        const Icon = feature.icon
                        return (
                            <div key={feature.title} className="text-center">
                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                                    <Icon className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="text-sm font-semibold mb-1">{feature.title}</h3>
                                <p className="text-xs text-muted-foreground">{feature.description}</p>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
