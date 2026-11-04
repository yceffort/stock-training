import { createBrowserRouter } from 'react-router-dom'
import { Layout } from './components/Layout'
import { OrdersPage } from './pages/OrdersPage'
import { PortfolioPage } from './pages/PortfolioPage'
import { StockDetailPage } from './pages/StockDetailPage'
import { StockListPage } from './pages/StockListPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <StockListPage /> },
      { path: 'stocks/:symbol', element: <StockDetailPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'portfolio', element: <PortfolioPage /> },
    ],
  },
])
