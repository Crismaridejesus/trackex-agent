"use client"

import { Users, Headphones, Building2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const useCases = [
    {
        icon: Users,
        title: "Remote Teams",
        description: "Track distributed workforces across time zones with real-time visibility.",
    },
    {
        icon: Headphones,
        title: "Virtual Assistants",
        description: "Verify VAs are working on assigned tasks during paid hours.",
    },
    {
        icon: Building2,
        title: "Agencies",
        description: "Track billable hours and contractor productivity with confidence.",
    },
]

export function PerfectForSection() {
    return (
        <section className="section-padding bg-muted/30">
            <div className="container mx-auto px-4 max-w-6xl">
                {/* Section Header */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Built for Remote Work
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Whether you manage a small team or a global workforce, TrackEx scales with you.
                    </p>
                </div>

                {/* Use Case Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {useCases.map((useCase) => {
                        const Icon = useCase.icon
                        return (
                            <Card key={useCase.title} className="border-border text-center">
                                <CardHeader className="pb-3">
                                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                                        <Icon className="h-6 w-6 text-primary" />
                                    </div>
                                    <CardTitle className="text-lg">{useCase.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription>{useCase.description}</CardDescription>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
