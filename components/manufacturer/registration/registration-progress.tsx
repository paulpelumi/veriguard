import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const STEPS = ["Account", "Company", "Documents", "Review"]

export function RegistrationProgress({ currentStep }: { currentStep: number }) {
  return (
    <ol className="flex items-center">
      {STEPS.map((label, index) => {
        const stepNumber = index + 1
        const isComplete = stepNumber < currentStep
        const isCurrent = stepNumber === currentStep

        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium",
                  isComplete && "border-primary bg-primary text-primary-foreground",
                  isCurrent && "border-primary text-primary",
                  !isComplete && !isCurrent && "border-border text-muted-foreground"
                )}
              >
                {isComplete ? <Check className="size-4" /> : stepNumber}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  isCurrent ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
            {stepNumber < STEPS.length && (
              <div className={cn("mx-2 h-px flex-1", isComplete ? "bg-primary" : "bg-border")} />
            )}
          </li>
        )
      })}
    </ol>
  )
}
