import { useEffect, useRef } from 'react'
import type { Tick } from '../lib/types'
import { useMarketStore } from '../store/market'

const SOCKET_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`

export function useRealtimePrices(symbols: string[]) {
  const socketRef = useRef<WebSocket>(null)
  const { setPrice, setConnectionStatus } = useMarketStore()

  useEffect(() => {
    const socket = new WebSocket(SOCKET_URL)
    socket.addEventListener('open', () => setConnectionStatus('open'))
    socket.addEventListener('message', (event) => {
      const tick: Tick = JSON.parse(event.data)
      setPrice(tick.symbol, tick)
    })
    socketRef.current = socket
  }, [])

  useEffect(() => {
    const socket = socketRef.current
    if (!socket || symbols.length === 0) return
    const subscribe = () => socket.send(JSON.stringify({ type: 'subscribe', symbols }))
    if (socket.readyState === WebSocket.OPEN) subscribe()
    else socket.addEventListener('open', subscribe, { once: true })
  }, [symbols])

  return socketRef
}
