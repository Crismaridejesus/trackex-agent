"use client"

import { UserPlus, Download, BarChart3 } from "lucide-react"

const steps = [
    {
        icon: UserPlus,
        number: "1",
        title: "Create Account",
        description: "Sign up in 30 seconds. No credit card needed.",
    },
    {
        icon: Download,
        number: "2",
        title: "Install Agent",
        description: "Download the desktop app for Mac or Windows.",
    },
    {
        icon: BarChart3,
        number: "3",
        title: "Start Tracking",
        description: "See real-time productivity data immediately.",
    },
]

export function HowItWorksSection() {
    return (
        <section id="how-it-works" className="section-padding">
            <div className="container mx-auto px-4 max-w-6xl">
                {/* Section Header */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Get Started in Minutes
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Three simple steps to complete visibility over your remote team.
                    </p>
                </div>

                {/* Steps */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {steps.map((step, index) => {
                        const Icon = step.icon
                        return (
                            <div key={step.title} className="text-center">
                                <div className="relative inline-block mb-4">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Icon className="h-7 w-7 text-primary" />
                                    </div>
                                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                                        {step.number}
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                                <p className="text-sm text-muted-foreground">{step.description}</p>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
