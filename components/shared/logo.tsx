import { ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 font-semibold", className)}>
      <ShieldCheck className="size-6 text-primary" strokeWidth={2.25} />
      <span className="text-lg tracking-tight">VeriGuard</span>
    </div>
  )
}
