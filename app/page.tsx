import { ThemeToggle } from "@/components/shared/theme-toggle";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-background p-8 text-foreground">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">VeriGuard theme check</h1>
        <ThemeToggle />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="flex h-20 w-32 items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground">
          primary
        </div>
        <div className="flex h-20 w-32 items-center justify-center rounded-lg bg-success text-sm font-medium text-success-foreground">
          success
        </div>
        <div className="flex h-20 w-32 items-center justify-center rounded-lg bg-warning text-sm font-medium text-warning-foreground">
          warning
        </div>
        <div className="flex h-20 w-32 items-center justify-center rounded-lg bg-destructive text-sm font-medium text-destructive-foreground">
          destructive
        </div>
        <div className="flex h-20 w-32 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar text-sm font-medium text-sidebar-foreground">
          sidebar
        </div>
        <div className="flex h-20 w-32 items-center justify-center rounded-lg bg-card text-sm font-medium text-card-foreground shadow-sm">
          card
        </div>
        <div className="flex h-20 w-32 items-center justify-center rounded-lg bg-muted text-sm font-medium text-muted-foreground">
          muted
        </div>
        <div className="flex h-20 w-32 items-center justify-center rounded-lg bg-sidebar-accent text-sm font-medium text-sidebar-accent-foreground">
          sidebar-accent
        </div>
      </div>
    </div>
  );
}
