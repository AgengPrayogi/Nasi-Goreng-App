import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api.js'

export default function OrdersDashboard() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  const [paymentModal, setPaymentModal] = useState(null) // { id, orderCode }
  const [paymentMethod, setPaymentMethod] = useState('cash')

  const { data, isLoading } = useQuery({
    queryKey: ['orders', statusFilter, channelFilter],
    queryFn: async () => {
      const params = {}
      if (statusFilter) params.status = statusFilter
      if (channelFilter) params.channel = channelFilter
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
  })

  const orders = data?.data || []

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('id-ID')
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

  return (
    <div>
      <div className="page-header">
        <h2 style={{ margin: 0 }}>Orders Dashboard</h2>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>Search</label>
          <input type="text" placeholder="Order code..." value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '0.4rem 0.6rem' }} />
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
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" /></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Order Code</th>
                <th>Customer</th>
                <th>Channel</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Kitchen</th>
                <th>Payment</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders
                .filter((o) => !filter || o.orderCode?.toLowerCase().includes(filter.toLowerCase()))
                .map((order) => (
                  <tr key={order._id}>
                    <td><Link to={`/admin/orders/${order._id}`} style={{ fontWeight: 'bold', color: 'var(--red)', textDecoration: 'none' }}>{order.orderCode || '-'}</Link></td>
                    <td>
                      {order.customerName || '-'}
                      {order.customerPhone && <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{order.customerPhone}</div>}
                    </td>
                    <td>{order.channel || 'walk_in'}</td>
                    <td>
                      {order.items?.map((item, i) => (
                        <div key={i} style={{ fontSize: '0.85rem' }}>{item.name} x{item.quantity}</div>
                      ))}
                    </td>
                    <td style={{ fontWeight: 'bold', color: 'var(--red)' }}>
                      {order.totalAmount ? `Rp ${Number(order.totalAmount).toLocaleString('id-ID')}` : '-'}
                    </td>
                    <td>{statusBadge(order.status)}</td>
                    <td>{kitchenBadge(order.kitchenStatus)}</td>
                    <td>{paymentBadge(order.paymentStatus)}</td>
                    <td style={{ fontSize: '0.8rem' }}>{formatDate(order.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.3rem', flexDirection: 'column' }}>
                        {order.status === 'pending' && (
                          <button className="btn btn-yellow btn-sm" onClick={() => confirmMutation.mutate(order._id)} disabled={confirmMutation.isPending}>
                            Confirm
                          </button>
                        )}
                        {order.paymentStatus === 'unpaid' && order.status !== 'cancelled' && (
                          <button className="btn btn-green btn-sm" style={{ background: '#43a047', color: '#fff' }} onClick={() => setPaymentModal({ id: order._id, orderCode: order.orderCode })}>
                            Mark Paid
                          </button>
                        )}
                        {(order.status === 'pending' || order.status === 'confirmed') && (
                          <button className="btn btn-red btn-sm" onClick={() => cancelMutation.mutate(order._id)} disabled={cancelMutation.isPending}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {orders.length === 0 && <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>No orders found.</p>}
        </div>
      )}

      {/* Payment Modal */}
      {paymentModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setPaymentModal(null)}>
          <div className="card" style={{ width: '380px', maxWidth: '90%', padding: '2rem' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: 'var(--red)', marginBottom: '0.5rem' }}>Mark as Paid</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--gray-500)', marginBottom: '1.5rem' }}>
              Order: <strong>{paymentModal.orderCode}</strong>
            </p>
            <div className="form-group">
              <label>Payment Method</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="transfer">Transfer</option>
                <option value="qris_static">QRIS</option>
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
                {paymentMutation.isPending ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}