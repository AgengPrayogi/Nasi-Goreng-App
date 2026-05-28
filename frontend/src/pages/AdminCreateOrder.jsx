import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../api.js'

export default function AdminCreateOrder() {
  const navigate = useNavigate()
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [orderItems, setOrderItems] = useState([])
  const [notes, setNotes] = useState('')
  const [channel, setChannel] = useState('walk_in')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-menus-order'],
    queryFn: async () => {
      const res = await api.get('/menus')
      return res.data
    },
  })

  const createOrder = useMutation({
    mutationFn: (body) => api.post('/orders', body),
    onSuccess: (res) => {
      const order = res.data?.data
      if (order?._id) {
        navigate(`/admin/orders/${order._id}`)
      } else {
        navigate('/admin/orders')
      }
    },
  })

  const menus = data?.data || []

  const toggleItem = (menu) => {
    setOrderItems((prev) => {
      const existing = prev.find((i) => i.menuId === menu._id)
      if (existing) {
        return prev.map((i) =>
          i.menuId === menu._id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [{ menuId: menu._id, name: menu.name, price: menu.price, quantity: 1 }, ...prev]
    })
  }

  const updateQty = (menuId, delta) => {
    setOrderItems((prev) =>
      prev
        .map((i) => (i.menuId === menuId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i))
        .filter((i) => i.quantity > 0)
    )
  }

  const removeItem = (menuId) => {
    setOrderItems((prev) => prev.filter((i) => i.menuId !== menuId))
  }

  const total = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const formatPrice = (price) => `Rp ${Number(price).toLocaleString('id-ID')}`

  const handleSubmit = (e) => {
    e.preventDefault()
    if (orderItems.length === 0) return
    const payload = {
      items: orderItems.map((i) => ({ menuId: i.menuId, name: i.name, price: i.price, quantity: i.quantity })),
      notes: notes || undefined,
      channel,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
    }
    createOrder.mutate(payload)
  }

  const availableMenus = menus.filter((m) => m.available !== false)
  const selectedIds = new Set(orderItems.map((i) => i.menuId))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ margin: 0 }}>New Order (Walk-in)</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-700)' }}>Channel:</label>
          <select value={channel} onChange={(e) => setChannel(e.target.value)} style={{ padding: '0.4rem' }}>
            <option value="walk_in">Walk In</option>
            <option value="online">Online</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Left: Menu Selection */}
        <div>
          <h3 style={{ color: 'var(--red)', marginBottom: '0.75rem' }}>Select Menu</h3>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '60vh', overflowY: 'auto' }}>
              {availableMenus.map((menu) => {
                const inCart = orderItems.find((i) => i.menuId === menu._id)
                return (
                  <div
                    key={menu._id}
                    className="card"
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      cursor: 'pointer', padding: '0.6rem 1rem',
                      border: inCart ? '2px solid var(--red)' : '1px solid var(--gray-200)',
                      background: inCart ? '#fff8f8' : 'var(--white)',
                    }}
                    onClick={() => toggleItem(menu)}
                  >
                    <div>
                      <strong style={{ fontSize: '0.9rem' }}>{menu.name}</strong>
                      <span style={{ marginLeft: '0.75rem', color: 'var(--red)', fontWeight: 'bold', fontSize: '0.85rem' }}>{formatPrice(menu.price)}</span>
                    </div>
                    {inCart && <span className="badge badge-red">{inCart.quantity}</span>}
                  </div>
                )
              })}
              {availableMenus.length === 0 && <p style={{ color: 'var(--gray-500)' }}>No menus available.</p>}
            </div>
          )}
        </div>

        {/* Right: Cart */}
        <div>
          <h3 style={{ color: 'var(--red)', marginBottom: '0.75rem' }}>Cart ({orderItems.length} items)</h3>
          <form onSubmit={handleSubmit}>
            {orderItems.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '2rem' }}>
                Click menu items to add to cart
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', maxHeight: '40vh', overflowY: 'auto' }}>
                {orderItems.map((item) => (
                  <div key={item.menuId} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem' }}>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '0.85rem' }}>{item.name}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{formatPrice(item.price)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <button type="button" className="btn btn-gray btn-sm" onClick={() => updateQty(item.menuId, -1)} style={{ minWidth: '28px', padding: '0.15rem 0.3rem' }}>−</button>
                      <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center', fontSize: '0.85rem' }}>{item.quantity}</span>
                      <button type="button" className="btn btn-gray btn-sm" onClick={() => updateQty(item.menuId, 1)} style={{ minWidth: '28px', padding: '0.15rem 0.3rem' }}>+</button>
                      <button type="button" className="btn btn-red btn-sm" onClick={() => removeItem(item.menuId)} style={{ marginLeft: '0.25rem' }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="form-group">
              <label>Customer Name</label>
              <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="(optional)" />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="(optional)" />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Order notes..." rows={2} style={{ width: '100%', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '1rem', paddingTop: '0.5rem', borderTop: '2px solid var(--gray-200)' }}>
              <span>Total:</span>
              <span style={{ color: 'var(--red)' }}>{formatPrice(total)}</span>
            </div>

            <button type="submit" className="btn btn-red" style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }} disabled={orderItems.length === 0 || createOrder.isPending}>
              {createOrder.isPending ? 'Creating Order...' : 'Create Order'}
            </button>

            {createOrder.isError && (
              <p style={{ color: 'var(--red)', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                Failed to create order. Please try again.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}