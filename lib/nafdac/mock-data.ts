export interface MockNafdacProduct {
  name: string
  company: string
  category: string
}

// Used only when the live NAFDAC Greenbook lookup succeeds at the HTTP
// level but its response shape doesn't match what we expect (e.g. the
// portal changes its API). Keeps the UI showing something meaningful
// during development instead of a bare error.
export const mockProductPool: MockNafdacProduct[] = [
  {
    name: "Indomie Chicken Flavour Noodles",
    company: "De United Foods Industries Ltd",
    category: "Food",
  },
  {
    name: "Panadol Extra Tablets",
    company: "GlaxoSmithKline Consumer Nigeria Plc",
    category: "Drug",
  },
  {
    name: "Coca-Cola Original",
    company: "Nigerian Bottling Company Ltd",
    category: "Beverage",
  },
  {
    name: "Dettol Antiseptic Liquid",
    company: "Reckitt Benckiser Nigeria Ltd",
    category: "Cosmetic",
  },
  {
    name: "Peak Full Cream Milk Powder",
    company: "FrieslandCampina WAMCO Nigeria Plc",
    category: "Food",
  },
  { name: "Milo Energy Drink", company: "Nestlé Nigeria Plc", category: "Beverage" },
  { name: "Ampiclox Capsules", company: "Beecham Pharmaceuticals Ltd", category: "Drug" },
  {
    name: "Vaseline Intensive Care Lotion",
    company: "Unilever Nigeria Plc",
    category: "Cosmetic",
  },
]

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

export function getMockProduct(nafdacNumber: string): MockNafdacProduct {
  const index = hashString(nafdacNumber) % mockProductPool.length
  return mockProductPool[index]
}
