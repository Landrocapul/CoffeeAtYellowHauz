import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../packages/db/src'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const days = req.query.days ? Number(req.query.days) : 7
  const since = new Date()
  since.setDate(since.getDate() - days)

  const sales = await prisma.sale.findMany({
    where: { paidAt: { gte: since } },
    select: { paidAt: true, total: true },
  })

  const byHour = new Map<number, { hour: number; count: number; total: number }>()
  for (let h = 0; h < 24; h++) byHour.set(h, { hour: h, count: 0, total: 0 })

  for (const s of sales) {
    if (!s.paidAt) continue
    const hour = s.paidAt.getHours()
    const cur = byHour.get(hour)!
    cur.count += 1
    cur.total += Number(s.total)
  }

  return res.status(200).json({
    since,
    byHour: Array.from(byHour.values()),
  })
}
