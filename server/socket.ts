import type { IncomingMessage } from 'node:http'
import type { Duplex } from 'node:stream'
import { WebSocketServer } from 'ws'
import { now } from './clock'
import { type Client, state } from './state'

function send(client: Client, message: object) {
  if (client.socket.readyState === client.socket.OPEN) client.socket.send(JSON.stringify(message))
}

export function broadcast(message: object) {
  for (const client of state.clients) send(client, message)
}

export function sendToSubscribers(symbol: string, message: object) {
  for (const client of state.clients) {
    if (client.symbols.has(symbol)) send(client, message)
  }
}

export function closeAllClients() {
  for (const client of state.clients) client.socket.terminate()
  state.clients.clear()
}

export function socketStats() {
  const clients = [...state.clients]
  return {
    connections: clients.length,
    subscriptions: clients.map((client) => client.symbols.size),
    subscribeMessages: state.stats.subscribeMessages,
    unsubscribeMessages: state.stats.unsubscribeMessages,
  }
}

export function startHeartbeat() {
  state.heartbeat ??= setInterval(() => broadcast({ type: 'heartbeat', ts: new Date(now()).toISOString() }), 15_000)
}

export function createSocketServer() {
  const server = new WebSocketServer({ noServer: true })

  server.on('connection', (socket) => {
    const client: Client = { socket, symbols: new Set() }
    state.clients.add(client)
    socket.on('close', () => state.clients.delete(client))
    socket.on('message', (data) => {
      let message: { type?: unknown; symbols?: unknown }
      try {
        message = JSON.parse(String(data))
      } catch {
        return
      }
      if (!Array.isArray(message.symbols)) return
      const symbols = message.symbols.filter((symbol): symbol is string => typeof symbol === 'string' && state.stocks.has(symbol))
      if (message.type === 'subscribe') {
        state.stats.subscribeMessages++
        for (const symbol of symbols) client.symbols.add(symbol)
      } else if (message.type === 'unsubscribe') {
        state.stats.unsubscribeMessages++
        for (const symbol of symbols) client.symbols.delete(symbol)
      }
    })
  })

  return (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (new URL(request.url ?? '/', 'http://localhost').pathname !== '/ws') return
    server.handleUpgrade(request, socket, head, (ws) => server.emit('connection', ws, request))
  }
}
