import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, RefreshCw } from 'lucide-react'

export default function AuditLogPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
                <p className="text-muted-foreground">
                    Track all administrative actions and system events.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <FileText className="mr-2 h-5 w-5" />
                        Audit Log
                    </CardTitle>
                    <CardDescription>
                        Administrative actions and system events
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                            🔍 Filter by action: Coming soon...
                        </div>
                        <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </button>
                    </div>
                    <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No audit logs found</p>
                        <p className="text-sm">Audit logs will appear here as actions are performed</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

