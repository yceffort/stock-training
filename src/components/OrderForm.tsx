import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { placeOrder } from '../lib/api'
import { formatPrice } from '../lib/format'
import { nextPrice, prevPrice } from '../lib/market'
import type { OrderSide, OrderType } from '../lib/types'

interface Props {
  symbol: string
  currentPrice: number
  marketOpen: boolean
}

function validate(type: OrderType, price: number, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1) return '수량을 1주 이상 입력해 주세요.'
  if (type === 'limit') {
    if (!price || price < 0) return '가격을 입력해 주세요.'
    if (price % 100 !== 0) return '호가 단위에 맞지 않는 가격입니다.'
  }
  return null
}

export function OrderForm({ symbol, currentPrice, marketOpen }: Props) {
  const queryClient = useQueryClient()
  const [side, setSide] = useState<OrderSide>('buy')
  const [type, setType] = useState<OrderType>('limit')
  const [price, setPrice] = useState(currentPrice)
  const [quantity, setQuantity] = useState(1)
  const [amount, setAmount] = useState(currentPrice)
  const [error, setError] = useState<string | null>(null)

  const order = useMutation({
    mutationFn: placeOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
    },
    onError: (error) => setError(error.message),
  })

  const changePrice = (next: number) => {
    setPrice(next)
    setAmount(next * quantity)
  }

  const changeQuantity = (next: number) => {
    setQuantity(next)
    setAmount((type === 'market' ? currentPrice : price) * next)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const message = validate(type, price, quantity)
    setError(message)
    order.reset()
    if (!message) order.mutate({ symbol, side, type, price: type === 'limit' ? price : undefined, quantity })
  }

  return (
    <form aria-label="주문" className="order-form" onSubmit={handleSubmit}>
      <fieldset>
        <legend>매매 구분</legend>
        <label>
          <input type="radio" name="side" checked={side === 'buy'} onChange={() => setSide('buy')} /> 매수
        </label>
        <label>
          <input type="radio" name="side" checked={side === 'sell'} onChange={() => setSide('sell')} /> 매도
        </label>
      </fieldset>
      <fieldset>
        <legend>주문 유형</legend>
        <label>
          <input type="radio" name="type" checked={type === 'limit'} onChange={() => setType('limit')} /> 지정가
        </label>
        <label>
          <input type="radio" name="type" checked={type === 'market'} onChange={() => setType('market')} /> 시장가
        </label>
      </fieldset>
      <div className="field">
        <label htmlFor="order-price">가격</label>
        <div className="stepper">
          <button type="button" aria-label="호가 내리기" disabled={type === 'market'} onClick={() => changePrice(prevPrice(price))}>
            −
          </button>
          <input
            id="order-price"
            type="number"
            value={price || ''}
            disabled={type === 'market'}
            onChange={(event) => changePrice(Number(event.target.value))}
          />
          <button type="button" aria-label="호가 올리기" disabled={type === 'market'} onClick={() => changePrice(nextPrice(price))}>
            +
          </button>
        </div>
      </div>
      <div className="field">
        <label htmlFor="order-quantity">수량</label>
        <input id="order-quantity" type="number" min={1} value={quantity || ''} onChange={(event) => changeQuantity(Number(event.target.value))} />
      </div>
      <p className="amount">
        예상 금액 <strong data-testid="order-amount">{formatPrice(amount)}</strong>
      </p>
      {error && <p role="alert">{error}</p>}
      {order.isSuccess && <p role="status">주문이 접수되었습니다.</p>}
      <button type="submit" className={`submit ${side}`} disabled={!marketOpen || order.isPending}>
        {side === 'buy' ? '매수 주문' : '매도 주문'}
      </button>
    </form>
  )
}
