import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api.js'

const KITCHEN_STATUS_LABELS = { none: 'None', queued: 'Queued', preparing: 'Preparing', ready: 'Ready', served: 'Served' }
const STATUS_FLOW = ['queued', 'preparing', 'ready', 'served']

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [editItems, setEditItems] = useState([])
  const [editNotes, setEditNotes] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await api.get(`/orders/${id}`)
      return res.data
    },
  })
  const order = data?.data
  const { data: menuData, isLoading: menusLoading } = useQuery({
    queryKey: ['order-edit-menus'],
    queryFn: async () => (await api.get('/menus')).data,
    enabled: !!order && (order.status === 'pending' || (order.status === 'confirmed' && order.kitchenStatus === 'queued')),
  })
  const menus = menuData?.data || []

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['kitchen-queue'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const completeMutation = useMutation({
    mutationFn: () => api.patch(`/orders/${id}/complete`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['order', id] }) },
  })

  const editMutation = useMutation({
    mutationFn: (body) => api.patch(`/orders/${id}`, body),
    onSuccess: () => {
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['kitchen-queue'] })
    },
  })

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

  const startEditing = () => {
    setEditItems((order.items || []).map((item) => {
      const menuId = item.menu?._id || item.menu
      const menu = menus.find((entry) => entry._id === menuId)
      return {
        menuId,
        name: item.menu?.name || menu?.name || 'Menu',
        quantity: item.quantity,
      }
    }))
    setEditNotes(order.notes || '')
    setIsEditing(true)
  }

  const updateEditItem = (index, changes) => {
    setEditItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item))
  }

  const addEditItem = (menuId) => {
    const menu = menus.find((entry) => entry._id === menuId)
    if (!menu) return
    setEditItems((current) => {
      const existing = current.find((item) => item.menuId === menuId)
      if (existing) {
        return current.map((item) => item.menuId === menuId ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...current, { menuId, name: menu.name, quantity: 1 }]
    })
  }

  const saveOrderEdit = (event) => {
    event.preventDefault()
    const body = { notes: editNotes }
    if (order.paymentStatus !== 'paid') {
      body.items = editItems.map(({ menuId, quantity }) => ({ menuId, quantity: Number(quantity) }))
    }
    editMutation.mutate(body)
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
          {kitchenMutation.isError && (
            <p role="alert" style={{ color: 'var(--red)' }}>Status dapur tidak berubah. Muat ulang order untuk melihat status terbaru.</p>
          )}

          {order.estimatedReadyAt && (
            <div className="card" style={{ marginBottom: '1rem', textAlign: 'center', background: '#fff8e1' }}>
              <span style={{ fontWeight: 'bold', color: '#e65100' }}>Estimated Ready at {formatETA(order.estimatedReadyAt)}</span>
            </div>
          )}

          {/* Items */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, color: 'var(--black)' }}>Order Items</h4>
              {(order.status === 'pending' || (order.status === 'confirmed' && order.kitchenStatus === 'queued')) && !isEditing && (
                <button className="btn btn-gray btn-sm" onClick={startEditing} disabled={menusLoading}>Edit Order</button>
              )}
            </div>
            {isEditing ? (
              <form onSubmit={saveOrderEdit}>
                {order.paymentStatus === 'paid' && <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>Items are locked after payment is recorded; notes can still be updated.</p>}
                {editItems.map((item, index) => {
                  const menuId = String(item.menuId)
                  const itemMenu = menus.find((menu) => menu._id === menuId)
                  const price = itemMenu?.price ?? order.items.find((orderItem) => String(orderItem.menu?._id || orderItem.menu) === menuId)?.priceAtOrder ?? 0
                  return (
                    <div key={`${menuId}-${index}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 90px auto', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <select value={menuId} disabled={order.paymentStatus === 'paid'} onChange={(event) => {
                        const menu = menus.find((entry) => entry._id === event.target.value)
                        if (menu) updateEditItem(index, { menuId: menu._id, name: menu.name })
                      }}>
                        {menus.filter((menu) => menu.isAvailable !== false && menu.available !== false || menu._id === menuId).map((menu) => <option key={menu._id} value={menu._id}>{menu.name}</option>)}
                      </select>
                      <input aria-label={`Quantity for ${item.name}`} type="number" min="1" value={item.quantity} disabled={order.paymentStatus === 'paid'} onChange={(event) => updateEditItem(index, { quantity: event.target.value })} />
                      <button type="button" className="btn btn-red btn-sm" aria-label={`Remove ${item.name}`} disabled={order.paymentStatus === 'paid'} onClick={() => setEditItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
                      <span style={{ gridColumn: '1 / -1', color: 'var(--gray-500)', fontSize: '0.8rem' }}>{formatPrice(price)} each</span>
                    </div>
                  )
                })}
                {order.paymentStatus !== 'paid' && (
                  <select defaultValue="" aria-label="Add menu item" onChange={(event) => { addEditItem(event.target.value); event.target.value = '' }} style={{ margin: '0.5rem 0 1rem' }}>
                    <option value="">Add menu item...</option>
                    {menus.filter((menu) => menu.isAvailable !== false && menu.available !== false).map((menu) => <option key={menu._id} value={menu._id}>{menu.name}</option>)}
                  </select>
                )}
                <div className="form-group">
                  <label htmlFor="order-edit-notes">Order notes</label>
                  <textarea id="order-edit-notes" value={editNotes} onChange={(event) => setEditNotes(event.target.value)} rows={2} style={{ width: '100%', resize: 'vertical' }} />
                </div>
                {editMutation.isError && <p style={{ color: 'var(--red)' }}>Order could not be updated. It may have entered preparation; reload and check its status.</p>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-gray btn-sm" onClick={() => setIsEditing(false)}>Cancel</button>
                  <button type="submit" className="btn btn-red btn-sm" disabled={editMutation.isPending || (order.paymentStatus !== 'paid' && editItems.length === 0)}>
                    {editMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                {order.items?.map((item, i) => {
                  const menuId = String(item.menu?._id || item.menu)
                  const menu = menus.find((entry) => entry._id === menuId)
                  const name = item.menu?.name || menu?.name || item.name || 'Menu'
                  const price = item.priceAtOrder ?? item.price ?? menu?.price
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: i < order.items.length - 1 ? '1px solid var(--gray-200)' : 'none' }}>
                      <span>{name} <strong>x{item.quantity}</strong></span>
                      <span style={{ fontWeight: 'bold' }}>{formatPrice(price * item.quantity)}</span>
                    </div>
                  )
                })}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', fontSize: '1.2rem', fontWeight: 'bold', borderTop: '2px solid var(--gray-300)' }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--red)' }}>{formatPrice(order.totalAmount)}</span>
                </div>
              </>
            )}
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