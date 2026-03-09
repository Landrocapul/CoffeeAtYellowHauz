import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../packages/db/src'

type FsnClass = 'FAST' | 'SLOW' | 'NON'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const days = req.query.days ? Number(req.query.days) : 30
  const since = new Date()
  since.setDate(since.getDate() - days)

  const lines = await prisma.saleLine.findMany({
    where: {
      sale: { paidAt: { gte: since } },
    },
    select: {
      productId: true,
      qty: true,
      product: { select: { name: true, category: true, price: true } },
    },
  })

  const qtyByProduct = new Map<string, number>()
  for (const l of lines) qtyByProduct.set(l.productId, (qtyByProduct.get(l.productId) ?? 0) + l.qty)

  const allProducts = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true, category: true, price: true },
    orderBy: { name: 'asc' },
  })

  const items = allProducts.map((p) => {
    const qty = qtyByProduct.get(p.id) ?? 0
    return { ...p, qty }
  })

  const sorted = [...items].sort((a, b) => b.qty - a.qty)
  const n = sorted.length

  const fastCut = Math.ceil(n * 0.2)
  const slowCut = Math.ceil(n * 0.5)

  const classified = sorted.map((it, idx) => {
    let cls: FsnClass
    if (it.qty === 0) cls = 'NON'
    else if (idx < fastCut) cls = 'FAST'
    else if (idx < slowCut) cls = 'SLOW'
    else cls = 'NON'

    return { ...it, fsn: cls }
  })

  return res.status(200).json({
    since,
    days,
    items: classified,
  })
}
