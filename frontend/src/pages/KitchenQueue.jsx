import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api.js'

const STATUS_FLOW = ['queued', 'preparing', 'ready', 'served']
const STATUS_LABELS = { queued: 'Queued', preparing: 'Preparing', ready: 'Ready', served: 'Served' }
const STATUS_COLORS = { queued: 'var(--yellow)', preparing: '#2196f3', ready: '#43a047', served: 'var(--gray-500)' }

export default function KitchenQueue() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['kitchen-queue'],
    queryFn: async () => {
      const res = await api.get('/orders/queue')
      return res.data
    },
    refetchInterval: 15000,
  })

  const advanceMutation = useMutation({
    mutationFn: ({ id, kitchenStatus }) => api.patch(`/orders/${id}/kitchen`, { kitchenStatus }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kitchen-queue'] }),
  })

  const completeMutation = useMutation({
    mutationFn: (id) => api.patch(`/orders/${id}/complete`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kitchen-queue'] }),
  })

  const orders = data?.data || []

  const getNextStatus = (current) => {
    const idx = STATUS_FLOW.indexOf(current)
    if (idx >= 0 && idx < STATUS_FLOW.length - 1) return STATUS_FLOW[idx + 1]
    return null
  }

  const handleAdvance = (order) => {
    const next = getNextStatus(order.kitchenStatus)
    if (next === 'served') {
      completeMutation.mutate(order._id)
    } else if (next) {
      advanceMutation.mutate({ id: order._id, kitchenStatus: next })
    }
  }

  const formatETA = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`
  }

  if (isLoading) return <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <h2 style={{ margin: 0 }}>Kitchen Queue</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Auto-refresh every 15s</span>
      </div>

      {orders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--gray-500)' }}>No orders in the queue.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {orders.map((order) => (
            <div key={order._id} className="card" style={{ borderTop: `4px solid ${STATUS_COLORS[order.kitchenStatus] || 'var(--gray-500)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '1.2rem', color: 'var(--black)' }}>#{order.queueNumber || '-'}</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{order.orderCode}</span>
              </div>

              <div style={{ marginBottom: '0.5rem' }}>
                <strong>{order.customerName || 'Guest'}</strong>
                {order.customerPhone && <span style={{ color: 'var(--gray-500)', marginLeft: '0.5rem', fontSize: '0.85rem' }}>({order.customerPhone})</span>}
              </div>

              <div style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--gray-700)' }}>
                {order.items?.map((item, i) => (
                  <div key={i}>{item.name} x{item.quantity}</div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--gray-500)' }}>{getTimeAgo(order.createdAt)}</span>
                {order.estimatedReadyAt && (
                  <span style={{ fontWeight: 'bold', color: '#e65100' }}>ETA: {formatETA(order.estimatedReadyAt)}</span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge" style={{
                  background: STATUS_COLORS[order.kitchenStatus] || 'var(--gray-500)',
                  color: order.kitchenStatus === 'queued' ? 'var(--black)' : 'var(--white)',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.85rem',
                }}>
                  {STATUS_LABELS[order.kitchenStatus] || order.kitchenStatus}
                </span>

                {order.kitchenStatus !== 'served' && (
                  <button
                    onClick={() => handleAdvance(order)}
                    disabled={advanceMutation.isPending || completeMutation.isPending}
                    className="btn btn-red btn-sm"
                  >
                    {order.kitchenStatus === 'ready' ? 'Complete' : `Advance to ${STATUS_LABELS[getNextStatus(order.kitchenStatus)] || 'Next'}`}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}