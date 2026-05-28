import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import OrdersDashboard from './pages/OrdersDashboard.jsx'
import KitchenQueue from './pages/KitchenQueue.jsx'
import IngredientsPage from './pages/IngredientsPage.jsx'
import MenusPage from './pages/MenusPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import StockMovementsPage from './pages/StockMovementsPage.jsx'
import FinancePage from './pages/FinancePage.jsx'
import AdminCreateOrder from './pages/AdminCreateOrder.jsx'
import OrderDetailPage from './pages/OrderDetailPage.jsx'
import HomePage from './pages/HomePage.jsx'
import PublicOrderPage from './pages/PublicOrderPage.jsx'
import TrackOrderPage from './pages/TrackOrderPage.jsx'
import VerifyEmailPage from './pages/VerifyEmailPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import AdminRegister from './pages/AdminRegister.jsx'

function App() {
  const isAuthenticated = !!localStorage.getItem('jwt')
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/order" element={<PublicOrderPage />} />
      <Route path="/track" element={<TrackOrderPage />} />
      <Route path="/verify-email/:token" element={<VerifyEmailPage />} />

      {/* Admin routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/register" element={<AdminRegister />} />
      <Route
        path="/admin/*"
        element={isAuthenticated ? <Layout /> : <Navigate to="/admin/login" replace />}
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="orders" element={<OrdersDashboard />} />
        <Route path="orders/new" element={<AdminCreateOrder />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="kitchen" element={<KitchenQueue />} />
        <Route path="ingredients" element={<IngredientsPage />} />
        <Route path="menus" element={<MenusPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="stock-movements" element={<StockMovementsPage />} />
        <Route path="finance" element={<FinancePage />} />
      </Route>

      {/* Catch-all redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
