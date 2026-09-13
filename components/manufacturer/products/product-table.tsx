import { Package, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ManufacturerProduct } from "@/types"

export function ProductTable({
  products,
  onAddProduct,
  onDelete,
}: {
  products: ManufacturerProduct[]
  onAddProduct: () => void
  onDelete: (id: string) => void
}) {
  if (products.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No products registered yet"
        description="Register a product before creating batches - its details are reused every time you generate codes."
        action={<Button onClick={onAddProduct}>Add Product</Button>}
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product Name</TableHead>
            <TableHead>NAFDAC No.</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">{product.product_name}</TableCell>
              <TableCell>{product.nafdac_number}</TableCell>
              <TableCell>{product.product_category ?? "—"}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove product"
                  onClick={() => onDelete(product.id)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
