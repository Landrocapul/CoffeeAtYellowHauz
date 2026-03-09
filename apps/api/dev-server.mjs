import http from 'node:http'
import url from 'node:url'

const port = process.env.PORT ? Number(process.env.PORT) : 8787

function json(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(data))
}

function createMockReqRes(nodeReq, nodeRes) {
  // Create mock Vercel-style request/response objects
  const req = {
    method: nodeReq.method,
    url: nodeReq.url,
    headers: nodeReq.headers,
    body: null,
    query: url.parse(nodeReq.url ?? '/', true).query,
  }

  // For POST/PUT requests, read the body
  if (['POST', 'PUT', 'DELETE'].includes(nodeReq.method || '')) {
    let body = ''
    nodeReq.on('data', chunk => {
      body += chunk.toString()
    })
    nodeReq.on('end', async () => {
      try {
        req.body = body ? JSON.parse(body) : null
      } catch (e) {
        req.body = body
      }

      const res = {
        status: (code) => ({ json: (data) => json(nodeRes, code, data) }),
        setHeader: nodeRes.setHeader.bind(nodeRes),
        json: (data) => json(nodeRes, 200, data)
      }

      await routeHandler(req, res)
    })
    return
  }

  const res = {
    status: (code) => ({ json: (data) => json(nodeRes, code, data) }),
    setHeader: nodeRes.setHeader.bind(nodeRes),
    json: (data) => json(nodeRes, 200, data)
  }

  routeHandler(req, res)
}

// Mock data for testing
let mockProducts = [
  {
    id: '1',
    name: 'Espresso',
    price: 3.50,
    sku: 'ESP-001',
    category: 'Hot Drinks',
    isActive: true,
    inventory: { onHandQty: 25, lowStockLevel: 5 }
  },
  {
    id: '2',
    name: 'Cappuccino',
    price: 4.25,
    sku: 'CAP-001',
    category: 'Hot Drinks',
    isActive: true,
    inventory: { onHandQty: 18, lowStockLevel: 5 }
  },
  {
    id: '3',
    name: 'Croissant',
    price: 2.75,
    sku: 'CRO-001',
    category: 'Pastries',
    isActive: true,
    inventory: { onHandQty: 12, lowStockLevel: 5 }
  }
]

async function handleProducts(req, res) {
  try {
    if (req.method === 'GET') {
      // Return mock products
      res.status(200).json(mockProducts)
    }
    else if (req.method === 'POST') {
      // Create new product (mock)
      const { name, price, sku, category, stockLevel } = req.body

      if (!name || !price) {
        return res.status(400).json({ error: 'Name and price are required' })
      }

      const newProduct = {
        id: Date.now().toString(),
        name,
        price: parseFloat(price),
        sku: sku || null,
        category: category || null,
        isActive: true,
        inventory: { onHandQty: parseInt(stockLevel) || 0, lowStockLevel: 5 }
      }

      mockProducts.push(newProduct)
      res.status(201).json(newProduct)
    }
    else if (req.method === 'PUT') {
      // Update product (mock)
      const { id, name, price, sku, category, stockLevel } = req.body

      if (!id || !name || !price) {
        return res.status(400).json({ error: 'ID, name and price are required' })
      }

      const index = mockProducts.findIndex(p => p.id === id)
      if (index === -1) {
        return res.status(404).json({ error: 'Product not found' })
      }

      mockProducts[index] = {
        ...mockProducts[index],
        name,
        price: parseFloat(price),
        sku: sku || null,
        category: category || null,
        inventory: {
          ...mockProducts[index].inventory,
          onHandQty: stockLevel !== undefined ? parseInt(stockLevel) : mockProducts[index].inventory.onHandQty
        }
      }

      res.status(200).json(mockProducts[index])
    }
    else if (req.method === 'DELETE') {
      // Deactivate product (mock)
      const { id } = req.body

      if (!id) {
        return res.status(400).json({ error: 'Product ID is required' })
      }

      const index = mockProducts.findIndex(p => p.id === id)
      if (index === -1) {
        return res.status(404).json({ error: 'Product not found' })
      }

      mockProducts[index].isActive = false
      res.status(200).json({ message: 'Product deactivated' })
    }
    else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
      res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Products API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleSales(req, res) {
  try {
    if (req.method === 'POST') {
      // Process sale (mock)
      const { lines, cash } = req.body

      if (!lines || !Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({ error: 'Sale lines are required' })
      }

      if (!cash || isNaN(parseFloat(cash))) {
        return res.status(400).json({ error: 'Valid cash amount is required' })
      }

      const cashAmount = parseFloat(cash)
      let subtotal = 0
      const saleLines = []

      // Process each line item (mock - no actual inventory deduction)
      for (const line of lines) {
        const product = mockProducts.find(p => p.id === line.productId)
        if (!product || !product.isActive) {
          return res.status(400).json({ error: `Product ${line.productId} not found or inactive` })
        }

        const lineTotal = product.price * line.qty
        subtotal += lineTotal

        saleLines.push({
          productId: product.id,
          name: product.name,
          qty: line.qty,
          price: product.price
        })
      }

      // Calculate totals
      const total = subtotal
      const change = cashAmount - total

      if (change < 0) {
        return res.status(400).json({ error: 'Insufficient cash provided' })
      }

      const sale = {
        id: Date.now().toString(),
        subtotal,
        total,
        cash: cashAmount,
        change,
        lines: saleLines
      }

      res.status(201).json(sale)
    }
    else {
      res.setHeader('Allow', ['POST'])
      res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Sales API error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
}

async function routeHandler(req, res) {
  const pathname = url.parse(req.url ?? '/', true).pathname

  try {
    if (pathname === '/api/health') {
      return json(res, 200, { ok: true })
    }

    if (pathname === '/api/products') {
      return await handleProducts(req, res)
    }

    if (pathname === '/api/sales') {
      return await handleSales(req, res)
    }

    // Handle other API routes here as needed
    if (pathname?.startsWith('/api/')) {
      return json(res, 404, { error: 'API endpoint not implemented' })
    }

    json(res, 404, { error: 'Not found' })
  } catch (error) {
    console.error('API Error:', error)
    json(res, 500, { error: 'Internal server error' })
  }
}

const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  createMockReqRes(req, res)
})

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API dev server running on http://localhost:${port}`)
  console.log(`Using mock data - database connection issues pending`)
})
