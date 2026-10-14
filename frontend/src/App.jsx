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
import VerifyEmailPendingPage from './pages/VerifyEmailPendingPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import AdminRegister from './pages/AdminRegister.jsx'
import PaymentPage from './pages/PaymentPage.jsx'
import AlertsPage from './pages/AlertsPage.jsx'
import ProfitabilityPage from './pages/ProfitabilityPage.jsx'
import AnalyticsPage from './pages/AnalyticsPage.jsx'
import CustomerIntelligencePage from './pages/CustomerIntelligencePage.jsx'
import ForecastingPage from './pages/ForecastingPage.jsx'
import InventoryAnalyticsPage from './pages/InventoryAnalyticsPage.jsx'
import FinancialAnalyticsPage from './pages/FinancialAnalyticsPage.jsx'
import CampaignsPage from './pages/CampaignsPage.jsx'
import AdminStaffPage from './pages/AdminStaffPage.jsx'
import AdminCustomersPage from './pages/AdminCustomersPage.jsx'
import AdminSuppliersPage from './pages/AdminSuppliersPage.jsx'
import AdminPurchaseOrdersPage from './pages/AdminPurchaseOrdersPage.jsx'
import AdminReconciliationPage from './pages/AdminReconciliationPage.jsx'
import AdminTablesPage from './pages/AdminTablesPage.jsx'
import AdminMarketplacePage from './pages/AdminMarketplacePage.jsx'
import ReservationPage from './pages/ReservationPage.jsx'
import AdminReservationsPage from './pages/AdminReservationsPage.jsx'
import OrderFeedbackPage from './pages/OrderFeedbackPage.jsx'

function App() {
  const isAuthenticated = !!(localStorage.getItem('jwt') || localStorage.getItem('adminToken'))
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/order" element={<PublicOrderPage />} />
      <Route path="/reserve" element={<ReservationPage />} />
      <Route path="/track" element={<TrackOrderPage />} />
      <Route path="/payment/:orderCode" element={<PaymentPage />} />
      <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
      <Route path="/feedback/:orderCode" element={<OrderFeedbackPage />} />

      {/* Admin routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/register" element={<AdminRegister />} />
      <Route path="/verify-email-pending" element={<VerifyEmailPendingPage />} />
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
        <Route path="alerts" element={<AlertsPage />} />

        {/* Phase 1 Admin */}
        <Route path="staff" element={<AdminStaffPage />} />
        <Route path="customers" element={<AdminCustomersPage />} />
        <Route path="suppliers" element={<AdminSuppliersPage />} />
        <Route path="purchase-orders" element={<AdminPurchaseOrdersPage />} />
        <Route path="reconciliation" element={<AdminReconciliationPage />} />
        <Route path="tables" element={<AdminTablesPage />} />
        <Route path="reservations" element={<AdminReservationsPage />} />
        <Route path="marketplace" element={<AdminMarketplacePage />} />

        {/* Business Intelligence */}
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="analytics/profitability" element={<ProfitabilityPage />} />
        <Route path="analytics/customers" element={<CustomerIntelligencePage />} />
        <Route path="analytics/forecasting" element={<ForecastingPage />} />
        <Route path="analytics/inventory" element={<InventoryAnalyticsPage />} />
        <Route path="analytics/financial" element={<FinancialAnalyticsPage />} />
        <Route path="analytics/campaigns" element={<CampaignsPage />} />
      </Route>

      {/* Catch-all redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
