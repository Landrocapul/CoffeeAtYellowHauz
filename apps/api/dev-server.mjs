import http from 'node:http'
import url from 'node:url'

// Import the API handlers (now that dependencies are installed)
import handleProducts from './products.ts'
import handleSales from './sales.ts'

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
})
