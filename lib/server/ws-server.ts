import { WebSocketServer, type WebSocket } from 'ws'
import type { IncomingMessage, Server } from 'node:http'
import { joinRoom, handleMessage, leaveRoom } from './room-hub'

export function attachWebSocketServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true })

  httpServer.on('upgrade', (req: IncomingMessage, socket, head) => {
    const url = req.url ?? ''
    const match = url.match(/^\/api\/rooms\/([^/]+)\/socket$/)
    if (!match) { socket.destroy(); return }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req, match[1]))
  })

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage, roomId: string) => {
    joinRoom(roomId, ws)
    let clientId: number | undefined

    ws.on('message', (data: Buffer) => handleMessage(roomId, ws, data))
    ws.on('close', () => leaveRoom(roomId, ws, clientId))
    ws.on('error', () => ws.close())
  })

  return wss
}
