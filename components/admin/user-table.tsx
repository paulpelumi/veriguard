"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, MoreHorizontal, Users } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/shared/empty-state"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { formatDate } from "@/lib/utils/date"
import { nigerianStates } from "@/lib/utils/nigerian-states"
import type { UserRole } from "@/types/database"

interface AdminUserRow {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  business_name: string | null
  state: string | null
  subscription_tier: string
  is_verified: boolean
  is_suspended: boolean
  created_at: string
}

const ROLE_OPTIONS: UserRole[] = ["consumer", "business", "manufacturer", "admin"]
const TIER_OPTIONS = ["free", "starter", "professional", "enterprise"]

export function UserTable() {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const [tierFilter, setTierFilter] = useState<string | null>(null)
  const [stateFilter, setStateFilter] = useState<string | null>(null)
  const [viewingUser, setViewingUser] = useState<AdminUserRow | null>(null)
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)
  const debouncedSearch = useDebouncedValue(search, 300)

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (roleFilter) params.set("role", roleFilter)
    if (tierFilter) params.set("tier", tierFilter)
    if (stateFilter) params.set("state", stateFilter)
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim())

    try {
      const response = await fetch(`/api/admin/users?${params.toString()}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message ?? "Failed to load users")
      setUsers(data.users ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users")
    } finally {
      setIsLoading(false)
    }
  }, [roleFilter, tierFilter, stateFilter, debouncedSearch])

  useEffect(() => {
    // Fetch-on-mount/filter-change is what this effect synchronizes; the
    // setState inside fetchUsers is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers()
  }, [fetchUsers])

  async function updateUser(id: string, updates: { role?: UserRole; is_suspended?: boolean }) {
    setPendingActionId(id)
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message ?? "Update failed")
      setUsers((current) => current.map((u) => (u.id === id ? { ...u, ...data.user } : u)))
      toast.success("User updated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed")
    } finally {
      setPendingActionId(null)
    }
  }

  const hasFilters = Boolean(roleFilter || tierFilter || stateFilter || search)

  function clearFilters() {
    setSearch("")
    setRoleFilter(null)
    setTierFilter(null)
    setStateFilter(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, email, or business..."
          className="sm:max-w-xs"
        />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="sm:w-36">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((role) => (
              <SelectItem key={role} value={role} className="capitalize">
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="sm:w-36">
            <SelectValue placeholder="All tiers" />
          </SelectTrigger>
          <SelectContent>
            {TIER_OPTIONS.map((tier) => (
              <SelectItem key={tier} value={tier} className="capitalize">
                {tier}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="All states" />
          </SelectTrigger>
          <SelectContent>
            {nigerianStates.map((state) => (
              <SelectItem key={state} value={state}>
                {state}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 && !error ? (
        <EmptyState icon={Users} title="No users found" description="Try adjusting your filters." />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name ?? "—"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.business_name ?? "—"}</TableCell>
                  <TableCell>{user.state ?? "—"}</TableCell>
                  <TableCell>{formatDate(user.created_at)}</TableCell>
                  <TableCell className="capitalize">{user.subscription_tier}</TableCell>
                  <TableCell>
                    {user.is_suspended ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : (
                      <Badge className="border-transparent bg-success/10 text-success">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Actions</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewingUser(user)}>View Profile</DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={pendingActionId === user.id}
                          onClick={() => updateUser(user.id, { is_suspended: !user.is_suspended })}
                        >
                          {user.is_suspended ? "Unsuspend Account" : "Suspend Account"}
                        </DropdownMenuItem>
                        {ROLE_OPTIONS.filter((role) => role !== user.role).map((role) => (
                          <DropdownMenuItem
                            key={role}
                            disabled={pendingActionId === user.id}
                            onClick={() => updateUser(user.id, { role })}
                            className="capitalize"
                          >
                            Change role to {role}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!viewingUser} onOpenChange={(open) => !open && setViewingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewingUser?.full_name ?? "User Profile"}</DialogTitle>
            <DialogDescription>{viewingUser?.email}</DialogDescription>
          </DialogHeader>
          {viewingUser && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Role</dt>
              <dd className="capitalize">{viewingUser.role}</dd>
              <dt className="text-muted-foreground">Business</dt>
              <dd>{viewingUser.business_name ?? "—"}</dd>
              <dt className="text-muted-foreground">State</dt>
              <dd>{viewingUser.state ?? "—"}</dd>
              <dt className="text-muted-foreground">Subscription</dt>
              <dd className="capitalize">{viewingUser.subscription_tier}</dd>
              <dt className="text-muted-foreground">Verified</dt>
              <dd>{viewingUser.is_verified ? "Yes" : "No"}</dd>
              <dt className="text-muted-foreground">Joined</dt>
              <dd>{formatDate(viewingUser.created_at)}</dd>
            </dl>
          )}
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </div>
  )
}
