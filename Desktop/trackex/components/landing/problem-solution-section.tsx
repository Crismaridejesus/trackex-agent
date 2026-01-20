"use client"

import { AlertTriangle, Zap, Eye, Clock, BarChart3, CheckCircle2 } from "lucide-react"

const challenges = [
    {
        icon: Eye,
        problem: "No visibility",
        description: "You have no idea what your remote employees are actually doing during work hours.",
        solution: "Real-time monitoring",
        benefit: "See exactly which apps and websites your team uses, live as it happens.",
    },
    {
        icon: Clock,
        problem: "Time theft",
        description: "Employees report 8 hours but you can't verify if they actually worked that long.",
        solution: "Automatic tracking",
        benefit: "Clock-in times, active hours, and idle periods are all tracked automatically.",
    },
    {
        icon: BarChart3,
        problem: "Can't measure output",
        description: "No way to compare productivity across team members or identify who needs support.",
        solution: "Productivity scoring",
        benefit: "Apps are categorized as productive or not, giving you clear metrics.",
    },
]

export function ProblemSolutionSection() {
    return (
        <section className="section-padding bg-background">
            <div className="container mx-auto px-4 max-w-6xl">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        The Remote Work Problem
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Stop Guessing, Start Knowing
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Remote work is great—until you realize you have no idea what's happening.
                    </p>
                </div>

                {/* Challenge Cards */}
                <div className="space-y-6">
                    {challenges.map((item, index) => (
                        <div 
                            key={index} 
                            className="grid md:grid-cols-2 gap-0 bg-card rounded-2xl border border-border overflow-hidden"
                        >
                            {/* Problem Side */}
                            <div className="p-8 bg-muted/50 border-b md:border-b-0 md:border-r border-border">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                        <item.icon className="h-5 w-5 text-red-600 dark:text-red-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-red-600 dark:text-red-400 font-medium uppercase tracking-wider">The Problem</p>
                                        <h3 className="font-semibold text-lg">{item.problem}</h3>
                                    </div>
                                </div>
                                <p className="text-muted-foreground">{item.description}</p>
                            </div>
                            
                            {/* Solution Side */}
                            <div className="p-8">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Zap className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-primary font-medium uppercase tracking-wider">TrackEx Solution</p>
                                        <h3 className="font-semibold text-lg">{item.solution}</h3>
                                    </div>
                                </div>
                                <p className="text-muted-foreground mb-4">{item.benefit}</p>
                                <div className="flex items-center gap-2 text-sm text-primary font-medium">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Works instantly after setup
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
