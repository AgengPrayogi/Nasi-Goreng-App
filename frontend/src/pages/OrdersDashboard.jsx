import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api.js'

export default function OrdersDashboard() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [paymentModal, setPaymentModal] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [error, setError] = useState('')

  const buildParams = () => {
    const params = {}
    if (statusFilter) params.status = statusFilter
    if (channelFilter) params.channel = channelFilter
    if (dateFrom) params.dateFrom = dateFrom
    if (dateTo) params.dateTo = dateTo
    if (filter) params.search = filter
    return params
  }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders', statusFilter, channelFilter, dateFrom, dateTo, filter],
    queryFn: async () => {
      const params = buildParams()
      const res = await api.get('/orders', { params })
      return res.data
    },
  })

  const confirmMutation = useMutation({
    mutationFn: (id) => api.patch(`/orders/${id}/confirm`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  })
  const cancelMutation = useMutation({
    mutationFn: (id) => api.patch(`/orders/${id}/cancel`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  })
  const paymentMutation = useMutation({
    mutationFn: ({ id, body }) => api.patch(`/orders/${id}/payment`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setPaymentModal(null)
      setPaymentMethod('cash')
    },
    onError: () => setError('Gagal update pembayaran'),
  })

  const orders = data?.data || []

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('id-ID')
  }

  const formatPrice = (price) => {
    if (!price) return '-'
    return `Rp ${Number(price).toLocaleString('id-ID')}`
  }

  const statusBadge = (status) => {
    const colors = {
      pending: 'badge-yellow',
      confirmed: 'badge-green',
      completed: 'badge-black',
      cancelled: 'badge-gray',
    }
    return <span className={`badge ${colors[status] || 'badge-gray'}`}>{status}</span>
  }

  const kitchenBadge = (status) => {
    const colors = { none: 'badge-gray', queued: 'badge-yellow', preparing: 'badge-green', ready: 'badge-red', served: 'badge-black' }
    return <span className={`badge ${colors[status] || 'badge-gray'}`}>{status || 'none'}</span>
  }

  const paymentBadge = (status) => {
    const colors = { unpaid: 'badge-yellow', paid: 'badge-green', refunded: 'badge-gray' }
    return <span className={`badge ${colors[status] || 'badge-gray'}`}>{status || 'unpaid'}</span>
  }

  const handlePay = (id) => {
    paymentMutation.mutate({ id, body: { paymentStatus: 'paid', paymentMethod } })
  }

  const clearFilters = () => {
    setFilter(''); setStatusFilter(''); setChannelFilter(''); setDateFrom(''); setDateTo('')
  }

  const pendingCount = orders.filter((o) => o.status === 'pending').length
  const unpaidCount = orders.filter((o) => o.paymentStatus === 'unpaid').length

  /* ── Page header ─────────────────────────── */
  return (
    <div>
      <div className="page-header" style={{ animation: 'fadeInDown 0.4s ease' }}>
        <div>
          <h2 style={{ margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📋 Orders Management
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
            {orders.length} order · {pendingCount} pending · {unpaidCount} unpaid
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <Link to="/admin/orders/new"><button className="btn btn-red btn-sm">+ New Order</button></Link>
          <button className="btn btn-sm btn-black" onClick={() => refetch()}>🔄</button>
        </div>
      </div>

      {/* ── Error banner ─────────────────────── */}
      {error && (
        <div className="card card-accent-red" style={{ marginBottom: '1.5rem', border: '2px solid var(--red)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: 'var(--red)', fontWeight: 'bold', margin: 0 }}>{error}</p>
            <button className="btn btn-sm btn-gray" onClick={() => setError('')}>✕</button>
          </div>
        </div>
      )}

      {/* ── Filters ──────────────────────────── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>Search</label>
            <input
              type="text"
              placeholder="Order code / customer name…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>Channel</label>
            <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}>
              <option value="">All</option>
              <option value="walk_in">Walk In</option>
              <option value="online">Online</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <button className="btn btn-sm btn-gray" onClick={clearFilters}>Clear</button>
        </div>
      </div>

      {/* ── Orders Table ──────────────────────── */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }} /></div>
      ) : orders.length > 0 ? (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Order Code</th>
                  <th>Customer</th>
                  <th>Channel</th>
                  <th>Items</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Kitchen</th>
                  <th style={{ textAlign: 'center' }}>Payment</th>
                  <th style={{ textAlign: 'center' }}>Created</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders
                  .filter((o) => !filter || o.orderCode?.toLowerCase().includes(filter.toLowerCase()) || o.customerName?.toLowerCase().includes(filter.toLowerCase()))
                  .map((order) => (
                    <tr key={order._id}>
                      <td>
                        <Link to={`/admin/orders/${order._id}`} style={{ fontWeight: 'bold', color: 'var(--red)', textDecoration: 'none' }}>
                          {order.orderCode || '-'}
                        </Link>
                      </td>
                      <td>
                        <div>
                          <strong>{order.customerName || 'Guest'}</strong>
                          {order.customerPhone && <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{order.customerPhone}</div>}
                        </div>
                      </td>
                      <td><span style={{ textTransform: 'capitalize' }}>{order.channel || 'walk_in'}</span></td>
                      <td>
                        {order.items?.map((item, i) => (
                          <div key={i} style={{ fontSize: '0.85rem' }}>
                            {item.name} x{item.quantity}
                          </div>
                        ))}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--red)' }}>{formatPrice(order.totalAmount)}</td>
                      <td style={{ textAlign: 'center' }}>{statusBadge(order.status)}</td>
                      <td style={{ textAlign: 'center' }}>{kitchenBadge(order.kitchenStatus)}</td>
                      <td style={{ textAlign: 'center' }}>{paymentBadge(order.paymentStatus)}</td>
                      <td style={{ fontSize: '0.8rem', textAlign: 'center' }}>{formatDate(order.createdAt)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.3rem', flexDirection: 'column', alignItems: 'center' }}>
                          {order.status === 'pending' && (
                            <button
                              className="btn btn-yellow btn-sm"
                              onClick={() => confirmMutation.mutate(order._id)}
                              disabled={confirmMutation.isPending}
                            >
                              {confirmMutation.isPending ? '…' : 'Confirm'}
                            </button>
                          )}
                          {order.paymentStatus === 'unpaid' && order.status !== 'cancelled' && (
                            <button
                              className="btn btn-sm"
                              style={{ background: '#43a047', color: '#fff' }}
                              onClick={() => setPaymentModal({ id: order._id, orderCode: order.orderCode })}
                            >
                              Mark Paid
                            </button>
                          )}
                          {(order.status === 'pending' || order.status === 'confirmed') && (
                            <button
                              className="btn btn-red btn-sm"
                              onClick={() => cancelMutation.mutate(order._id)}
                              disabled={cancelMutation.isPending}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📋</div>
          <p>No orders found matching your filters.</p>
        </div>
      )}

      {/* ── Payment Modal ───────────────────── */}
      {paymentModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setPaymentModal(null)}>
          <div className="card" style={{ width: '400px', maxWidth: '90%', padding: '2rem', animation: 'fadeInUp 0.3s ease' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: 'var(--red)', marginBottom: '0.5rem' }}>Mark as Paid</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--gray-500)', marginBottom: '1.5rem' }}>
              Order: <strong>{paymentModal.orderCode}</strong>
            </p>
            <div className="form-group">
              <label>Payment Method</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cash">💵 Cash</option>
                <option value="transfer">🏦 Transfer</option>
                <option value="qris_static">📱 QRIS</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-gray" style={{ flex: 1 }} onClick={() => setPaymentModal(null)}>Cancel</button>
              <button
                className="btn btn-green"
                style={{ flex: 1, background: '#43a047', color: '#fff' }}
                onClick={() => handlePay(paymentModal.id)}
                disabled={paymentMutation.isPending}
              >
                {paymentMutation.isPending ? 'Processing…' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}