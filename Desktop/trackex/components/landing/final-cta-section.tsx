"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function FinalCTASection() {
    return (
        <section className="section-padding bg-primary text-primary-foreground">
            <div className="container mx-auto px-4 max-w-3xl text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    Ready to Monitor Your Remote Team?
                </h2>
                <p className="text-lg opacity-90 mb-8">
                    Start free with one employee. No credit card required.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button size="lg" variant="secondary" className="text-base" asChild>
                        <Link href="/login">
                            Get Started Free
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                    </Button>
                    <Button size="lg" variant="outline-light" className="text-base" asChild>
                        <Link href="/contact">
                            Contact Sales
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
    )
}
