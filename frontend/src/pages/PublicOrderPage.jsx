import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api.js'

const CATEGORY_LABELS = {
  main_course: 'Main Course',
  appetizer: 'Appetizer',
  beverage: 'Beverage',
  dessert: 'Dessert',
  snack: 'Snack',
}

const CATEGORY_ICONS = {
  main_course: '🍛',
  appetizer: '🥗',
  beverage: '🥤',
  dessert: '🍰',
  snack: '🍿',
}

export default function PublicOrderPage() {
  const navigate = useNavigate()
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [orderItems, setOrderItems] = useState([])
  const [notes, setNotes] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [showSuccess, setShowSuccess] = useState(false)
  const [orderCode, setOrderCode] = useState('')
  const [animateItems, setAnimateItems] = useState({})
  const menuRef = useRef(null)

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
        setOrderCode(order.orderCode)
        setShowSuccess(true)
        // Confetti effect
        launchConfetti()
        setTimeout(() => {
          navigate(`/payment/${order.orderCode}`)
        }, 2000)
      } else {
        navigate('/')
      }
    },
  })

  const launchConfetti = () => {
    const colors = ['var(--yellow)', 'var(--red)', '#43a047', '#2196f3', '#ff9800']
    for (let i = 0; i < 30; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div')
        confetti.className = 'confetti-piece'
        confetti.style.left = `${Math.random() * 100}vw`
        confetti.style.background = colors[i % colors.length]
        confetti.style.width = `${Math.random() * 8 + 4}px`
        confetti.style.height = `${Math.random() * 8 + 4}px`
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px'
        confetti.style.animationDuration = `${Math.random() * 2 + 2}s`
        document.body.appendChild(confetti)
        setTimeout(() => confetti.remove(), 4000)
      }, i * 100)
    }
  }

  const menus = data?.data || []

  const toggleItem = (menu) => {
    setOrderItems((prev) => {
      const existing = prev.find((i) => i.menuId === menu._id)
      if (existing) {
        const updated = prev.map((i) =>
          i.menuId === menu._id ? { ...i, quantity: i.quantity + 1 } : i
        )
        return updated
      }
      return [{ menuId: menu._id, name: menu.name, price: menu.price, quantity: 1 }, ...prev]
    })
    // Animate
    setAnimateItems((prev) => ({ ...prev, [menu._id]: true }))
    setTimeout(() => setAnimateItems((prev) => ({ ...prev, [menu._id]: false })), 500)
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
  const categories = [...new Set(availableMenus.map((m) => m.category || 'main_course').filter(Boolean))]
  const filteredMenus = activeCategory === 'all' ? availableMenus : availableMenus.filter((m) => (m.category || 'main_course') === activeCategory)

  // Success overlay
  if (showSuccess) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--black) 0%, #2c2c2c 50%, var(--red-dark) 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div className="hero-gradient" style={{ position: 'absolute', inset: 0 }} />
        <div className="card" style={{
          textAlign: 'center',
          padding: '3rem',
          maxWidth: '450px',
          width: '90%',
          animation: 'bounceIn 0.6s ease',
          zIndex: 1,
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'bounceIn 0.6s ease 0.2s both' }}>🎉</div>
          <h2 style={{ color: 'var(--red)' }}>Pesanan Berhasil!</h2>
          <p style={{ color: 'var(--gray-700)' }}>Kode pesanan Anda:</p>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: 'var(--yellow-dark)',
            background: '#fff8e1',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            display: 'inline-block',
            marginBottom: '1rem',
            letterSpacing: '2px',
          }}>
            {orderCode}
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--gray-500)' }}>Mengarahkan ke halaman pembayaran...</p>
          <div className="spinner" style={{ margin: '1rem auto' }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      {/* Hero Header */}
      <div className="hero-gradient" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
        <div className="hero-content" style={{ animation: 'fadeInDown 0.5s ease' }}>
          <Link to="/" style={{ 
            color: 'rgba(255,255,255,0.7)', 
            fontSize: '0.9rem', 
            textDecoration: 'none',
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.3rem',
            marginBottom: '1rem',
          }}>
            ← Kembali ke Beranda
          </Link>
          <h1 style={{ color: 'var(--yellow)', fontSize: '2.5rem', margin: '0 0 0.5rem' }}>
            🍛 Buat Pesanan
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', maxWidth: '500px', margin: '0 auto 1rem' }}>
            Pilih menu favorit Anda, atur jumlah, dan pesan sekarang!
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/track" style={{
              padding: '0.5rem 1.5rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '6px',
              color: 'var(--white)',
              textDecoration: 'none',
              fontSize: '0.9rem',
              transition: 'all 0.2s ease',
            }}>
              🔍 Lacak Pesanan
            </Link>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem' }}>
        {/* Category Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          flexWrap: 'wrap',
        }}>
          <button
            onClick={() => setActiveCategory('all')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              background: activeCategory === 'all' ? 'var(--red)' : 'var(--gray-200)',
              color: activeCategory === 'all' ? '#fff' : 'var(--gray-700)',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            📋 Semua
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                background: activeCategory === cat ? 'var(--red)' : 'var(--gray-200)',
                color: activeCategory === cat ? '#fff' : 'var(--gray-700)',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {CATEGORY_ICONS[cat] || '🍽️'} {CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Left: Menu Selection */}
          <div ref={menuRef}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ color: 'var(--red)', margin: 0 }}>📋 Pilih Menu</h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>{filteredMenus.length} menu</span>
            </div>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="spinner" />
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                gap: '0.75rem',
                maxHeight: '65vh',
                overflowY: 'auto',
                paddingRight: '0.5rem',
              }}>
                {filteredMenus.map((menu, idx) => {
                  const inCart = orderItems.find((i) => i.menuId === menu._id)
                  return (
                    <div
                      key={menu._id}
                      className="card"
                      style={{
                        cursor: 'pointer',
                        border: inCart ? '2px solid var(--red)' : '1px solid var(--gray-200)',
                        background: inCart ? '#fff5f5' : 'var(--white)',
                        transition: 'all 0.2s ease',
                        transform: animateItems[menu._id] ? 'scale(1.05)' : 'scale(1)',
                        animation: `fadeInUp 0.4s ease ${idx * 0.05}s both`,
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                      onClick={() => toggleItem(menu)}
                    >
                      {inCart && (
                        <div style={{
                          position: 'absolute',
                          top: '0.5rem',
                          right: '0.5rem',
                          background: 'var(--red)',
                          color: '#fff',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          animation: 'bounceIn 0.3s ease',
                        }}>
                          {inCart.quantity}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '0.95rem' }}>{menu.name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.15rem' }}>
                            {CATEGORY_ICONS[menu.category] || '🍽️'} {CATEGORY_LABELS[menu.category] || menu.category}
                          </div>
                        </div>
                        <span style={{ color: 'var(--red)', fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                          {formatPrice(menu.price)}
                        </span>
                      </div>
                    </div>
                  )
                })}
                {filteredMenus.length === 0 && (
                  <p style={{ color: 'var(--gray-500)', gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>
                    Menu tidak tersedia untuk kategori ini.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right: Order Cart */}
          <div>
            <div style={{
              position: 'sticky',
              top: '1rem',
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '0.75rem' 
              }}>
                <h3 style={{ color: 'var(--red)', margin: 0 }}>🛒 Pesanan Anda</h3>
                {orderItems.length > 0 && (
                  <span style={{
                    background: 'var(--red)',
                    color: '#fff',
                    borderRadius: '20px',
                    padding: '0.2rem 0.7rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}>
                    {orderItems.reduce((s, i) => s + i.quantity, 0)} item
                  </span>
                )}
              </div>
              
              <form onSubmit={handleSubmit}>
                {orderItems.length === 0 ? (
                  <div className="card" style={{ 
                    textAlign: 'center', 
                    color: 'var(--gray-500)',
                    padding: '3rem 1rem',
                    border: '2px dashed var(--gray-300)',
                  }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🛒</div>
                    <p style={{ margin: 0 }}>Belum ada menu dipilih</p>
                    <p style={{ fontSize: '0.85rem', margin: '0.5rem 0 0' }}>Klik menu di samping untuk menambah</p>
                  </div>
                ) : (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.5rem', 
                    marginBottom: '1rem',
                    maxHeight: '40vh',
                    overflowY: 'auto',
                    paddingRight: '0.25rem',
                  }}>
                    {orderItems.map((item) => (
                      <div 
                        key={item.menuId} 
                        className="card" 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '0.65rem 0.75rem',
                          animation: 'fadeIn 0.3s ease',
                          border: '1px solid var(--gray-200)',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <strong style={{ fontSize: '0.9rem' }}>{item.name}</strong>
                          <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{formatPrice(item.price)}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button 
                            type="button" 
                            className="btn btn-gray btn-sm" 
                            onClick={() => updateQty(item.menuId, -1)}
                            style={{ minWidth: '28px', padding: '0.15rem 0.3rem', fontSize: '1rem' }}
                          >
                            −
                          </button>
                          <span style={{ 
                            fontWeight: 'bold', 
                            minWidth: '24px', 
                            textAlign: 'center',
                            fontSize: '1rem',
                            color: 'var(--red)',
                          }}>
                            {item.quantity}
                          </span>
                          <button 
                            type="button" 
                            className="btn btn-gray btn-sm" 
                            onClick={() => updateQty(item.menuId, 1)}
                            style={{ minWidth: '28px', padding: '0.15rem 0.3rem', fontSize: '1rem' }}
                          >
                            +
                          </button>
                          <button 
                            type="button" 
                            className="btn btn-red btn-sm" 
                            onClick={() => removeItem(item.menuId)} 
                            style={{ marginLeft: '0.25rem', padding: '0.15rem 0.4rem' }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Customer Info */}
                <div className="card" style={{ marginBottom: '1rem', background: '#fafafa' }}>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label>👤 Nama (opsional)</label>
                    <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nama Anda" />
                  </div>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label>📞 No. Telepon (opsional)</label>
                    <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>📝 Catatan (opsional)</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan untuk pesanan..." rows={2} style={{ width: '100%', resize: 'vertical' }} />
                  </div>
                </div>

                {/* Total */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '1.3rem',
                  fontWeight: 'bold',
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  background: '#fff8e1',
                  borderRadius: '8px',
                }}>
                  <span>Total:</span>
                  <span style={{ color: 'var(--red)', fontSize: '1.5rem' }}>{formatPrice(total)}</span>
                </div>

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: orderItems.length === 0 ? 'var(--gray-300)' : 'linear-gradient(135deg, var(--red), var(--red-dark))',
                    color: '#fff',
                    transition: 'all 0.2s ease',
                    opacity: orderItems.length === 0 || createOrder.isPending ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                  disabled={orderItems.length === 0 || createOrder.isPending}
                >
                  {createOrder.isPending ? (
                    <>
                      <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
                      Memproses...
                    </>
                  ) : (
                    <>
                      🍛 Pesan Sekarang
                    </>
                  )}
                </button>

                {createOrder.isError && (
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.75rem',
                    background: '#fff0f0',
                    borderRadius: '8px',
                    color: 'var(--red)',
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    animation: 'fadeIn 0.3s ease',
                  }}>
                    ❌ Gagal membuat pesanan. Silakan coba lagi.
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ 
        background: 'var(--black)', 
        color: 'var(--white)', 
        padding: '1.5rem', 
        textAlign: 'center',
        marginTop: '2rem',
      }}>
        <p style={{ color: 'rgba(255,255,255,0.7)' }}>© 2026 Nasi Goreng Polonia. All rights reserved.</p>
        <Link to="/" style={{ color: 'var(--yellow)', fontSize: '0.85rem' }}>← Kembali ke Beranda</Link>
      </footer>
    </div>
  )
}