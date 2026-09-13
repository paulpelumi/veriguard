import { Receipt } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/utils/date"
import { formatNaira } from "@/lib/utils/currency"
import type { Database } from "@/types/database"

type PaymentHistoryRow = Database["public"]["Tables"]["payment_history"]["Row"]

const STATUS_BADGE: Record<PaymentHistoryRow["status"], string> = {
  success: "bg-success/10 text-success border-transparent",
  pending: "bg-muted text-muted-foreground border-transparent",
  failed: "bg-destructive/10 text-destructive border-transparent",
  refunded: "bg-primary/10 text-primary border-transparent",
}

export function PaymentHistoryTable({ payments }: { payments: PaymentHistoryRow[] }) {
  if (payments.length === 0) {
    return <EmptyState icon={Receipt} title="No payments yet" description="Your payment history will appear here." />
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>{formatDate(payment.created_at)}</TableCell>
              <TableCell>{payment.description ?? "Subscription payment"}</TableCell>
              <TableCell>{formatNaira(payment.amount_kobo)}</TableCell>
              <TableCell className="font-mono text-xs">{payment.paystack_reference}</TableCell>
              <TableCell>
                <Badge className={`capitalize ${STATUS_BADGE[payment.status]}`}>{payment.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
