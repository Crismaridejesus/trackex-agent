import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Settings, Database, FileText } from "lucide-react"
import { TeamManagement } from "@/components/app/team-management"
import { PolicyManagement } from "@/components/app/policy-management"
import { AppRulesManagement } from "@/components/app/app-rules-management"
import { AuditLogViewer } from "@/components/app/audit-log-viewer"
import { DomainRulesManagement } from "@/components/app/domain-rules-management"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure policies, app rules, and system settings.
        </p>
      </div>

      {/* Policy Management Section */}
      <PolicyManagement />

      {/* Team Management Section */}
      <TeamManagement />

      {/* App Rules Management Section */}
      <AppRulesManagement />

      {/* Domain Rules Management Section */}
      <DomainRulesManagement />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Audit Log
          </CardTitle>
          <CardDescription>
            Recent administrative actions and system events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuditLogViewer />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5" />
              Data & Privacy
            </CardTitle>
            <CardDescription>
              Manage data retention and privacy settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4 text-muted-foreground">
              Data management coming soon...
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              System
            </CardTitle>
            <CardDescription>
              General system configuration and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Idle Time Settings</h4>
              <p className="text-sm text-muted-foreground">
                Consider user as idle after: <strong>30 minutes</strong> of
                inactivity
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Screenshot Settings</h4>
              <p className="text-sm text-muted-foreground">
                Default interval: <strong>10 minutes</strong> (can be customized
                per employee)
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Data Retention</h4>
              <p className="text-sm text-muted-foreground">
                Events: <strong>90 days</strong> • Screenshots:{" "}
                <strong>30 days</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
