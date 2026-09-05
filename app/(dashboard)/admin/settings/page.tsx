import { Settings } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"

// The spec names "Platform Settings" only as a sidebar nav entry - no
// specific fields or behavior are defined anywhere in Phase 3. Rather than
// invent settings that don't actually control anything, this stays an
// honest placeholder until a real requirement shows up.
export default function AdminSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Platform Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-wide configuration.
        </p>
      </div>
      <EmptyState
        icon={Settings}
        title="Nothing to configure yet"
        description="No platform-wide settings have been defined yet. This page is reserved for future configuration options."
      />
    </div>
  )
}
