'use client'

import { useCallback, useRef, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Camera,
    Download,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Monitor,
    Clock,
    ImageOff,
    Loader2,
    ZoomIn,
} from 'lucide-react'
import { DateRange } from 'react-day-picker'
import { useTimezone } from '@/hooks/use-timezone'
import { fmtDate, fmtTime } from '@/lib/time'
import { useState } from 'react'
import { useInfiniteScreenshots } from '@/hooks/queries/use-screenshots'
import type { Screenshot } from '@/lib/api/screenshots.api'

interface EmployeeScreenshotsProps {
    employeeId: string
    dateRange?: DateRange
}

export function EmployeeScreenshots({ employeeId, dateRange }: Readonly<EmployeeScreenshotsProps>) {
    const { timezone } = useTimezone()
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
    const loadMoreRef = useRef<HTMLDivElement>(null)

    // Use infinite query hook
    const {
        data,
        isLoading,
        error,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteScreenshots({
        employeeId,
        startDate: dateRange?.from?.toISOString(),
        endDate: dateRange?.to?.toISOString(),
    })

    // Flatten all pages into a single array
    const allScreenshots = useMemo(() => {
        return data?.pages.flatMap(page => page.screenshots) ?? []
    }, [data?.pages])

    const totalAvailable = data?.pages[0]?.pagination.total ?? 0

    // Intersection Observer for infinite scroll
    useEffect(() => {
        if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage()
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        )

        observer.observe(loadMoreRef.current)

        return () => observer.disconnect()
    }, [hasNextPage, isFetchingNextPage, fetchNextPage])

    const handlePrevious = useCallback(() => {
        if (selectedIndex !== null && selectedIndex > 0) {
            setSelectedIndex(selectedIndex - 1)
        }
    }, [selectedIndex])

    const handleNext = useCallback(() => {
        if (selectedIndex !== null && selectedIndex < allScreenshots.length - 1) {
            setSelectedIndex(selectedIndex + 1)
        }
    }, [selectedIndex, allScreenshots.length])

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowLeft') {
            handlePrevious()
        } else if (e.key === 'ArrowRight') {
            handleNext()
        } else if (e.key === 'Escape') {
            setSelectedIndex(null)
        }
    }, [handlePrevious, handleNext])

    const downloadScreenshot = useCallback((screenshot: Screenshot) => {
        if (!screenshot.cloudinaryUrl) return

        const fileName = `screenshot-${new Date(screenshot.takenAt).toISOString().slice(0, 19)}.${screenshot.format || 'jpg'}`

        fetch(screenshot.cloudinaryUrl)
            .then(res => res.blob())
            .then(blob => {
                const link = document.createElement('a')
                link.href = URL.createObjectURL(blob)
                link.download = fileName
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                URL.revokeObjectURL(link.href)
            })
            .catch(err => console.error('Failed to download screenshot:', err))
    }, [])

    const selectedScreenshot = selectedIndex !== null ? allScreenshots[selectedIndex] : null

    if (isLoading) {
        return <ScreenshotsSkeleton />
    }

    if (error) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center text-destructive">
                        <ImageOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Failed to load screenshots</p>
                        <Button onClick={() => refetch()} className="mt-4" variant="outline">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Retry
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center">
                                <Camera className="h-5 w-5 mr-2" />
                                Screenshots
                            </CardTitle>
                            <CardDescription>
                                {totalAvailable > 0
                                    ? `${totalAvailable} screenshot${totalAvailable !== 1 ? 's' : ''} captured in selected period`
                                    : 'Screenshots captured for this employee'
                                }
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => refetch()}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {allScreenshots.length === 0 ? (
                        <EmptyScreenshotsState />
                    ) : (
                        <div className="space-y-4">
                            {/* Screenshot Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {allScreenshots.map((screenshot, index) => (
                                    <ScreenshotThumbnail
                                        key={screenshot.id}
                                        screenshot={screenshot}
                                        timezone={timezone}
                                        onClick={() => setSelectedIndex(index)}
                                    />
                                ))}
                            </div>

                            {/* Infinite Scroll Trigger & Loading Indicator */}
                            <div ref={loadMoreRef} className="flex items-center justify-center py-4">
                                {isFetchingNextPage && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Loading more screenshots...</span>
                                    </div>
                                )}
                            </div>

                            {/* Pagination Info */}
                            <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
                                <span>
                                    Showing {allScreenshots.length} of {totalAvailable} screenshot{totalAvailable !== 1 ? 's' : ''}
                                </span>
                                {hasNextPage && !isFetchingNextPage && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fetchNextPage()}
                                    >
                                        Load More
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Lightbox Dialog */}
            <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
                <DialogContent
                    className="max-w-5xl w-full p-0 gap-0"
                    onKeyDown={handleKeyDown}
                >
                    {selectedScreenshot && (
                        <>
                            <DialogHeader className="p-4 border-b">
                                <div className="flex items-center justify-between">
                                    <DialogTitle className="flex items-center gap-2">
                                        <Camera className="h-5 w-5" />
                                        Screenshot
                                        <Badge variant="outline" className="ml-2">
                                            {selectedIndex! + 1} / {allScreenshots.length}
                                        </Badge>
                                    </DialogTitle>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => downloadScreenshot(selectedScreenshot)}
                                        >
                                            <Download className="mr-2 h-4 w-4" />
                                            Download
                                        </Button>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="relative">
                                {/* Navigation Buttons */}
                                {selectedIndex! > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background"
                                        onClick={handlePrevious}
                                    >
                                        <ChevronLeft className="h-6 w-6" />
                                    </Button>
                                )}
                                {selectedIndex! < allScreenshots.length - 1 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background"
                                        onClick={handleNext}
                                    >
                                        <ChevronRight className="h-6 w-6" />
                                    </Button>
                                )}

                                {/* Screenshot Image */}
                                <div className="flex items-center justify-center bg-muted/30 min-h-[400px] max-h-[70vh] overflow-hidden">
                                    <Image
                                        src={selectedScreenshot.cloudinaryUrl}
                                        alt="Employee Screenshot"
                                        className="w-full h-auto max-h-[70vh] object-contain"
                                        width={selectedScreenshot.width || 1920}
                                        height={selectedScreenshot.height || 1080}
                                        priority
                                    />
                                </div>

                                {/* Screenshot Info */}
                                <div className="p-4 border-t bg-muted/30">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <Clock className="h-4 w-4" />
                                                <span>
                                                    {fmtDate(new Date(selectedScreenshot.takenAt), timezone)}{' '}
                                                    {fmtTime(new Date(selectedScreenshot.takenAt), timezone)}
                                                </span>
                                            </div>
                                            {selectedScreenshot.device && (
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                    <Monitor className="h-4 w-4" />
                                                    <span>
                                                        {selectedScreenshot.device.deviceName} ({selectedScreenshot.device.platform})
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {selectedScreenshot.isAuto && (
                                                <Badge variant="secondary">Auto</Badge>
                                            )}
                                            <Badge variant="outline">
                                                {selectedScreenshot.width}×{selectedScreenshot.height}
                                            </Badge>
                                            <Badge variant="outline">
                                                {formatBytes(selectedScreenshot.bytes)}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}

interface ScreenshotThumbnailProps {
    screenshot: Screenshot
    timezone: string
    onClick: () => void
}

function ScreenshotThumbnail({ screenshot, timezone, onClick }: Readonly<ScreenshotThumbnailProps>) {
    return (
        <div
            className="group relative cursor-pointer rounded-lg overflow-hidden border bg-muted/30 hover:ring-2 hover:ring-primary transition-all"
            onClick={onClick}
        >
            <div className="aspect-video relative">
                <Image
                    src={screenshot.cloudinaryUrl}
                    alt="Screenshot thumbnail"
                    className="object-cover"
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                />
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn className="h-8 w-8 text-white" />
                </div>
            </div>
            <div className="p-2 space-y-1">
                <p className="text-xs text-muted-foreground">
                    {fmtDate(new Date(screenshot.takenAt), timezone)}
                </p>
                <p className="text-xs text-muted-foreground">
                    {fmtTime(new Date(screenshot.takenAt), timezone)}
                </p>
                <div className="flex items-center gap-1">
                    {screenshot.isAuto && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                            Auto
                        </Badge>
                    )}
                    {screenshot.device && (
                        <span className="text-[10px] text-muted-foreground truncate">
                            {screenshot.device.platform}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}

function EmptyScreenshotsState() {
    return (
        <div className="text-center py-12 text-muted-foreground">
            <Camera className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-medium mb-2">No screenshots captured</h3>
            <p className="text-sm max-w-md mx-auto">
                Screenshots will appear here when captured. Enable auto-screenshots in the employee settings
                or request screenshots manually from online employees.
            </p>
        </div>
    )
}

function ScreenshotsSkeleton() {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="h-6 w-32 bg-muted rounded animate-pulse mb-2" />
                        <div className="h-4 w-64 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="h-9 w-24 bg-muted rounded animate-pulse" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={`screenshot-skeleton-${i}`} className="space-y-2">
                            <div className="aspect-video bg-muted rounded-lg animate-pulse" />
                            <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
