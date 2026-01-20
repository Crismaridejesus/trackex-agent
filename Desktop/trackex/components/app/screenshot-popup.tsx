/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Camera,
    Download,
    RefreshCw,
    Clock,
    User,
    Monitor,
    CheckCircle,
    XCircle,
    Loader2,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils/format'
import Image from 'next/image'
import { useScreenshotJob } from '@/hooks/queries/use-screenshots'

interface ScreenshotPopupProps {
    jobId: string | null
    onClose: () => void
}

// ---- Helpers ----
function StatusBadge({ status }: Readonly<{ status: string }>) {
    const variants: Record<string, { color: string; icon: JSX.Element; label: string }> = {
        pending: { color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="mr-1 h-3 w-3" />, label: 'Pending' },
        in_progress: { color: 'bg-blue-100 text-blue-700', icon: <Loader2 className="mr-1 h-3 w-3 animate-spin" />, label: 'In Progress' },
        completed: { color: 'bg-green-100 text-green-700', icon: <CheckCircle className="mr-1 h-3 w-3" />, label: 'Completed' },
        failed: { color: 'bg-red-100 text-red-700', icon: <XCircle className="mr-1 h-3 w-3" />, label: 'Failed' },
    }

    const variant = variants[status]
    if (!variant) return <Badge variant="outline">{status}</Badge>

    return (
        <Badge variant={status === 'failed' ? 'destructive' : 'secondary'} className={variant.color}>
            {variant.icon}
            {variant.label}
        </Badge>
    )
}

function ScreenshotImage({ data }: Readonly<{ data: any }>) {
    if (!data.cloudinaryUrl) {
        return (
            <div className="text-center py-8">
                <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <p className="text-destructive">Screenshot not available</p>
                <p className="text-sm text-muted-foreground mt-2">
                    Screenshot data is missing or corrupted.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Screenshot</h3>
                <Button onClick={() => downloadScreenshot(data)} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                </Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
                <Image
                    src={data.cloudinaryUrl}
                    alt="Employee Screenshot"
                    className="w-full h-auto max-h-[60vh] object-contain"
                    width={data.width || 1920}
                    height={data.height || 1080}
                />
            </div>
            {data.timestamp && (
                <p className="text-sm text-muted-foreground text-center">
                    Captured at {new Date(data.timestamp).toLocaleString()}
                </p>
            )}
        </div>
    )
}

function JobInfo({ data }: Readonly<{ data: any }>) {
    return (
        <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600">
                    <User className="h-5 w-5" />
                </div>
                <div>
                    <div className="font-medium">{data.employee.name}</div>
                    <div className="text-sm text-muted-foreground">{data.employee.email}</div>
                    <div className="flex items-center space-x-2 mt-1">
                        <Monitor className="h-3 w-3" />
                        <span className="text-sm text-muted-foreground">
                            {data.device.deviceName} ({data.device.platform})
                        </span>
                    </div>
                </div>
            </div>
            <div className="text-right space-y-2">
                <StatusBadge status={data.status} />
                <div className="text-sm text-muted-foreground">Requested {formatRelativeTime(data.createdAt)}</div>
                {data.completedAt && (
                    <div className="text-sm text-muted-foreground">
                        Completed {formatRelativeTime(data.completedAt)}
                    </div>
                )}
            </div>
        </div>
    )
}

function downloadScreenshot(data: any) {
    if (!data.cloudinaryUrl) return;

    const fileName = `screenshot-${data.employee.name}-${new Date().toISOString().slice(0, 19)}.${data.format || 'jpg'}`;

    fetch(data.cloudinaryUrl)
        .then(res => res.blob())
        .then(blob => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        })
        .catch(err => console.error('Failed to download screenshot:', err));
}


function LoadingState() {
    return (
        <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading screenshot job...
        </div>
    )
}

function ErrorState({ error, refetch }: Readonly<{ error: unknown; refetch: () => void }>) {
    return (
        <div className="text-center py-8">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive mb-4">
                {error instanceof Error ? error.message : 'Failed to load screenshot job'}
            </p>
            <Button onClick={refetch} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
            </Button>
        </div>
    )
}

function FailedState() {
    return (
        <div className="text-center py-8">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive">Screenshot capture failed</p>
            <p className="text-sm text-muted-foreground mt-2">
                The employee device may be offline or unable to capture screenshots.
            </p>
        </div>
    )
}

function WaitingState({ status, pollCount }: Readonly<{ status: string; pollCount: number }>) {
    return (
        <div className="text-center py-8">
            <div className="flex items-center justify-center mb-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
            <p className="text-lg font-medium mb-2">
                {status === 'pending' ? 'Waiting for device...' : 'Capturing screenshot...'}
            </p>
            <p className="text-sm text-muted-foreground">
                This may take a few moments. The screenshot will appear here automatically.
            </p>
            {pollCount > 10 && (
                <p className="text-sm text-yellow-600 mt-2">
                    Taking longer than expected. The device may be offline.
                </p>
            )}
        </div>
    )
}

// ---- Main Component ----
export function ScreenshotPopup({ jobId, onClose }: Readonly<ScreenshotPopupProps>) {
    const [pollCount, setPollCount] = useState(0)
    const maxPolls = 30

    // Use custom hook for screenshot job polling
    const { data, isLoading, error, refetch } = useScreenshotJob(jobId, {
        enabled: !!jobId,
        maxPolls,
    })

    useEffect(() => {
        if (data && ['pending', 'in_progress'].includes(data.status)) setPollCount((p) => p + 1)
    }, [data])

    return (
        <Dialog open={!!jobId} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center">
                        <Camera className="mr-2 h-5 w-5" />
                        Employee Screenshot
                    </DialogTitle>
                    <DialogDescription>Live screenshot capture from employee device</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {isLoading && <LoadingState />}
                    {error && <ErrorState error={error} refetch={refetch} />}
                    {data && (
                        <>
                            <JobInfo data={data} />

                            {data.status === 'completed' && <ScreenshotImage data={data} />}
                            {data.status === 'failed' && <FailedState />}
                            {['pending', 'in_progress'].includes(data.status) && <WaitingState status={data.status} pollCount={pollCount} />}

                            {['pending', 'in_progress'].includes(data.status) && (
                                <div className="flex justify-center">
                                    <Button onClick={() => refetch()} variant="outline" size="sm">
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Check Status
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
