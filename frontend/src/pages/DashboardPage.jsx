import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../api.js'

export default function DashboardPage() {
  const [period, setPeriod] = useState('daily')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const queryParams = { period }
  if (startDate) queryParams.startDate = startDate
  if (endDate) queryParams.endDate = endDate

  // Dashboard summary (orders today, low stock, active kitchen, recent orders)
  const { data: dashData, isLoading: dashLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await api.get('/dashboard/summary')
      return res.data?.data
    },
    refetchInterval: 30000, // refresh every 30 seconds
  })

  // Finance summary
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['finance-summary', period, startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/finance/summary', { params: queryParams })
      return res.data
    },
  })

  const summary = summaryData?.data
  const formatPrice = (price) => price != null ? `Rp ${Number(price).toLocaleString('id-ID')}` : '-'

  const handleToday = () => {
    const today = new Date().toISOString().split('T')[0]
    setStartDate(today)
    setEndDate(today)
  }

  const handleThisMonth = () => {
    const now = new Date()
    const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const last = now.toISOString().split('T')[0]
    setStartDate(first)
    setEndDate(last)
  }

  const handleThisYear = () => {
    const now = new Date()
    const first = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
    const last = now.toISOString().split('T')[0]
    setStartDate(first)
    setEndDate(last)
  }

  const clearFilter = () => {
    setStartDate('')
    setEndDate('')
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f57c00',
      confirmed: '#1976d2',
      completed: '#43a047',
      cancelled: '#e53935',
    }
    return colors[status] || 'var(--gray-500)'
  }

  const getKitchenLabel = (status) => {
    const labels = {
      none: '-',
      queued: 'Antri',
      preparing: 'Masak',
      ready: 'Siap',
      served: 'Tersaji',
    }
    return labels[status] || status
  }

  return (
    <div>
      <div className="page-header">
        <h2 style={{ margin: 0 }}>📊 Admin Dashboard</h2>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--gray-500)', fontSize: '0.85rem' }}>
          Selamat datang di panel admin Nasi Goreng Polonia
        </p>
      </div>

      {/* === Row 1: Order Stats Cards === */}
      {dashLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" /></div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ textAlign: 'center', borderTop: '4px solid #1976d2' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Orders Hari Ini</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1976d2' }}>{dashData?.orderStats?.total || 0}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>total order</div>
            </div>
            <div className="card" style={{ textAlign: 'center', borderTop: '4px solid #f57c00' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Pending</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f57c00' }}>{dashData?.orderStats?.pending || 0}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>menunggu konfirmasi</div>
            </div>
            <div className="card" style={{ textAlign: 'center', borderTop: '4px solid #43a047' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Completed</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#43a047' }}>{dashData?.orderStats?.completed || 0}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>selesai hari ini</div>
            </div>
            <div className="card" style={{ textAlign: 'center', borderTop: '4px solid #e53935' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Cancelled</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e53935' }}>{dashData?.orderStats?.cancelled || 0}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>dibatalkan</div>
            </div>
            <div className="card" style={{ textAlign: 'center', borderTop: '4px solid var(--yellow)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Revenue Hari Ini</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--yellow)' }}>{formatPrice(dashData?.orderStats?.totalRevenue)}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>dari completed</div>
            </div>
            <div className="card" style={{ textAlign: 'center', borderTop: '4px solid #ff6d00' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>🍳 Active Kitchen</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff6d00' }}>{dashData?.activeKitchen || 0}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>sedang dimasak</div>
            </div>
          </div>

          {/* === Row 2: Low Stock & Recent Orders === */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Low Stock Alerts */}
            <div className="card">
              <h3 style={{ color: 'var(--black)', marginBottom: '0.75rem', fontSize: '1rem' }}>
                ⚠️ Stok Menipis
              </h3>
              {dashData?.lowStock?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {dashData.lowStock.map((item) => (
                    <div key={item._id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.5rem', background: '#fff3e0', borderRadius: '4px', fontSize: '0.85rem'
                    }}>
                      <span style={{ fontWeight: 600 }}>{item.name}</span>
                      <span style={{ color: '#e65100' }}>
                        {item.currentStock} / {item.minimumStock} {item.unit}
                      </span>
                    </div>
                  ))}
                  <Link to="/admin/ingredients" style={{ fontSize: '0.8rem', color: 'var(--red)', marginTop: '0.25rem' }}>
                    Kelola Stok →
                  </Link>
                </div>
              ) : (
                <p style={{ color: '#43a047', fontSize: '0.85rem' }}>✅ Semua stok aman</p>
              )}
            </div>

            {/* Recent Orders */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ color: 'var(--black)', margin: 0, fontSize: '1rem' }}>🕐 Order Terbaru</h3>
                <Link to="/admin/orders" className="btn btn-sm btn-gray">Lihat Semua</Link>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Order Code</th>
                      <th>Customer</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Kitchen</th>
                      <th>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashData?.recentOrders?.length > 0 ? (
                      dashData.recentOrders.map((order) => (
                        <tr key={order._id} style={{ cursor: 'pointer' }} onClick={() => window.location.href = `/admin/orders/${order._id}`}>
                          <td><strong>{order.orderCode}</strong></td>
                          <td>{order.customerName || '-'}</td>
                          <td style={{ fontWeight: 600 }}>{formatPrice(order.totalAmount)}</td>
                          <td>
                            <span style={{
                              display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
                              fontSize: '0.75rem', fontWeight: 600, color: '#fff',
                              background: getStatusColor(order.status)
                            }}>
                              {order.status}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>{getKitchenLabel(order.kitchenStatus)}</td>
                          <td style={{ fontSize: '0.8rem', color: order.paymentStatus === 'paid' ? '#43a047' : '#f57c00' }}>
                            {order.paymentStatus}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--gray-500)' }}>Belum ada order</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* === Row 3: Finance Summary === */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ color: 'var(--black)', marginBottom: '0.75rem', fontSize: '1rem' }}>💰 Ringkasan Keuangan</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'end', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>Period</label>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              <button className={`btn btn-sm ${period === 'daily' ? 'btn-red' : 'btn-gray'}`} onClick={() => setPeriod('daily')}>Daily</button>
              <button className={`btn btn-sm ${period === 'monthly' ? 'btn-red' : 'btn-gray'}`} onClick={() => setPeriod('monthly')}>Monthly</button>
              <button className={`btn btn-sm ${period === 'yearly' ? 'btn-red' : 'btn-gray'}`} onClick={() => setPeriod('yearly')}>Yearly</button>
            </div>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>From</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>To</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'end' }}>
            <button className="btn btn-gray btn-sm" onClick={handleToday}>Today</button>
            <button className="btn btn-gray btn-sm" onClick={handleThisMonth}>This Month</button>
            <button className="btn btn-gray btn-sm" onClick={handleThisYear}>This Year</button>
            <button className="btn btn-gray btn-sm" onClick={clearFilter}>Clear</button>
          </div>
        </div>

        {summaryLoading ? (
          <div style={{ textAlign: 'center', padding: '1rem' }}><div className="spinner" /></div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ textAlign: 'center', padding: '0.75rem', background: '#e8f5e9', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Total Income</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#43a047' }}>{formatPrice(summary?.grandTotal?.totalIncome)}</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.75rem', background: '#ffebee', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Total Expense</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--red)' }}>{formatPrice(summary?.grandTotal?.totalExpense)}</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.75rem', background: '#fff3e0', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Net Profit</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: (summary?.grandTotal?.netProfit || 0) >= 0 ? '#43a047' : 'var(--red)' }}>
                  {formatPrice(summary?.grandTotal?.netProfit)}
                </div>
              </div>
            </div>

            {summary?.periods?.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Income</th>
                      <th>Expense</th>
                      <th>Net Profit</th>
                      <th>Transactions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.periods.map((p) => (
                      <tr key={p.period}>
                        <td><strong>{p.period}</strong></td>
                        <td style={{ color: '#43a047', fontWeight: 'bold' }}>{formatPrice(p.totalIncome)}</td>
                        <td style={{ color: 'var(--red)', fontWeight: 'bold' }}>{formatPrice(p.totalExpense)}</td>
                        <td style={{ fontWeight: 'bold', color: p.netProfit >= 0 ? '#43a047' : 'var(--red)' }}>
                          {formatPrice(p.netProfit)}
                        </td>
                        <td>{p.incomeCount + p.expenseCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 style={{ color: 'var(--black)', marginBottom: '0.75rem', fontSize: '1rem' }}>⚡ Quick Actions</h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/admin/orders/new" className="btn btn-red">+ Buat Order Baru</Link>
          <Link to="/admin/kitchen" className="btn btn-yellow">🍳 Lihat Dapur</Link>
          <Link to="/admin/finance" className="btn btn-gray">💰 Kelola Keuangan</Link>
          <Link to="/admin/reports" className="btn btn-gray">📊 Laporan</Link>
        </div>
      </div>
    </div>
  )
}