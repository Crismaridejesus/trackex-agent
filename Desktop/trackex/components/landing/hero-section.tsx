"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, ArrowRight, Camera, Circle } from "lucide-react"

export function HeroSection() {
    return (
        <section className="relative min-h-[85vh] flex items-center bg-gradient-hero pt-8 md:pt-12 lg:pt-0">
            <div className="container mx-auto px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Left Column - Content */}
                        <div className="text-center lg:text-left">
                            {/* Badge */}
                            <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm font-medium">
                                Start free — No credit card required
                            </Badge>

                            {/* Main Headline */}
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-foreground">
                                Monitor Your Remote Team with{" "}
                                <span className="text-primary">Complete Visibility</span>
                            </h1>

                            {/* Subheadline */}
                            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                                Track time, monitor app usage, and measure productivity across your 
                                distributed workforce. Simple setup, powerful insights.
                            </p>

                            {/* CTA Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                                <Button size="lg" className="text-base px-6 h-12" asChild>
                                    <Link href="/login">
                                        Get Started Free
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Link>
                                </Button>

                                <Button size="lg" variant="outline" className="text-base px-6 h-12" asChild>
                                    <Link href="#how-it-works">
                                        See How It Works
                                    </Link>
                                </Button>
                            </div>

                            {/* Trust Indicators */}
                            <div className="flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                    <span>2-minute setup</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                    <span>Mac & Windows</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                    <span>GDPR compliant</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Dashboard Preview */}
                        <div className="relative">
                            <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
                                {/* Browser Header */}
                                <div className="bg-muted px-4 py-3 flex items-center gap-2 border-b border-border">
                                    <div className="w-3 h-3 rounded-full bg-red-400" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                    <div className="w-3 h-3 rounded-full bg-green-400" />
                                    <div className="flex-1 ml-4">
                                        <div className="bg-background rounded h-6 w-48 flex items-center px-3">
                                            <span className="text-xs text-muted-foreground">trackex.app/dashboard</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Dashboard Content */}
                                <div className="p-5 bg-background">
                                    {/* Header with Screenshot Button */}
                                    <div className="flex items-center justify-between mb-5">
                                        <div>
                                            <h3 className="text-sm font-semibold">Live Activity</h3>
                                            <p className="text-xs text-muted-foreground">4 employees online</p>
                                        </div>
                                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                                            <Camera className="w-3.5 h-3.5" />
                                            Screenshot
                                        </Button>
                                    </div>
                                    
                                    {/* Stats Row */}
                                    <div className="grid grid-cols-3 gap-3 mb-5">
                                        <div className="bg-muted/50 rounded-lg p-3 text-center">
                                            <div className="text-xl font-bold text-foreground">4</div>
                                            <div className="text-[10px] text-muted-foreground">Active</div>
                                        </div>
                                        <div className="bg-muted/50 rounded-lg p-3 text-center">
                                            <div className="text-xl font-bold text-primary">82%</div>
                                            <div className="text-[10px] text-muted-foreground">Productive</div>
                                        </div>
                                        <div className="bg-muted/50 rounded-lg p-3 text-center">
                                            <div className="text-xl font-bold text-foreground">6.2h</div>
                                            <div className="text-[10px] text-muted-foreground">Avg. Time</div>
                                        </div>
                                    </div>
                                    
                                    {/* Employee List */}
                                    <div className="space-y-2">
                                        {/* Productive Employee 1 */}
                                        <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400 text-xs font-semibold">JD</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">John Doe</p>
                                                <div className="flex items-center gap-1.5">
                                                    <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
                                                    <p className="text-xs text-muted-foreground">VS Code • Active</p>
                                                </div>
                                            </div>
                                            <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">94%</div>
                                        </div>
                                        
                                        {/* Productive Employee 2 */}
                                        <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400 text-xs font-semibold">SL</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">Sarah Lee</p>
                                                <div className="flex items-center gap-1.5">
                                                    <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
                                                    <p className="text-xs text-muted-foreground">Figma • Active</p>
                                                </div>
                                            </div>
                                            <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">91%</div>
                                        </div>
                                        
                                        {/* Unproductive Employee */}
                                        <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900/50">
                                            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-700 dark:text-red-400 text-xs font-semibold">MK</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">Mike Chen</p>
                                                <div className="flex items-center gap-1.5">
                                                    <Circle className="w-2 h-2 fill-red-500 text-red-500" />
                                                    <p className="text-xs text-red-600 dark:text-red-400">YouTube • Distracted</p>
                                                </div>
                                            </div>
                                            <div className="text-sm font-semibold text-red-600 dark:text-red-400">23%</div>
                                        </div>
                                        
                                        {/* Productive Employee 3 */}
                                        <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400 text-xs font-semibold">AW</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">Anna Wilson</p>
                                                <div className="flex items-center gap-1.5">
                                                    <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
                                                    <p className="text-xs text-muted-foreground">Slack • Active</p>
                                                </div>
                                            </div>
                                            <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">87%</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
