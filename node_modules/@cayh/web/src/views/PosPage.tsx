import React, { useEffect, useMemo, useState } from 'react'
import { CartLine, Product, fetchProducts, submitSale, createProduct, updateProduct, deleteProduct } from '../lib/api'

const demoProducts = [
  { id: 'p1', name: 'Americano', price: 90 },
  { id: 'p2', name: 'Latte', price: 120 },
  { id: 'p3', name: 'Caramel Macchiato', price: 140 },
]

export function PosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cart, setCart] = useState<CartLine[]>([])
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [cashTendered, setCashTendered] = useState<string>('')
  const [showReceipt, setShowReceipt] = useState(false)
  const [lastSale, setLastSale] = useState<any>(null)
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    sku: '',
    category: '',
    stockLevel: ''
  })
  const total = useMemo(() => cart.reduce((sum, l) => sum + l.price * l.qty, 0), [cart])

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean))
    return ['all', ...Array.from(cats)]
  }, [products])

  // Filter products based on search and category
  useEffect(() => {
    let filtered = products

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p: Product) => p.category === selectedCategory)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((p: Product) =>
        p.name.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query)
      )
    }

    setFilteredProducts(filtered)
  }, [products, searchQuery, selectedCategory])

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await fetchProducts()
        setProducts(data)
      } catch (err) {
        setError('Failed to load products')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [])

  function addToCart(productId: string) {
    const p = products.find((x: Product) => x.id === productId)
    if (!p) return

    // Check if product is active and has stock
    if (!p.isActive) {
      alert('Product is not available')
      return
    }
    if (p.inventory.onHandQty <= 0) {
      alert('Product is out of stock')
      return
    }

    setCart((prev) =>
      prev
        .map((l: CartLine) => (l.productId === productId ? { ...l, qty: l.qty + 1 } : l))
        .concat(prev.some((l: CartLine) => l.productId === productId) ? [] : [{ productId, name: p.name, price: p.price, qty: 1 }])
    )
  }

  async function handleCheckout() {
    if (cart.length === 0) return

    const cashAmount = parseFloat(cashTendered)
    if (isNaN(cashAmount) || cashAmount < total) {
      alert('Please enter a valid cash amount that covers the total.')
      return
    }

    setCheckoutLoading(true)
    try {
      const sale = await submitSale(cart)
      setLastSale({ ...sale, cash: cashAmount, lines: cart })
      setShowReceipt(true)
      setCart([]) // Clear cart after successful sale
      setCashTendered('') // Clear cash input
    } catch (err) {
      alert(`Checkout failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setCheckoutLoading(false)
    }
  }

  function clearCart() {
    setCart([])
    setCashTendered('')
  }

  function openProductModal(product?: Product) {
    setEditingProduct(product || null)
    setProductForm({
      name: product?.name || '',
      price: product?.price.toString() || '',
      sku: product?.sku || '',
      category: product?.category || '',
      stockLevel: product?.inventory.onHandQty.toString() || '0'
    })
    setShowProductModal(true)
  }

  function closeProductModal() {
    setShowProductModal(false)
    setEditingProduct(null)
    setProductForm({
      name: '',
      price: '',
      sku: '',
      category: '',
      stockLevel: ''
    })
  }

  async function handleProductSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      const productData = {
        name: productForm.name.trim(),
        price: parseFloat(productForm.price),
        sku: productForm.sku.trim() || undefined,
        category: productForm.category.trim() || undefined,
        stockLevel: parseInt(productForm.stockLevel) || 0
      }

      if (editingProduct) {
        await updateProduct({ id: editingProduct.id, ...productData })
      } else {
        await createProduct(productData)
      }

      await loadProducts() // Refresh product list
      closeProductModal()
    } catch (err) {
      alert(`Failed to ${editingProduct ? 'update' : 'create'} product: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  async function handleDeleteProduct(productId: string) {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      await deleteProduct(productId)
      await loadProducts() // Refresh product list
    } catch (err) {
      alert(`Failed to delete product: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  async function loadProducts() {
    try {
      const data = await fetchProducts()
      setProducts(data)
      setError(null)
    } catch (err) {
      setError('Failed to load products')
      console.error(err)
    }
  }

  function setQty(productId: string, qty: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.productId === productId ? { ...l, qty } : l))
        .filter((l) => l.qty > 0),
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-amber-900">☕ Coffee @ Yellow Hauz</h1>
            <p className="text-amber-700">Point of Sale System</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-amber-600">Today's Date</p>
            <p className="font-semibold text-amber-900">{new Date().toLocaleDateString()}</p>
            <button
              onClick={() => openProductModal()}
              className="mt-2 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors text-sm font-medium"
            >
              ⚙️ Manage Products
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* Products Section */}
          <section className="rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Products</h2>

              {/* Search and Filters */}
              <div className="mb-4 flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
                <div className="flex gap-2 overflow-x-auto">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category || 'all')}
                      className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        selectedCategory === category
                          ? 'bg-amber-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category === 'all' ? 'All' : (category || 'Uncategorized')}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-sm text-gray-600">
                {loading ? 'Loading products...' : error ? error : `Connected to database • ${filteredProducts.length} products`}
              </p>
            </div>

            {/* Products Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loading ? (
                <div className="col-span-full flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-2"></div>
                    <p className="text-gray-500">Loading products...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="col-span-full rounded-lg bg-red-50 p-6 text-center">
                  <p className="text-red-600 font-medium">❌ {error}</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="col-span-full rounded-lg bg-gray-50 p-6 text-center">
                  <p className="text-gray-500">No products found</p>
                </div>
              ) : (
                filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    className={`group relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all hover:shadow-lg ${
                      !p.isActive || p.inventory.onHandQty <= 0
                        ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                        : 'border-gray-200 bg-white hover:border-amber-300'
                    }`}
                    onClick={() => addToCart(p.id)}
                    disabled={!p.isActive || p.inventory.onHandQty <= 0}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 group-hover:text-amber-800">{p.name}</h3>
                        <p className="text-lg font-bold text-amber-600 mt-1">₱{p.price.toFixed(2)}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            p.inventory.onHandQty <= p.inventory.lowStockLevel
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            Stock: {p.inventory.onHandQty}
                            {p.inventory.onHandQty <= p.inventory.lowStockLevel && ' ⚠️'}
                          </span>
                        </div>
                      </div>
                      {!p.isActive && (
                        <span className="text-xs text-red-500 font-medium">Inactive</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          {/* Cart Section */}
          <aside className="rounded-2xl bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Cart</h2>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="mb-4 max-h-64 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-lg mb-2">🛒</p>
                  <p>No items in cart</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((l) => (
                    <div key={l.productId} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{l.name}</p>
                        <p className="text-sm text-gray-600">₱{l.price.toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setQty(l.productId, l.qty - 1)}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-700 font-bold"
                        >
                          −
                        </button>
                        <input
                          className="w-16 text-center rounded border border-gray-300 px-2 py-1"
                          type="number"
                          min={0}
                          value={l.qty}
                          onChange={(e) => setQty(l.productId, Number(e.target.value))}
                        />
                        <button
                          onClick={() => setQty(l.productId, l.qty + 1)}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-700 font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total */}
            <div className="border-t pt-4 mb-4">
              <div className="flex justify-between items-center text-xl font-bold text-gray-800">
                <span>Total:</span>
                <span>₱{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Cash Payment */}
            {cart.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cash Tendered
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={total.toFixed(2)}
                  placeholder={`Min: ₱${total.toFixed(2)}`}
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-lg focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
                {cashTendered && parseFloat(cashTendered) >= total && (
                  <p className="text-sm text-green-600 mt-1">
                    Change: ₱{(parseFloat(cashTendered) - total).toFixed(2)}
                  </p>
                )}
              </div>
            )}

            {/* Checkout Button */}
            <button
              className={`w-full rounded-xl py-3 text-lg font-semibold transition-all ${
                cart.length === 0 || checkoutLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-amber-600 text-white hover:bg-amber-700 shadow-lg hover:shadow-xl'
              }`}
              disabled={cart.length === 0 || checkoutLoading}
              onClick={handleCheckout}
            >
              {checkoutLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing...
                </div>
              ) : (
                '💳 Complete Sale'
              )}
            </button>
          </aside>
        </div>

        {/* Receipt Modal */}
        {showReceipt && lastSale && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold text-amber-900">☕ Coffee @ Yellow Hauz</h3>
                <p className="text-sm text-gray-600">{new Date().toLocaleString()}</p>
              </div>

              <div className="border-t border-b py-4 my-4">
                {lastSale.lines.map((item: CartLine, index: number) => (
                  <div key={index} className="flex justify-between py-1">
                    <span className="text-sm">{item.name} × {item.qty}</span>
                    <span className="text-sm font-medium">₱{(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₱{lastSale.subtotal.toFixed(2)}</span>
                </div>
                {lastSale.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>-₱{lastSale.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span>₱{lastSale.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cash Tendered:</span>
                  <span>₱{lastSale.cash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-green-600">
                  <span>Change:</span>
                  <span>₱{lastSale.change.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center mt-6">
                <p className="text-sm text-gray-600 mb-4">Thank you for your business!</p>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="w-full bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Close Receipt
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Product Management Modal */}
        {showProductModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-amber-900">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h3>
                <button
                  onClick={closeProductModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleProductSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={productForm.name}
                      onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                      placeholder="e.g. Espresso"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (₱) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={productForm.price}
                      onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SKU (Optional)
                    </label>
                    <input
                      type="text"
                      value={productForm.sku}
                      onChange={(e) => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                      placeholder="e.g. ESP-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category (Optional)
                    </label>
                    <input
                      type="text"
                      value={productForm.category}
                      onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                      placeholder="e.g. Hot Drinks"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Initial Stock Level
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={productForm.stockLevel}
                      onChange={(e) => setProductForm(prev => ({ ...prev, stockLevel: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 transition-colors font-medium"
                  >
                    {editingProduct ? 'Update Product' : 'Create Product'}
                  </button>
                  <button
                    type="button"
                    onClick={closeProductModal}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>

              {/* Existing Products List */}
              {products.length > 0 && (
                <div className="mt-8">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Existing Products</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {products.map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-800">{product.name}</p>
                          <p className="text-sm text-gray-600">₱{product.price.toFixed(2)} • Stock: {product.inventory.onHandQty}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openProductModal(product)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
