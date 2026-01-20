"use client"

import { AgentVersionManagement } from "@/components/app/agent-version-management";

export default function AgentVersionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agent Versions</h1>
        <p className="text-muted-foreground">
          Manage desktop agent versions, releases, and updates.
        </p>
      </div>

      <AgentVersionManagement />
    </div>
  )
}
