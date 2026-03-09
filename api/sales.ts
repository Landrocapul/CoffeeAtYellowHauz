import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../packages/db/src'

type CreateSaleBody = {
  lines: Array<{ productId: string; qty: number }>
  cash: number
  discount?: number
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = req.body as CreateSaleBody
  if (!body?.lines?.length) return res.status(400).json({ error: 'lines is required' })

  const discount = body.discount ?? 0

  const productIds = body.lines.map((l) => l.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    include: { inventory: true },
  })

  const byId = new Map(products.map((p) => [p.id, p]))

  for (const l of body.lines) {
    const p = byId.get(l.productId)
    if (!p) return res.status(400).json({ error: `Invalid productId: ${l.productId}` })
    if (!p.inventory) return res.status(400).json({ error: `No inventory record for product: ${p.name}` })
    if (l.qty <= 0) return res.status(400).json({ error: 'qty must be > 0' })
    if (p.inventory.onHandQty < l.qty)
      return res.status(400).json({ error: `Insufficient stock for ${p.name}` })
  }

  const subtotal = products.reduce((sum, p) => {
    const qty = body.lines.find((l) => l.productId === p.id)?.qty ?? 0
    return sum + Number(p.price) * qty
  }, 0)

  const total = Math.max(0, subtotal - discount)
  if (body.cash < total) return res.status(400).json({ error: 'Cash is less than total' })

  const sale = await prisma.$transaction(async (tx) => {
    const createdSale = await tx.sale.create({
      data: {
        subtotal,
        discount,
        total,
        cash: body.cash,
        change: body.cash - total,
        paidAt: new Date(),
        lines: {
          create: body.lines.map((l) => {
            const p = byId.get(l.productId)!
            return {
              productId: l.productId,
              qty: l.qty,
              unitPrice: p.price,
              lineTotal: (Number(p.price) * l.qty).toFixed(2) as any,
            }
          }),
        },
      },
      include: { lines: true },
    })

    for (const l of body.lines) {
      const p = byId.get(l.productId)!
      await tx.inventoryItem.update({
        where: { productId: l.productId },
        data: {
          onHandQty: { decrement: l.qty },
          movements: {
            create: {
              type: 'OUT',
              qty: l.qty,
              note: `Sale ${createdSale.id} - ${p.name}`,
            },
          },
        },
      })
    }

    return createdSale
  })

  return res.status(201).json({ sale })
}
