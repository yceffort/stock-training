import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Quote } from '../lib/types'

export type ConnectionStatus = 'connecting' | 'open' | 'closed'

interface MarketState {
  prices: Record<string, Quote>
  watchlist: string[]
  connectionStatus: ConnectionStatus
  selectedSymbol: string | null
  setPrice: (symbol: string, quote: Quote) => void
  setConnectionStatus: (status: ConnectionStatus) => void
  addToWatchlist: (symbol: string) => void
  removeFromWatchlist: (symbol: string) => void
  setSelectedSymbol: (symbol: string | null) => void
}

export const useMarketStore = create<MarketState>()(
  persist(
    (set, get) => ({
      prices: {},
      watchlist: [],
      connectionStatus: 'connecting',
      selectedSymbol: null,
      setPrice: (symbol, quote) => set((state) => ({ prices: { ...state.prices, [symbol]: quote } })),
      setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
      addToWatchlist: (symbol) => {
        const { watchlist } = get()
        watchlist.push(symbol)
        set({ watchlist })
      },
      removeFromWatchlist: (symbol) => {
        const { watchlist } = get()
        watchlist.splice(watchlist.indexOf(symbol), 1)
        set({ watchlist })
      },
      setSelectedSymbol: (selectedSymbol) => set({ selectedSymbol }),
    }),
    { name: 'market' },
  ),
)
