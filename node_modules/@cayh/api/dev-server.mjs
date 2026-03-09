import http from 'node:http'
import url from 'node:url'

const port = process.env.PORT ? Number(process.env.PORT) : 8787

function json(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(data))
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url ?? '/', true)
  if (parsed.pathname === '/api/health') return json(res, 200, { ok: true })

  json(res, 404, { error: 'Not found' })
})

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API dev server running on http://localhost:${port}`)
})
