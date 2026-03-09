export type Product = {
  id: string
  name: string
  price: number
  sku?: string
  category?: string
  isActive: boolean
  inventory: {
    onHandQty: number
    lowStockLevel: number
  }
}

export type CartLine = {
  productId: string
  name: string
  price: number
  qty: number
}

export type SaleRequest = {
  lines: {
    productId: string
    qty: number
  }[]
}

export type SaleResponse = {
  id: string
  subtotal: number
  discount: number
  total: number
  cash: number
  change: number
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch('/api/products')
  if (!res.ok) throw new Error('Failed to fetch products')
  return res.json()
}

export async function createProduct(productData: {
  name: string
  price: number
  sku?: string
  category?: string
  stockLevel: number
}): Promise<Product> {
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData)
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(error || 'Failed to create product')
  }

  return res.json()
}

export async function updateProduct(productData: {
  id: string
  name: string
  price: number
  sku?: string
  category?: string
  stockLevel?: number
}): Promise<Product> {
  const res = await fetch('/api/products', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData)
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(error || 'Failed to update product')
  }

  return res.json()
}

export async function submitSale(cart: CartLine[]): Promise<SaleResponse> {
  const saleRequest: SaleRequest = {
    lines: cart.map(line => ({
      productId: line.productId,
      qty: line.qty
    }))
  }

  const res = await fetch('/api/sales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(saleRequest)
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(error || 'Failed to submit sale')
  }

  return res.json()
}

export async function deleteProduct(productId: string): Promise<{ message: string }> {
  const res = await fetch('/api/products', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: productId })
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(error || 'Failed to delete product')
  }

  return res.json()
}
