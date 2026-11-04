import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { placeOrder } from '../lib/api'
import { formatPrice } from '../lib/format'
import type { Quote, Stock } from '../lib/types'
import { useMarketStore } from '../store/market'
import { PriceChange } from './PriceChange'

interface Props {
  stock: Stock
  quote: Quote
}

export function StockRow({ stock, quote }: Props) {
  const queryClient = useQueryClient()
  const { watchlist, addToWatchlist, removeFromWatchlist, setSelectedSymbol } = useMarketStore()
  const [quantity, setQuantity] = useState('')
  const watched = watchlist.includes(stock.symbol)

  const buy = useMutation({
    mutationFn: placeOrder,
    onSuccess: () => {
      setQuantity('')
      queryClient.invalidateQueries({ queryKey: ['account'] })
    },
  })

  return (
    <tr>
      <td>
        <Link to={`/stocks/${stock.symbol}`} onClick={() => setSelectedSymbol(stock.symbol)}>
          {stock.name}
        </Link>
      </td>
      <td className="number" data-testid="price">
        {formatPrice(quote.price)}
      </td>
      <td className="number">
        <PriceChange price={quote.price} prevClose={stock.prevClose} changeRate={quote.changeRate} />
      </td>
      <td>
        <button
          type="button"
          className="watch"
          aria-label={`${stock.name} 관심종목`}
          aria-pressed={watched}
          onClick={() => (watched ? removeFromWatchlist(stock.symbol) : addToWatchlist(stock.symbol))}
        >
          {watched ? '★' : '☆'}
        </button>
      </td>
      <td className="quick-buy">
        <input
          type="number"
          min={1}
          aria-label={`${stock.name} 수량`}
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
        />
        <button
          type="button"
          aria-label={`${stock.name} 시장가 매수`}
          disabled={buy.isPending}
          onClick={() => buy.mutateAsync({ symbol: stock.symbol, side: 'buy', type: 'market', quantity: Number(quantity) })}
        >
          시장가 매수
        </button>
      </td>
    </tr>
  )
}
