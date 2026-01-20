"use client"

import Link from "next/link"
import { useSimpleSession } from "@/hooks/use-simple-session"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
    LogOut, 
    User, 
    Menu, 
    X, 
    ChevronDown,
    Clock,
    Activity,
    Camera,
    BarChart3,
    Laptop,
    Users,
    Building2,
    Briefcase,
    Globe,
    Shield,
    Mail,
    Apple,
    Monitor,
    BookOpen,
    ArrowRight,
    Sparkles,
} from "lucide-react"
import { APP_NAME } from "@/lib/constants"
import { useState } from "react"

export function Header() {
    const { data: session } = useSimpleSession()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const handleSignOut = async () => {
        try {
            await fetch('/api/auth/simple-logout', { method: 'POST' })
            window.location.href = '/login'
        } catch (error) {
            console.error('Logout failed:', error)
            window.location.href = '/login'
        }
    }

    return (
        <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                {/* Logo */}
                <Link href="/" className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                        <span className="text-primary-foreground font-bold text-sm">T</span>
                    </div>
                    <span className="font-bold text-lg">{APP_NAME}</span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center space-x-1">
                    {/* Features Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 outline-none">
                            Features
                            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" sideOffset={8} className="w-[320px] p-2 rounded-xl shadow-lg border">
                            <Link href="/features#time-tracking" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group">
                                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                                    <Clock className="h-4.5 w-4.5 text-blue-500" />
                                </div>
                                <div>
                                    <div className="font-medium text-sm">Time Tracking</div>
                                    <div className="text-xs text-muted-foreground">Automatic clock-in & idle detection</div>
                                </div>
                            </Link>
                            <Link href="/features#app-monitoring" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group">
                                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                                    <Activity className="h-4.5 w-4.5 text-emerald-500" />
                                </div>
                                <div>
                                    <div className="font-medium text-sm">App Monitoring</div>
                                    <div className="text-xs text-muted-foreground">Real-time application tracking</div>
                                </div>
                            </Link>
                            <Link href="/features#productivity" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group">
                                <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                                    <BarChart3 className="h-4.5 w-4.5 text-violet-500" />
                                </div>
                                <div>
                                    <div className="font-medium text-sm">Productivity Scoring</div>
                                    <div className="text-xs text-muted-foreground">Smart app categorization</div>
                                </div>
                            </Link>
                            <Link href="/features#screenshots" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group">
                                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                                    <Camera className="h-4.5 w-4.5 text-amber-500" />
                                </div>
                                <div>
                                    <div className="font-medium text-sm">Screenshots</div>
                                    <div className="text-xs text-muted-foreground">Optional screen captures</div>
                                </div>
                            </Link>
                            <Link href="/features#cross-platform" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group">
                                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                                    <Laptop className="h-4.5 w-4.5 text-cyan-500" />
                                </div>
                                <div>
                                    <div className="font-medium text-sm">Cross-Platform</div>
                                    <div className="text-xs text-muted-foreground">Mac & Windows support</div>
                                </div>
                            </Link>
                            <div className="border-t border-border mt-2 pt-2">
                                <Link href="/features" className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm text-primary font-medium">
                                    View all features
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Solutions Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 outline-none">
                            Solutions
                            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" sideOffset={8} className="w-[320px] p-2 rounded-xl shadow-lg border">
                            <div className="px-3 py-1.5">
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">By Team Type</p>
                            </div>
                            <Link href="/solutions/remote-teams" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group">
                                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                                    <Globe className="h-4.5 w-4.5 text-blue-500" />
                                </div>
                                <div>
                                    <div className="font-medium text-sm">Remote Teams</div>
                                    <div className="text-xs text-muted-foreground">Distributed workforce management</div>
                                </div>
                            </Link>
                            <Link href="/solutions/virtual-assistants" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group">
                                <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                                    <Users className="h-4.5 w-4.5 text-violet-500" />
                                </div>
                                <div>
                                    <div className="font-medium text-sm">Virtual Assistants</div>
                                    <div className="text-xs text-muted-foreground">Verify VA productivity</div>
                                </div>
                            </Link>
                            <Link href="/solutions/agencies" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group">
                                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                                    <Briefcase className="h-4.5 w-4.5 text-amber-500" />
                                </div>
                                <div>
                                    <div className="font-medium text-sm">Agencies</div>
                                    <div className="text-xs text-muted-foreground">Client billing & contractors</div>
                                </div>
                            </Link>
                            
                            <div className="px-3 py-1.5 mt-2">
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">By Company Size</p>
                            </div>
                            <Link href="/solutions/freelancers" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group">
                                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                                    <Sparkles className="h-4.5 w-4.5 text-emerald-500" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium text-sm flex items-center gap-2">
                                        Freelancers
                                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded font-medium">FREE</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">1 employee free forever</div>
                                </div>
                            </Link>
                            <Link href="/solutions/small-teams" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group">
                                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                                    <Users className="h-4.5 w-4.5 text-blue-500" />
                                </div>
                                <div>
                                    <div className="font-medium text-sm">Small Teams</div>
                                    <div className="text-xs text-muted-foreground">$5/seat for growing teams</div>
                                </div>
                            </Link>
                            <Link href="/solutions/enterprise" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group">
                                <div className="w-9 h-9 rounded-lg bg-slate-500/10 flex items-center justify-center group-hover:bg-slate-500/20 transition-colors">
                                    <Building2 className="h-4.5 w-4.5 text-slate-500" />
                                </div>
                                <div>
                                    <div className="font-medium text-sm">Enterprise</div>
                                    <div className="text-xs text-muted-foreground">Custom solutions & API</div>
                                </div>
                            </Link>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Pricing Link */}
                    <Link href="/pricing" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        Pricing
                    </Link>

                    {/* Resources Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 outline-none">
                            Resources
                            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" sideOffset={8} className="w-[280px] p-2 rounded-xl shadow-lg border">
                            <Link href="/about" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group">
                                <div className="w-9 h-9 rounded-lg bg-slate-500/10 flex items-center justify-center group-hover:bg-slate-500/20 transition-colors">
                                    <Building2 className="h-4.5 w-4.5 text-slate-500" />
                                </div>
                                <div>
                                    <div className="font-medium text-sm">About Us</div>
                                    <div className="text-xs text-muted-foreground">Our mission & values</div>
                                </div>
                            </Link>
                            <Link href="/blog" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group">
                                <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                                    <BookOpen className="h-4.5 w-4.5 text-violet-500" />
                                </div>
                                <div>
                                    <div className="font-medium text-sm">Blog</div>
                                    <div className="text-xs text-muted-foreground">Tips & guides</div>
                                </div>
                            </Link>
                            <Link href="/security" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group">
                                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                                    <Shield className="h-4.5 w-4.5 text-emerald-500" />
                                </div>
                                <div>
                                    <div className="font-medium text-sm">Security</div>
                                    <div className="text-xs text-muted-foreground">Privacy & data protection</div>
                                </div>
                            </Link>
                            <Link href="/contact" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group">
                                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                                    <Mail className="h-4.5 w-4.5 text-blue-500" />
                                </div>
                                <div>
                                    <div className="font-medium text-sm">Contact</div>
                                    <div className="text-xs text-muted-foreground">Get in touch</div>
                                </div>
                            </Link>
                            
                            <div className="border-t border-border mt-2 pt-2">
                                <div className="px-3 py-1.5">
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Download App</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 px-2">
                                    <Link href="/download/macos" className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border hover:bg-muted hover:border-muted-foreground/20 transition-all text-sm">
                                        <Apple className="h-4 w-4" />
                                        macOS
                                    </Link>
                                    <Link href="/download/windows" className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border hover:bg-muted hover:border-muted-foreground/20 transition-all text-sm">
                                        <Monitor className="h-4 w-4" />
                                        Windows
                                    </Link>
                                </div>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </nav>

                {/* Right Side */}
                <div className="flex items-center space-x-3">
                    {session ? (
                        <>
                            <Button asChild variant="ghost" size="sm" className="hidden md:flex">
                                <Link href="/app">Dashboard</Link>
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                        <User className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-48 rounded-xl" align="end" sideOffset={8}>
                                    <div className="px-3 py-2 border-b border-border">
                                        <p className="font-medium text-sm">Account</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {session.user?.email}
                                        </p>
                                    </div>
                                    <div className="p-1">
                                        <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors cursor-pointer">
                                            <LogOut className="h-4 w-4" />
                                            Log out
                                        </button>
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    ) : (
                        <>
                            <Button asChild variant="ghost" size="sm" className="hidden md:flex">
                                <Link href="/login">Log in</Link>
                            </Button>
                            <Button asChild size="sm">
                                <Link href="/login">Start for Free</Link>
                            </Button>
                        </>
                    )}

                    {/* Mobile Menu Button */}
                    <Button 
                        variant="ghost" 
                        size="icon"
                        className="lg:hidden h-8 w-8"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* Mobile Navigation */}
            {mobileMenuOpen && (
                <div className="lg:hidden border-t border-border bg-background">
                    <nav className="container mx-auto px-4 py-4 space-y-1">
                        <Link href="/features" className="block px-3 py-2.5 text-sm font-medium hover:bg-muted rounded-lg transition-colors" onClick={() => setMobileMenuOpen(false)}>
                            Features
                        </Link>
                        <Link href="/solutions/remote-teams" className="block px-3 py-2.5 text-sm font-medium hover:bg-muted rounded-lg transition-colors" onClick={() => setMobileMenuOpen(false)}>
                            Solutions
                        </Link>
                        <Link href="/pricing" className="block px-3 py-2.5 text-sm font-medium hover:bg-muted rounded-lg transition-colors" onClick={() => setMobileMenuOpen(false)}>
                            Pricing
                        </Link>
                        <Link href="/about" className="block px-3 py-2.5 text-sm font-medium hover:bg-muted rounded-lg transition-colors" onClick={() => setMobileMenuOpen(false)}>
                            About
                        </Link>
                        <Link href="/blog" className="block px-3 py-2.5 text-sm font-medium hover:bg-muted rounded-lg transition-colors" onClick={() => setMobileMenuOpen(false)}>
                            Blog
                        </Link>
                        <Link href="/contact" className="block px-3 py-2.5 text-sm font-medium hover:bg-muted rounded-lg transition-colors" onClick={() => setMobileMenuOpen(false)}>
                            Contact
                        </Link>
                        
                        <div className="border-t border-border pt-4 mt-4">
                            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Download App</p>
                            <div className="grid grid-cols-2 gap-2">
                                <Link href="/download/macos" className="flex items-center justify-center gap-2 py-2.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                                    <Apple className="h-4 w-4" />
                                    macOS
                                </Link>
                                <Link href="/download/windows" className="flex items-center justify-center gap-2 py-2.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(false)}>
                                    <Monitor className="h-4 w-4" />
                                    Windows
                                </Link>
                            </div>
                        </div>
                        
                        {session && (
                            <div className="border-t border-border pt-4 mt-4">
                                <Link
                                    href="/app"
                                    className="block px-3 py-2.5 text-sm font-medium text-primary hover:bg-muted rounded-lg transition-colors"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Go to Dashboard →
                                </Link>
                            </div>
                        )}
                    </nav>
                </div>
            )}
        </header>
    )
}
