"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function ErrorPage({
    error,
    reset,
}: Readonly<{
    error: Error & { digest?: string }
    reset: () => void
}>) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <div className="mb-8">
                    <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-semibold mb-2">Something went wrong!</h1>
                    <p className="text-muted-foreground">
                        We encountered an unexpected error. Please try refreshing the page.
                    </p>
                </div>

                <Button onClick={reset}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try again
                </Button>
            </div>
        </div>
    )
}
