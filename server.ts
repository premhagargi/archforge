import { createServer } from 'node:http'
import { parse } from 'node:url'
import next from 'next'
import { attachWebSocketServer } from './lib/server/ws-server'

const dev = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT ?? '3000', 10)
const hostname = process.env.HOSTNAME ?? 'localhost'

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error handling request', err)
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  })

  attachWebSocketServer(httpServer)

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> WebSocket ready on ws://${hostname}:${port}/api/rooms/:id/socket`)
  })
})
