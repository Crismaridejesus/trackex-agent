import Link from "next/link"
import { APP_NAME } from "@/lib/constants"

export function Footer() {
    return (
        <footer className="border-t border-border bg-muted/30">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
                    {/* Company Info */}
                    <div className="col-span-2">
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                                <span className="text-primary-foreground font-bold text-sm">T</span>
                            </div>
                            <span className="font-bold text-lg">{APP_NAME}</span>
                        </div>
                        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                            Simple remote workforce monitoring. Track productivity, measure performance, 
                            and build accountability.
                        </p>
                    </div>

                    {/* Product */}
                    <div>
                        <h3 className="font-semibold mb-3 text-sm">Product</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link href="/#features" className="text-muted-foreground hover:text-foreground transition-colors">
                                    Features
                                </Link>
                            </li>
                            <li>
                                <Link href="/#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                                    Pricing
                                </Link>
                            </li>
                            <li>
                                <Link href="/download/macos" className="text-muted-foreground hover:text-foreground transition-colors">
                                    macOS App
                                </Link>
                            </li>
                            <li>
                                <Link href="/download/windows" className="text-muted-foreground hover:text-foreground transition-colors">
                                    Windows App
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h3 className="font-semibold mb-3 text-sm">Resources</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors">
                                    Blog
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
                                    Contact
                                </Link>
                            </li>
                            <li>
                                <Link href="/#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                                    How It Works
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h3 className="font-semibold mb-3 text-sm">Legal</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link href="/legal/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/legal/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                                    Terms of Service
                                </Link>
                            </li>
                            <li>
                                <Link href="/legal/acceptable-use" className="text-muted-foreground hover:text-foreground transition-colors">
                                    Acceptable Use
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-border pt-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-muted-foreground">
                            &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
                        </p>
                        <div className="flex gap-6 text-sm text-muted-foreground">
                            <span>Mac & Windows</span>
                            <span>GDPR Compliant</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
