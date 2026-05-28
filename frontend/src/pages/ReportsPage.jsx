import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../api.js'

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const queryParams = {}
  if (dateFrom) queryParams.from = dateFrom
  if (dateTo) queryParams.to = dateTo

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['reports', 'sales', queryParams],
    queryFn: async () => { const res = await api.get('/reports/sales', { params: queryParams }); return res.data },
  })

  const { data: topMenusData, isLoading: topLoading } = useQuery({
    queryKey: ['reports', 'top-menus', queryParams],
    queryFn: async () => { const res = await api.get('/reports/top-menus', { params: queryParams }); return res.data },
  })

  const formatPrice = (price) => {
    if (price == null) return '-'
    return `Rp ${Number(price).toLocaleString('id-ID')}`
  }

  return (
    <div>
      <div className="page-header">
        <h2 style={{ margin: 0 }}>Reports</h2>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'end' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label>From Date</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>To Date</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      <div className="grid-2">
        {/* Sales Summary */}
        <div className="card" style={{ borderTop: '4px solid var(--red)' }}>
          <h3 style={{ color: 'var(--red)' }}>Sales Summary</h3>
          {salesLoading ? (
            <div style={{ padding: '1rem 0' }}><div className="spinner" /></div>
          ) : (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Total Orders</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--black)' }}>{salesData?.data?.totalOrders ?? '-'}</div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Total Revenue</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--red)' }}>{formatPrice(salesData?.data?.totalRevenue)}</div>
              </div>
              {salesData?.data?.averageOrderValue != null && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Average Order Value</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{formatPrice(salesData.data.averageOrderValue)}</div>
                </div>
              )}
              {salesData?.data?.period && (
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.5rem' }}>
                  Period: {salesData.data.period.from || 'N/A'} – {salesData.data.period.to || 'N/A'}
                </div>
              )}
            </>
          )}
        </div>

        {/* Top Menus */}
        <div className="card" style={{ borderTop: '4px solid var(--yellow)' }}>
          <h3 style={{ color: 'var(--yellow-dark)' }}>Top Menus</h3>
          {topLoading ? (
            <div style={{ padding: '1rem 0' }}><div className="spinner" /></div>
          ) : (
            <>
              {topMenusData?.data?.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Menu</th>
                      <th>Qty</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topMenusData.data.map((item, i) => (
                      <tr key={i}>
                        <td>{item.name || item._id}</td>
                        <td style={{ fontWeight: 'bold' }}>{item.totalQuantity ?? '-'}</td>
                        <td style={{ fontWeight: 'bold', color: 'var(--red)' }}>{formatPrice(item.totalRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: 'var(--gray-500)', padding: '1rem 0' }}>No data available.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}