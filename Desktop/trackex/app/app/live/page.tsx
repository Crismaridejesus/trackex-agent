import { Suspense } from 'react'
import { LiveView } from '@/components/app/live-view'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LivePage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Live View</h1>
                <p className="text-muted-foreground">
                    Real-time activity monitoring and employee status.
                </p>
            </div>

            <Suspense fallback={<LiveViewSkeleton />}>
                <LiveView />
            </Suspense>
        </div>
    )
}

function LiveViewSkeleton() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Online Employees</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => {
                            const key = `live-view-skeleton-${i}`;
                            return (
                                <div key={key} className="flex items-center space-x-4 p-4 border rounded-lg">
                                    <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                                        <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                                    </div>
                                    <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
