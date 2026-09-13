import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const CURL_EXAMPLE = `curl "https://veriguard-one.vercel.app/api/v1/verify?q=A1-1234" \\
  -H "Authorization: Bearer vg_live_your_api_key"`

export function ApiUsageDocs() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Using your API key</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p className="text-muted-foreground">
          One endpoint: send a NAFDAC number or VeriGuard serial code as <code>q</code>, and it auto-detects
          which one it is.
        </p>
        <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">
          <code>{CURL_EXAMPLE}</code>
        </pre>
        <ul className="text-muted-foreground list-inside list-disc">
          <li>Server-to-server only - never embed a key in browser or mobile app code.</li>
          <li>Requests are rate-limited per key (shown in the table below) and count against your plan&apos;s monthly API call limit.</li>
          <li>A revoked or expired key returns 401; exceeding your rate limit or monthly quota returns 429/403.</li>
        </ul>
      </CardContent>
    </Card>
  )
}
