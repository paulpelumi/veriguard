import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

// A read-only summary for now, matching how Platform Settings started in
// Phase 3 (Module 7) - editing company details isn't specified anywhere in
// Phase 4's spec, so this stays honest about only showing what exists
// rather than inventing an edit flow nothing asked for.
export default async function ManufacturerSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: manufacturer } = await supabase
    .from("manufacturer_profiles")
    .select(
      "company_name, cac_number, nafdac_manufacturer_code, product_categories, state, address, phone, website, subscription_tier, monthly_unit_limit, units_generated_this_month"
    )
    .eq("id", user!.id)
    .maybeSingle()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your company profile on VeriGuard.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Company name</dt>
              <dd className="text-foreground">{manufacturer?.company_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">CAC number</dt>
              <dd className="text-foreground">{manufacturer?.cac_number ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">NAFDAC manufacturer code</dt>
              <dd className="text-foreground">{manufacturer?.nafdac_manufacturer_code ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Product categories</dt>
              <dd className="text-foreground">
                {manufacturer?.product_categories?.join(", ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">State</dt>
              <dd className="text-foreground">{manufacturer?.state ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Address</dt>
              <dd className="text-foreground">{manufacturer?.address ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="text-foreground">{manufacturer?.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Website</dt>
              <dd className="text-foreground">{manufacturer?.website ?? "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Tier</dt>
              <dd className="text-foreground capitalize">{manufacturer?.subscription_tier ?? "pilot"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Monthly usage</dt>
              <dd className="text-foreground">
                {(manufacturer?.units_generated_this_month ?? 0).toLocaleString()} /{" "}
                {(manufacturer?.monthly_unit_limit ?? 0).toLocaleString()} codes
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
