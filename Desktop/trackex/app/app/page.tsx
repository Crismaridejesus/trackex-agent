import { Suspense } from 'react'
import { HomeAnalytics } from '@/components/app/home-analytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                    Overview of your team&apos;s productivity and time tracking.
                </p>
            </div>

            <Suspense fallback={<HomeAnalyticsSkeleton />}>
                <HomeAnalytics />
            </Suspense>
        </div>
    )
}

function HomeAnalyticsSkeleton() {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => {
                const key = `home-analytics-skeleton-${i}`;
                return (
                    <Card key={key}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 w-24 bg-muted rounded animate-pulse mb-2" />
                            <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}