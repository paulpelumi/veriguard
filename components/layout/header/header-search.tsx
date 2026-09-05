"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { createClient } from "@/lib/supabase/client"
import { formatDate } from "@/lib/utils/date"
import type { UserRole } from "@/types/database"

interface SearchResult {
  id: string
  label: string
  sublabel: string
  href: string
}

const MIN_QUERY_LENGTH = 2
const RESULT_LIMIT = 5

export function HeaderSearch({ role }: { role: UserRole }) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const debouncedQuery = useDebouncedValue(query.trim(), 300)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (!userId || debouncedQuery.length < MIN_QUERY_LENGTH) {
      // Clearing stale results when the query no longer qualifies for a
      // search is exactly what this effect synchronizes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([])
      setIsLoading(false)
      return
    }

    const currentUserId = userId
    let cancelled = false
    const supabase = createClient()
    const term = `%${debouncedQuery}%`

    async function search() {
      setIsLoading(true)

      if (role === "business") {
        const { data } = await supabase
          .from("inventory")
          .select("id, product_name, nafdac_number, batch_number")
          .eq("business_id", currentUserId)
          .or(`product_name.ilike.${term},nafdac_number.ilike.${term},batch_number.ilike.${term}`)
          .limit(RESULT_LIMIT)

        if (cancelled) return
        setResults(
          (data ?? []).map((item) => ({
            id: item.id,
            label: item.product_name,
            sublabel: item.nafdac_number ?? item.batch_number ?? "No NAFDAC number",
            href: `/business/inventory?search=${encodeURIComponent(item.product_name)}`,
          }))
        )
      } else {
        const { data } = await supabase
          .from("verification_logs")
          .select("id, product_name, nafdac_number, created_at")
          .eq("user_id", currentUserId)
          .or(`product_name.ilike.${term},nafdac_number.ilike.${term}`)
          .order("created_at", { ascending: false })
          .limit(RESULT_LIMIT)

        if (cancelled) return
        setResults(
          (data ?? []).map((log) => ({
            id: log.id,
            label: log.product_name ?? log.nafdac_number,
            sublabel: `${log.nafdac_number} • ${formatDate(log.created_at)}`,
            href: `/consumer/verify?nafdacNumber=${encodeURIComponent(log.nafdac_number)}`,
          }))
        )
      }

      if (!cancelled) setIsLoading(false)
    }

    search()

    return () => {
      cancelled = true
    }
  }, [debouncedQuery, userId, role])

  function handleSelect(href: string) {
    setOpen(false)
    setQuery("")
    router.push(href)
  }

  const showDropdown = open && debouncedQuery.length >= MIN_QUERY_LENGTH

  return (
    <div ref={containerRef} className="relative hidden w-full max-w-sm sm:block">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder={
          role === "business"
            ? "Search products, NAFDAC numbers..."
            : "Search your verification history..."
        }
        className="pl-9"
      />

      {showDropdown && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-md">
          {isLoading ? (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Searching...
            </div>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">No matches found.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(result.href)}
                    className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <span className="font-medium text-foreground">{result.label}</span>
                    <span className="text-xs text-muted-foreground">{result.sublabel}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
