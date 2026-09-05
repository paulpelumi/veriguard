import { AnomalyManagementPanel } from "@/components/admin/anomaly-management-panel"

export default function AdminAnomaliesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Anomalies</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Unusual verification activity detected across the platform.
        </p>
      </div>
      <AnomalyManagementPanel />
    </div>
  )
}
