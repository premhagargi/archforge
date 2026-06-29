import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import type { WebSocket } from 'ws'

const MESSAGE_SYNC = 0
const MESSAGE_AWARENESS = 1

interface Room {
  doc: Y.Doc
  awareness: awarenessProtocol.Awareness
  clients: Set<WebSocket>
}

const rooms = new Map<string, Room>()

function getOrCreate(roomId: string): Room {
  if (!rooms.has(roomId)) {
    const doc = new Y.Doc()
    const awareness = new awarenessProtocol.Awareness(doc)
    const room: Room = { doc, awareness, clients: new Set() }
    rooms.set(roomId, room)

    doc.on('update', (update: Uint8Array, origin: unknown) => {
      const enc = encoding.createEncoder()
      encoding.writeVarUint(enc, MESSAGE_SYNC)
      syncProtocol.writeUpdate(enc, update)
      const msg = encoding.toUint8Array(enc)
      room.clients.forEach(c => { if (c !== origin && c.readyState === 1) c.send(msg) })
    })

    awareness.on('update', ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
      const changed = [...added, ...updated, ...removed]
      const enc = encoding.createEncoder()
      encoding.writeVarUint(enc, MESSAGE_AWARENESS)
      encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(awareness, changed))
      const msg = encoding.toUint8Array(enc)
      room.clients.forEach(c => { if (c !== origin && c.readyState === 1) c.send(msg) })
    })
  }
  return rooms.get(roomId)!
}

export function joinRoom(roomId: string, ws: WebSocket): void {
  const room = getOrCreate(roomId)
  room.clients.add(ws)

  // Send sync step 1 (full state vector)
  const enc = encoding.createEncoder()
  encoding.writeVarUint(enc, MESSAGE_SYNC)
  syncProtocol.writeSyncStep1(enc, room.doc)
  ws.send(encoding.toUint8Array(enc))

  // Send awareness
  if (room.awareness.states.size > 0) {
    const aEnc = encoding.createEncoder()
    encoding.writeVarUint(aEnc, MESSAGE_AWARENESS)
    encoding.writeVarUint8Array(aEnc, awarenessProtocol.encodeAwarenessUpdate(room.awareness, Array.from(room.awareness.states.keys())))
    ws.send(encoding.toUint8Array(aEnc))
  }
}

export function handleMessage(roomId: string, ws: WebSocket, data: Buffer): void {
  const room = rooms.get(roomId)
  if (!room) return
  const decoder = decoding.createDecoder(new Uint8Array(data))
  const msgType = decoding.readVarUint(decoder)
  if (msgType === MESSAGE_SYNC) {
    const enc = encoding.createEncoder()
    encoding.writeVarUint(enc, MESSAGE_SYNC)
    syncProtocol.readSyncMessage(decoder, enc, room.doc, ws)
    if (encoding.length(enc) > 1) ws.send(encoding.toUint8Array(enc))
  } else if (msgType === MESSAGE_AWARENESS) {
    const update = decoding.readVarUint8Array(decoder)
    awarenessProtocol.applyAwarenessUpdate(room.awareness, update, ws)
  }
}

export function leaveRoom(roomId: string, ws: WebSocket, clientId?: number): void {
  const room = rooms.get(roomId)
  if (!room) return
  room.clients.delete(ws)
  if (clientId != null) awarenessProtocol.removeAwarenessStates(room.awareness, [clientId], null)
  if (room.clients.size === 0) {
    room.doc.destroy()
    rooms.delete(roomId)
  }
}
