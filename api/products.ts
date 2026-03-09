import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../packages/db/src'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' },
      include: { inventory: true },
    })
    return res.status(200).json({ products })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
