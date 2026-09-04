import type { Metadata } from "next"

import { RegisterForm } from "@/components/auth/register-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { UserRole } from "@/types/database"

export const metadata: Metadata = {
  title: "Create account | VeriGuard",
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>
}) {
  const { role } = await searchParams
  const defaultRole: UserRole = role === "business" ? "business" : "consumer"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>
          Verify products, track expiry, and stay ahead of recalls.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm defaultRole={defaultRole} />
      </CardContent>
    </Card>
  )
}
