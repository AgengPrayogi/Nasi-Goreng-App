import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api.js'

const STATUS_FLOW = ['queued', 'preparing', 'ready', 'served']
const STATUS_LABELS = { queued: 'Queued', preparing: 'Preparing', ready: 'Ready', served: 'Served' }
const STATUS_ICONS = { queued: '⏳', preparing: '🍳', ready: '✅', served: '🎉' }
const STATUS_COLORS = { queued: '#ff9800', preparing: '#2196f3', ready: '#43a047', served: 'var(--gray-500)' }
const STATUS_GRADIENTS = {
  queued: 'linear-gradient(135deg, #fff3e0, #ffe0b2)',
  preparing: 'linear-gradient(135deg, #e3f2fd, #bbdefb)',
  ready: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)',
  served: 'linear-gradient(135deg, #f5f5f5, #e0e0e0)',
}

export default function KitchenQueue() {
  const queryClient = useQueryClient()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['kitchen-queue'],
    queryFn: async () => {
      const res = await api.get('/orders/queue')
      return res.data
    },
    refetchInterval: 5000,
  })

  const advanceMutation = useMutation({
    mutationFn: ({ id, kitchenStatus }) => api.patch(`/orders/${id}/kitchen`, { kitchenStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-queue'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-executive'] })
    },
  })

  const completeMutation = useMutation({
    mutationFn: (id) => api.patch(`/orders/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-queue'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-executive'] })
    },
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

  const queueCount = orders.filter(o => o.kitchenStatus === 'queued').length
  const preparingCount = orders.filter(o => o.kitchenStatus === 'preparing').length
  const readyCount = orders.filter(o => o.kitchenStatus === 'ready').length

  if (isLoading) return (
    <div style={{ textAlign: 'center', padding: '4rem' }}>
      <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px', margin: '0 auto' }} />
      <p style={{ color: 'var(--gray-500)', marginTop: '1rem' }}>Loading kitchen queue...</p>
    </div>
  )

  return (
    <div>
      {/* Header with Live Clock */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '0.75rem',
        animation: 'fadeInDown 0.4s ease',
      }}>
        <div>
          <h2 style={{ margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🍳 Kitchen Queue
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
            Live updates every 5s · {orders.length} orders in queue
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            color: 'var(--red)',
            fontFamily: 'monospace',
          }}>
            {time.toLocaleTimeString('id-ID')}
          </div>
        </div>
      </div>

      {/* Live Count Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '1rem', 
        marginBottom: '1.5rem' 
      }}>
        <div className="card card-accent-orange" style={{ 
          textAlign: 'center',
          animation: 'fadeInUp 0.4s ease 0.05s both',
          background: STATUS_GRADIENTS.queued,
        }}>
          <div style={{ fontSize: '2rem' }}>⏳</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#e65100' }}>{queueCount}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray-700)' }}>In Queue</div>
        </div>
        <div className="card card-accent-blue" style={{ 
          textAlign: 'center',
          animation: 'fadeInUp 0.4s ease 0.1s both',
          background: STATUS_GRADIENTS.preparing,
        }}>
          <div style={{ fontSize: '2rem' }}>🍳</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#1565c0' }}>{preparingCount}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray-700)' }}>Cooking</div>
        </div>
        <div className="card card-accent-green" style={{ 
          textAlign: 'center',
          animation: 'fadeInUp 0.4s ease 0.15s both',
          background: STATUS_GRADIENTS.ready,
        }}>
          <div style={{ fontSize: '2rem' }}>✅</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#2e7d32' }}>{readyCount}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray-700)' }}>Ready</div>
        </div>
        <div className="card card-accent-red" style={{ 
          textAlign: 'center',
          animation: 'fadeInUp 0.4s ease 0.2s both',
        }}>
          <div style={{ fontSize: '2rem' }}>📋</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--red)' }}>{orders.length}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray-700)' }}>Total Active</div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="card" style={{ 
          textAlign: 'center', 
          padding: '4rem',
          border: '2px dashed var(--gray-300)',
          animation: 'fadeIn 0.5s ease',
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>🧹</div>
          <p style={{ color: 'var(--gray-500)', fontSize: '1.1rem' }}>No orders in the queue.</p>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}>Kitchen is clean and ready for new orders!</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', 
          gap: '1rem' 
        }}>
          {orders.map((order, idx) => (
            <div 
              key={order._id} 
              className="card" 
              style={{ 
                borderTop: `4px solid ${STATUS_COLORS[order.kitchenStatus] || 'var(--gray-500)'}`,
                background: STATUS_GRADIENTS[order.kitchenStatus] || 'var(--white)',
                animation: `fadeInUp 0.4s ease ${idx * 0.05}s both`,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Order Number Badge */}
              <div style={{ 
                position: 'absolute', 
                top: '0.75rem', 
                right: '0.75rem',
                background: STATUS_COLORS[order.kitchenStatus] || 'var(--gray-500)',
                color: '#fff',
                borderRadius: '20px',
                padding: '0.15rem 0.6rem',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}>
                #{order.queueNumber || '-'}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--black)' }}>
                    {STATUS_ICONS[order.kitchenStatus] || '📋'} {order.customerName || 'Guest'}
                  </strong>
                </div>
                <span style={{ 
                  fontSize: '0.7rem', 
                  color: 'var(--gray-500)',
                  fontFamily: 'monospace',
                }}>
                  {order.orderCode?.slice(-8)}
                </span>
              </div>

              {/* Order Items */}
              <div style={{ 
                marginBottom: '0.75rem', 
                fontSize: '0.9rem', 
                color: 'var(--gray-700)',
                background: 'rgba(255,255,255,0.6)',
                borderRadius: '6px',
                padding: '0.5rem',
              }}>
                {order.items?.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{item.name}</span>
                    <span style={{ fontWeight: 500 }}>x{item.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Time & ETA */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '0.75rem', 
                fontSize: '0.8rem',
              }}>
                <span style={{ color: 'var(--gray-500)' }}>
                  ⏱️ {getTimeAgo(order.createdAt)}
                </span>
                {order.estimatedReadyAt && (
                  <span style={{ 
                    fontWeight: 'bold', 
                    color: '#e65100',
                    background: '#fff8e1',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                  }}>
                    ETA: {formatETA(order.estimatedReadyAt)}
                  </span>
                )}
              </div>

              {/* Status Badge & Action */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge" style={{
                  background: STATUS_COLORS[order.kitchenStatus] || 'var(--gray-500)',
                  color: order.kitchenStatus === 'queued' ? 'var(--black)' : 'var(--white)',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}>
                  {STATUS_ICONS[order.kitchenStatus] || '📋'} {STATUS_LABELS[order.kitchenStatus] || order.kitchenStatus}
                </span>

                {order.kitchenStatus !== 'served' && (
                  <button
                    onClick={() => handleAdvance(order)}
                    disabled={advanceMutation.isPending || completeMutation.isPending}
                    className="btn btn-red btn-sm"
                    style={{
                      background: order.kitchenStatus === 'ready' 
                        ? 'linear-gradient(135deg, #43a047, #2e7d32)' 
                        : 'linear-gradient(135deg, var(--red), var(--red-dark))',
                    }}
                  >
                    {order.kitchenStatus === 'ready' 
                      ? '🎉 Complete' 
                      : `→ ${STATUS_LABELS[getNextStatus(order.kitchenStatus)] || 'Next'}`}
                  </button>
                )}
              </div>

              {/* Progress bar */}
              <div style={{ 
                marginTop: '0.75rem',
                height: '3px',
                background: '#e0e0e0',
                borderRadius: '2px',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${((STATUS_FLOW.indexOf(order.kitchenStatus) + 1) / STATUS_FLOW.length) * 100}%`,
                  background: 'linear-gradient(90deg, var(--red), var(--yellow))',
                  borderRadius: '2px',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}