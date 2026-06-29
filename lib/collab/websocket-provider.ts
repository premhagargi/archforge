import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'

const MESSAGE_SYNC = 0
const MESSAGE_AWARENESS = 1

export interface WebSocketProviderOptions {
  roomId: string
  doc: Y.Doc
  awareness: awarenessProtocol.Awareness
  url: string     // ws:// or wss://
  onSynced?: () => void
  onStatus?: (status: 'connected' | 'disconnected' | 'synced') => void
}

export function createWebSocketProvider(opts: WebSocketProviderOptions) {
  let ws: WebSocket | null = null
  let destroyed = false
  let synced = false
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  let reconnectDelay = 1000

  function send(data: Uint8Array) {
    if (ws?.readyState === WebSocket.OPEN) ws.send(data)
  }

  function sendSyncStep1() {
    const enc = encoding.createEncoder()
    encoding.writeVarUint(enc, MESSAGE_SYNC)
    syncProtocol.writeSyncStep1(enc, opts.doc)
    send(encoding.toUint8Array(enc))
  }

  function sendAwarenessUpdate() {
    const enc = encoding.createEncoder()
    encoding.writeVarUint(enc, MESSAGE_AWARENESS)
    encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(opts.awareness, [opts.doc.clientID]))
    send(encoding.toUint8Array(enc))
  }

  function connect() {
    if (destroyed) return
    ws = new WebSocket(opts.url)
    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      reconnectDelay = 1000
      opts.onStatus?.('connected')
      sendSyncStep1()
      sendAwarenessUpdate()
    }

    ws.onmessage = (ev) => {
      const decoder = decoding.createDecoder(new Uint8Array(ev.data as ArrayBuffer))
      const msgType = decoding.readVarUint(decoder)
      if (msgType === MESSAGE_SYNC) {
        const enc = encoding.createEncoder()
        encoding.writeVarUint(enc, MESSAGE_SYNC)
        const syncMsgType = syncProtocol.readSyncMessage(decoder, enc, opts.doc, null)
        if (encoding.length(enc) > 1) send(encoding.toUint8Array(enc))
        if (!synced && syncMsgType === syncProtocol.messageYjsSyncStep2) {
          synced = true
          opts.onSynced?.()
          opts.onStatus?.('synced')
        }
      } else if (msgType === MESSAGE_AWARENESS) {
        awarenessProtocol.applyAwarenessUpdate(opts.awareness, decoding.readVarUint8Array(decoder), null)
      }
    }

    ws.onclose = () => {
      synced = false
      opts.onStatus?.('disconnected')
      if (!destroyed) {
        reconnectTimeout = setTimeout(connect, reconnectDelay)
        reconnectDelay = Math.min(reconnectDelay * 2, 30000)
      }
    }

    ws.onerror = () => ws?.close()
  }

  const handleDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === 'local') return
    const enc = encoding.createEncoder()
    encoding.writeVarUint(enc, MESSAGE_SYNC)
    syncProtocol.writeUpdate(enc, update)
    send(encoding.toUint8Array(enc))
  }
  opts.doc.on('update', handleDocUpdate)

  const handleAwarenessUpdate = ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
    const changed = [...added, ...updated, ...removed]
    const enc = encoding.createEncoder()
    encoding.writeVarUint(enc, MESSAGE_AWARENESS)
    encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(opts.awareness, changed))
    send(encoding.toUint8Array(enc))
  }
  opts.awareness.on('update', handleAwarenessUpdate)

  connect()

  return {
    get synced() { return synced },
    destroy() {
      destroyed = true
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      opts.doc.off('update', handleDocUpdate)
      opts.awareness.off('update', handleAwarenessUpdate)
      awarenessProtocol.removeAwarenessStates(opts.awareness, [opts.doc.clientID], null)
      ws?.close()
    },
  }
}
