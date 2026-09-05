import { UserTable } from "@/components/admin/user-table"

export default function AdminUsersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage every registered account on the platform.
        </p>
      </div>
      <UserTable />
    </div>
  )
}
