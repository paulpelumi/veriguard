interface RecallLike {
  product_name: string
  nafdac_number: string | null
}

interface InventoryLike {
  product_name: string
  nafdac_number: string | null
}

// Mirrors an ilike '%term%' style fuzzy match (bidirectional substring),
// done in memory rather than as a per-recall SQL query since both datasets
// (one business's inventory, and the small set of active recalls) are
// small enough that this beats an N-query round trip.
export function isRecallMatch(recall: RecallLike, item: InventoryLike): boolean {
  if (
    recall.nafdac_number &&
    item.nafdac_number &&
    recall.nafdac_number.toUpperCase() === item.nafdac_number.toUpperCase()
  ) {
    return true
  }

  const recallName = recall.product_name.toLowerCase().trim()
  const itemName = item.product_name.toLowerCase().trim()
  if (!recallName || !itemName) return false

  return recallName.includes(itemName) || itemName.includes(recallName)
}
