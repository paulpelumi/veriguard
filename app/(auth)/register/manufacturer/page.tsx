import type { Metadata } from "next"
import Link from "next/link"

import { ManufacturerRegistrationForm } from "@/components/manufacturer/registration/manufacturer-registration-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Register as a Manufacturer | VeriGuard",
}

export default function ManufacturerRegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Register as a Manufacturer</CardTitle>
        <CardDescription>
          Generate serialised QR codes, protect your brand, and track your products through the
          Nigerian supply chain.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ManufacturerRegistrationForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Not a manufacturer?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Register as a consumer or business
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
