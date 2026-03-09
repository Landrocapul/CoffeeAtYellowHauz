import React, { useMemo, useState } from 'react'

type CartLine = {
  productId: string
  name: string
  price: number
  qty: number
}

const demoProducts = [
  { id: 'p1', name: 'Americano', price: 90 },
  { id: 'p2', name: 'Latte', price: 120 },
  { id: 'p3', name: 'Caramel Macchiato', price: 140 },
]

export function PosPage() {
  const [cart, setCart] = useState<CartLine[]>([])
  const total = useMemo(() => cart.reduce((sum, l) => sum + l.price * l.qty, 0), [cart])

  function addToCart(productId: string) {
    const p = demoProducts.find((x) => x.id === productId)
    if (!p) return

    setCart((prev) => {
      const idx = prev.findIndex((l) => l.productId === productId)
      if (idx === -1) return [...prev, { productId, name: p.name, price: p.price, qty: 1 }]
      return prev.map((l, i) => (i === idx ? { ...l, qty: l.qty + 1 } : l))
    })
  }

  function setQty(productId: string, qty: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.productId === productId ? { ...l, qty } : l))
        .filter((l) => l.qty > 0),
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-xl border bg-white p-4">
        <h1 className="text-lg font-semibold">POS</h1>
        <p className="mt-1 text-sm text-zinc-600">Demo UI. Will be connected to your database next.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {demoProducts.map((p) => (
            <button
              key={p.id}
              className="rounded-lg border p-4 text-left hover:bg-zinc-50"
              onClick={() => addToCart(p.id)}
              type="button"
            >
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-zinc-600">₱ {p.price.toFixed(2)}</div>
            </button>
          ))}
        </div>
      </section>

      <aside className="rounded-xl border bg-white p-4">
        <h2 className="text-base font-semibold">Cart</h2>
        <div className="mt-3 space-y-3">
          {cart.length === 0 ? (
            <div className="text-sm text-zinc-600">No items yet.</div>
          ) : (
            cart.map((l) => (
              <div key={l.productId} className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{l.name}</div>
                  <div className="text-xs text-zinc-600">₱ {l.price.toFixed(2)}</div>
                </div>
                <input
                  className="w-20 rounded border px-2 py-1 text-sm"
                  type="number"
                  min={0}
                  value={l.qty}
                  onChange={(e) => setQty(l.productId, Number(e.target.value))}
                />
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t pt-4">
          <div className="text-sm font-medium">Total</div>
          <div className="text-sm font-semibold">₱ {total.toFixed(2)}</div>
        </div>

        <button
          className="mt-4 w-full rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          type="button"
          disabled={cart.length === 0}
          onClick={() => alert('Checkout not implemented yet (will write sales + deduct stocks).')}
        >
          Checkout
        </button>
      </aside>
    </div>
  )
}
