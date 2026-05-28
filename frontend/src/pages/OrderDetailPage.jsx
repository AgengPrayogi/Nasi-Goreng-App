import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api.js'

const KITCHEN_STATUS_LABELS = { none: 'None', queued: 'Queued', preparing: 'Preparing', ready: 'Ready', served: 'Served' }
const STATUS_FLOW = ['queued', 'preparing', 'ready', 'served']

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await api.get(`/orders/${id}`)
      return res.data
    },
  })

  const confirmMutation = useMutation({
    mutationFn: () => api.patch(`/orders/${id}/confirm`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['order', id] }) },
  })

  const cancelMutation = useMutation({
    mutationFn: () => api.patch(`/orders/${id}/cancel`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['order', id] }) },
  })

  const paymentMutation = useMutation({
    mutationFn: (body) => api.patch(`/orders/${id}/payment`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['order', id] }) },
  })

  const kitchenMutation = useMutation({
    mutationFn: (kitchenStatus) => api.patch(`/orders/${id}/kitchen`, { kitchenStatus }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['order', id] }) },
  })

  const completeMutation = useMutation({
    mutationFn: () => api.patch(`/orders/${id}/complete`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['order', id] }) },
  })

  const order = data?.data
  const formatPrice = (price) => price != null ? `Rp ${Number(price).toLocaleString('id-ID')}` : '-'
  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleString('id-ID') : '-'
  const formatETA = (dateStr) => dateStr ? new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'

  const getNextStatus = (current) => {
    const idx = STATUS_FLOW.indexOf(current)
    if (idx >= 0 && idx < STATUS_FLOW.length - 1) return STATUS_FLOW[idx + 1]
    return null
  }

  const handleAdvanceKitchen = () => {
    const next = getNextStatus(order.kitchenStatus)
    if (next === 'served') {
      completeMutation.mutate()
    } else if (next) {
      kitchenMutation.mutate(next)
    }
  }

  if (isLoading) return <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" /></div>
  if (isError || !order) return <div className="card" style={{ textAlign: 'center', padding: '2rem' }}><p style={{ color: 'var(--red)' }}>Order not found.</p><Link to="/admin/orders">← Back to Orders</Link></div>

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/admin/orders" style={{ fontSize: '0.9rem', color: 'var(--gray-500)' }}>← Back to Orders</Link>
      </div>

      <div className="page-header">
        <div>
          <h2 style={{ margin: '0 0 0.25rem' }}>{order.orderCode || 'Order Detail'}</h2>
          <span style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>Created: {formatDate(order.createdAt)}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {order.status === 'pending' && (
            <button className="btn btn-yellow" onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending}>Confirm</button>
          )}
          {order.paymentStatus === 'unpaid' && order.status !== 'cancelled' && (
            <button className="btn btn-green" style={{ background: '#43a047', color: '#fff' }} onClick={() => paymentMutation.mutate({ paymentStatus: 'paid', paymentMethod: 'cash' })} disabled={paymentMutation.isPending}>
              Mark Paid (Cash)
            </button>
          )}
          {(order.status === 'pending' || order.status === 'confirmed') && (
            <button className="btn btn-red" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>Cancel</button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Left: Items & Status */}
        <div>
          {/* Status Badges */}
          <div className="card" style={{ marginBottom: '1rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Status</div>
              <span className={`badge ${order.status === 'pending' ? 'badge-yellow' : order.status === 'confirmed' ? 'badge-green' : order.status === 'completed' ? 'badge-black' : 'badge-gray'}`}>{order.status}</span>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Kitchen</div>
              <span className="badge" style={{ background: order.kitchenStatus === 'ready' ? '#43a047' : order.kitchenStatus === 'preparing' ? '#2196f3' : order.kitchenStatus === 'queued' ? '#ff9800' : '#9e9e9e', color: '#fff' }}>
                {KITCHEN_STATUS_LABELS[order.kitchenStatus] || order.kitchenStatus || 'none'}
              </span>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Payment</div>
              <span className={`badge ${order.paymentStatus === 'paid' ? 'badge-green' : order.paymentStatus === 'refunded' ? 'badge-gray' : 'badge-yellow'}`}>{order.paymentStatus || 'unpaid'}</span>
            </div>
            {order.queueNumber && (
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Queue #</div>
                <strong>#{order.queueNumber}</strong>
              </div>
            )}
          </div>

          {/* Kitchen Advance */}
          {order.status !== 'cancelled' && order.status !== 'completed' && order.kitchenStatus !== 'served' && order.kitchenStatus !== 'none' && (
            <div className="card" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold' }}>Kitchen Progress</span>
              <button className="btn btn-red btn-sm" onClick={handleAdvanceKitchen} disabled={kitchenMutation.isPending || completeMutation.isPending}>
                {order.kitchenStatus === 'ready' ? 'Complete Order' : `Advance to ${KITCHEN_STATUS_LABELS[getNextStatus(order.kitchenStatus)]}`}
              </button>
            </div>
          )}

          {order.estimatedReadyAt && (
            <div className="card" style={{ marginBottom: '1rem', textAlign: 'center', background: '#fff8e1' }}>
              <span style={{ fontWeight: 'bold', color: '#e65100' }}>Estimated Ready at {formatETA(order.estimatedReadyAt)}</span>
            </div>
          )}

          {/* Items */}
          <div className="card">
            <h4 style={{ margin: '0 0 0.75rem', color: 'var(--black)' }}>Order Items</h4>
            {order.items?.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: i < order.items.length - 1 ? '1px solid var(--gray-200)' : 'none' }}>
                <span>{item.name} <strong>x{item.quantity}</strong></span>
                <span style={{ fontWeight: 'bold' }}>{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', fontSize: '1.2rem', fontWeight: 'bold', borderTop: '2px solid var(--gray-300)' }}>
              <span>Total</span>
              <span style={{ color: 'var(--red)' }}>{formatPrice(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Right: Customer Info */}
        <div>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h4 style={{ margin: '0 0 0.75rem', color: 'var(--black)' }}>Customer Info</h4>
            <div style={{ fontSize: '0.9rem', color: 'var(--gray-700)' }}>
              <div style={{ marginBottom: '0.5rem' }}><strong>Name:</strong> {order.customerName || '-'}</div>
              <div style={{ marginBottom: '0.5rem' }}><strong>Phone:</strong> {order.customerPhone || '-'}</div>
              <div style={{ marginBottom: '0.5rem' }}><strong>Channel:</strong> {order.channel === 'online' ? 'Online' : 'Walk In'}</div>
              {order.notes && <div><strong>Notes:</strong> {order.notes}</div>}
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1rem' }}>
            <h4 style={{ margin: '0 0 0.75rem', color: 'var(--black)' }}>Payment Details</h4>
            <div style={{ fontSize: '0.9rem', color: 'var(--gray-700)' }}>
              <div style={{ marginBottom: '0.5rem' }}><strong>Status:</strong> {order.paymentStatus || 'unpaid'}</div>
              {order.paymentMethod && <div style={{ marginBottom: '0.5rem' }}><strong>Method:</strong> {order.paymentMethod}</div>}
              {order.paidAt && <div><strong>Paid at:</strong> {formatDate(order.paidAt)}</div>}
            </div>
          </div>

          <div className="card">
            <h4 style={{ margin: '0 0 0.75rem', color: 'var(--black)' }}>Timeline</h4>
            <div style={{ fontSize: '0.85rem', color: 'var(--gray-700)' }}>
              <div style={{ marginBottom: '0.4rem' }}><strong>Created:</strong> {formatDate(order.createdAt)}</div>
              {order.confirmedAt && <div style={{ marginBottom: '0.4rem' }}><strong>Confirmed:</strong> {formatDate(order.confirmedAt)}</div>}
              {order.completedAt && <div style={{ marginBottom: '0.4rem' }}><strong>Completed:</strong> {formatDate(order.completedAt)}</div>}
              {order.cancelledAt && <div><strong>Cancelled:</strong> {formatDate(order.cancelledAt)}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}