"use client"

import { Star } from "lucide-react"
import { TESTIMONIALS } from "@/lib/constants"

export function SocialProofSection() {
    return (
        <section className="py-12 border-y border-border bg-muted/30">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {TESTIMONIALS.map((testimonial, index) => (
                        <div key={index} className="text-center">
                            {/* Stars */}
                            <div className="flex justify-center gap-1 mb-3">
                                {[...Array(testimonial.rating)].map((_, i) => (
                                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                                ))}
                            </div>
                            
                            {/* Quote */}
                            <p className="text-sm text-foreground mb-3 leading-relaxed">
                                &ldquo;{testimonial.quote}&rdquo;
                            </p>
                            
                            {/* Author */}
                            <p className="text-sm font-medium">{testimonial.author}</p>
                            <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
