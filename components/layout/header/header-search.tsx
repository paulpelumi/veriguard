import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"

export function HeaderSearch() {
  return (
    <div className="relative hidden w-full max-w-sm sm:block">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search products, NAFDAC numbers..."
        className="pl-9"
      />
    </div>
  )
}
