import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api.js'

export default function PublicOrderPage() {
  const navigate = useNavigate()
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [orderItems, setOrderItems] = useState([])
  const [notes, setNotes] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['public-menus-order'],
    queryFn: async () => {
      const res = await api.get('/menus')
      return res.data
    },
  })

  const createOrder = useMutation({
    mutationFn: (body) => api.post('/orders', body),
    onSuccess: (res) => {
      const order = res.data?.data
      if (order?.orderCode) {
        navigate(`/track?code=${order.orderCode}`)
      } else {
        navigate('/')
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
      return [...prev, { menuId: menu._id, name: menu.name, price: menu.price, quantity: 1 }]
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
      channel: 'online',
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
    }
    createOrder.mutate(payload)
  }

  const availableMenus = menus.filter((m) => m.available !== false)

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <Link to="/" style={{ textDecoration: 'none', fontSize: '0.9rem', color: 'var(--gray-700)' }}>← Kembali ke Beranda</Link>
        <Link to="/track" style={{ fontSize: '0.9rem' }}>Lacak Pesanan</Link>
      </div>

      <h2>Buat Pesanan</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Left: Menu Selection */}
        <div>
          <h3 style={{ color: 'var(--red)' }}>Pilih Menu</h3>
          {isLoading ? (
            <div className="spinner" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {availableMenus.map((menu) => {
                const inCart = orderItems.find((i) => i.menuId === menu._id)
                return (
                  <div
                    key={menu._id}
                    className="card"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      border: inCart ? '2px solid var(--red)' : '1px solid var(--gray-200)',
                    }}
                    onClick={() => toggleItem(menu)}
                  >
                    <div>
                      <strong>{menu.name}</strong>
                      <span style={{ marginLeft: '0.75rem', color: 'var(--red)', fontWeight: 'bold' }}>{formatPrice(menu.price)}</span>
                    </div>
                    {inCart && (
                      <span className="badge badge-red">{inCart.quantity}</span>
                    )}
                  </div>
                )
              })}
              {availableMenus.length === 0 && <p style={{ color: 'var(--gray-500)' }}>Menu belum tersedia.</p>}
            </div>
          )}
        </div>

        {/* Right: Order Cart */}
        <div>
          <h3 style={{ color: 'var(--red)' }}>Pesanan Anda</h3>
          <form onSubmit={handleSubmit}>
            {orderItems.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', color: 'var(--gray-500)' }}>
                <p style={{ padding: '2rem 0' }}>Belum ada menu dipilih. Klik menu di samping untuk menambah.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {orderItems.map((item) => (
                  <div key={item.menuId} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{item.name}</strong>
                      <div style={{ fontSize: '0.85rem', color: 'var(--gray-700)' }}>{formatPrice(item.price)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button type="button" className="btn btn-gray btn-sm" onClick={() => updateQty(item.menuId, -1)}>-</button>
                      <span style={{ fontWeight: 'bold', minWidth: '24px', textAlign: 'center' }}>{item.quantity}</span>
                      <button type="button" className="btn btn-gray btn-sm" onClick={() => updateQty(item.menuId, 1)}>+</button>
                      <button type="button" className="btn btn-red btn-sm" onClick={() => removeItem(item.menuId)} style={{ marginLeft: '0.5rem' }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="form-group">
              <label>Nama (opsional untuk online)</label>
              <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nama Anda" />
            </div>
            <div className="form-group">
              <label>No. Telepon (opsional untuk online)</label>
              <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
            </div>
            <div className="form-group">
              <label>Catatan (opsional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan untuk pesanan..." rows={2} style={{ width: '100%', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              <span>Total:</span>
              <span style={{ color: 'var(--red)' }}>{formatPrice(total)}</span>
            </div>

            <button
              type="submit"
              className="btn btn-red"
              style={{ width: '100%', fontSize: '1rem', padding: '0.75rem' }}
              disabled={orderItems.length === 0 || createOrder.isPending}
            >
              {createOrder.isPending ? 'Memproses...' : 'Pesan Sekarang'}
            </button>

            {createOrder.isError && (
              <p style={{ color: 'var(--red)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                Gagal membuat pesanan. Silakan coba lagi.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}