import { PopularStocks } from './PopularStocks'

export function StockNotFound() {
  return (
    <div className="detail">
      <article>
        <p className="empty">종목을 찾을 수 없습니다.</p>
      </article>
      <aside>
        <PopularStocks />
      </aside>
    </div>
  )
}
