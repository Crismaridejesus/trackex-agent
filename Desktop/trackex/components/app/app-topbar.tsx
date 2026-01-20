import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClientTime } from '@/components/ClientTime'

export function AppTopbar() {

  return (
    <Card className="border-b border-l-0 border-r-0 border-t-0 rounded-none">
      <CardContent className="p-4">
        <div className="flex items-center justify-end">
          {/* Data Freshness */}
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs">Live</span>
            </Badge>
            <span className="text-xs text-muted-foreground">
              Last update: <ClientTime live />
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
