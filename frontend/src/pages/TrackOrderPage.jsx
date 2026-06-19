import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api.js'

const KITCHEN_STATUS_LABELS = {
  none: 'Menunggu Konfirmasi',
  queued: 'Dalam Antrian',
  preparing: 'Sedang Dimasak',
  ready: 'Siap Diambil',
  served: 'Selesai',
}

const KITCHEN_STATUS_ICONS = {
  none: '📝',
  queued: '⏳',
  preparing: '🍳',
  ready: '✅',
  served: '🎉',
}

const KITCHEN_STATUS_COLORS = {
  none: 'var(--gray-500)',
  queued: '#ff9800',
  preparing: '#2196f3',
  ready: '#43a047',
  served: 'var(--gray-500)',
}

const PAYMENT_STATUS_LABELS = {
  unpaid: 'Belum Dibayar',
  paid: 'Lunas',
  refunded: 'Dikembalikan',
}

const STATUS_ORDER = ['none', 'queued', 'preparing', 'ready', 'served']

const STATUS_FUN_FACTS = {
  none: [
    "Kami sedang menyiapkan bahan-bahan segar untuk pesanan Anda!",
    "Koki kami sudah siap dengan wajan panas!",
    "Mempersiapkan nasi goreng spesial untuk Anda...",
  ],
  queued: [
    "Pesanan Anda sudah masuk antrian! Tidak lama lagi.",
    "Hampir sampai giliran Anda!",
    "Antrian berjalan cepat hari ini!",
  ],
  preparing: [
    "Nasi goreng sedang dimasak dengan api sempurna!",
    "Bumbu rahasia sedang dicampur dengan penuh cinta!",
    "Wajan sedang beradu dengan api!",
  ],
  ready: [
    "Nasi goreng Anda sudah siap! Ambil sekarang!",
    "Aroma nasi goreng tercium dari dapur!",
    "Sajian spesial sudah menanti Anda!",
  ],
  served: [
    "Selamat menikmati! Jangan lupa kembali lagi!",
    "Terima kasih! Sampai jumpa lagi!",
    "Semoga nasi gorengnya memuaskan!",
  ],
}

export default function TrackOrderPage() {
  const [searchParams] = useSearchParams()
  const initialCode = searchParams.get('code') || ''
  const [orderCode, setOrderCode] = useState(initialCode)
  const [currentFact, setCurrentFact] = useState(0)
  const [elapsedMinutes, setElapsedMinutes] = useState(0)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['track-order', orderCode],
    queryFn: async () => {
      const res = await api.get(`/orders/track/${orderCode}`)
      return res.data
    },
    enabled: orderCode.length > 0,
    retry: false,
    refetchInterval: orderCode.length > 0 ? 10000 : false,
  })

  const order = data?.data
  const currentStep = order ? STATUS_ORDER.indexOf(order.kitchenStatus || 'none') : 0

  // Rotate fun facts
  useEffect(() => {
    if (!order) return
    const status = order.kitchenStatus || 'none'
    const facts = STATUS_FUN_FACTS[status] || STATUS_FUN_FACTS.none
    const interval = setInterval(() => {
      setCurrentFact((prev) => (prev + 1) % facts.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [order?.kitchenStatus])

  // Elapsed time
  useEffect(() => {
    if (!order?.createdAt) return
    const calc = () => setElapsedMinutes(Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000))
    calc()
    const interval = setInterval(calc, 60000)
    return () => clearInterval(interval)
  }, [order?.createdAt])

  const formatPrice = (price) => {
    if (price == null) return '-'
    return `Rp ${Number(price).toLocaleString('id-ID')}`
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('id-ID')
  }

  const formatETA = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  const handleTrack = (e) => {
    e.preventDefault()
    if (orderCode.trim()) {
      refetch()
    }
  }

  const funFacts = order ? STATUS_FUN_FACTS[order.kitchenStatus || 'none'] || STATUS_FUN_FACTS.none : []

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
            🔍 Lacak Pesanan
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', maxWidth: '500px', margin: '0 auto' }}>
            Masukkan kode pesanan untuk melihat status terkini.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '1.5rem 1rem' }}>
        {/* Search Form */}
        <div className="card" style={{ marginBottom: '2rem', animation: 'fadeInUp 0.5s ease' }}>
          <form onSubmit={handleTrack} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={orderCode}
              onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
              placeholder="Kode pesanan (contoh: NGP-20260522-XXXXXX)"
              style={{ flex: 1, fontSize: '0.95rem' }}
            />
            <button 
              type="submit" 
              style={{
                padding: '0.5rem 1.5rem',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
                background: orderCode.trim() && !isLoading 
                  ? 'linear-gradient(135deg, var(--red), var(--red-dark))' 
                  : 'var(--gray-300)',
                color: '#fff',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
              disabled={!orderCode.trim() || isLoading}
            >
              {isLoading ? <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> : '🔍 Cari'}
            </button>
          </form>
        </div>

        {isError && (
          <div className="card" style={{ 
            textAlign: 'center', 
            padding: '2.5rem', 
            border: '2px solid var(--red)',
            animation: 'bounceIn 0.5s ease',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>😕</div>
            <p style={{ color: 'var(--red)', fontWeight: 'bold', fontSize: '1.1rem' }}>Pesanan tidak ditemukan.</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--gray-500)' }}>Periksa kembali kode pesanan Anda.</p>
          </div>
        )}

        {order && (
          <div style={{ animation: 'fadeInUp 0.5s ease' }}>
            {/* Status Card with Animated Timeline */}
            <div className="card" style={{ 
              marginBottom: '1.5rem',
              borderTop: `4px solid ${KITCHEN_STATUS_COLORS[order.kitchenStatus] || 'var(--gray-500)'}`,
              overflow: 'hidden',
            }}>
              {/* Header with animated status badge */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '1.5rem' 
              }}>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.3rem' }}>
                    {KITCHEN_STATUS_ICONS[order.kitchenStatus] || '📋'} {order.orderCode}
                  </h3>
                  {order.customerName && (
                    <span style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>
                      👤 {order.customerName}
                    </span>
                  )}
                </div>
                <div style={{
                  background: KITCHEN_STATUS_COLORS[order.kitchenStatus] || 'var(--gray-500)',
                  color: '#fff',
                  padding: '0.4rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  animation: 'pulse 2s ease-in-out infinite',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}>
                  <span style={{ fontSize: '1rem' }}>{KITCHEN_STATUS_ICONS[order.kitchenStatus] || '📋'}</span>
                  {KITCHEN_STATUS_LABELS[order.kitchenStatus] || order.kitchenStatus}
                </div>
              </div>

              {/* Fun Fact Carousel */}
              {funFacts.length > 0 && (
                <div style={{
                  background: 'linear-gradient(135deg, #fff8e1, #fff3cd)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1.5rem',
                  animation: 'fadeIn 0.5s ease',
                  textAlign: 'center',
                }}>
                  <span style={{ fontSize: '0.85rem', color: '#e65100' }}>
                    💡 {funFacts[currentFact]}
                  </span>
                </div>
              )}

              {/* Animated Timeline */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div className="status-timeline">
                  {STATUS_ORDER.map((s, i) => (
                    <div key={s} className="status-step" style={{ position: 'relative' }}>
                      {/* Connector line */}
                      {i < STATUS_ORDER.length - 1 && (
                        <div style={{
                          position: 'absolute',
                          top: '16px',
                          left: '50%',
                          width: '100%',
                          height: '3px',
                          background: i < currentStep ? '#43a047' : i === currentStep ? 'linear-gradient(90deg, var(--red), var(--yellow))' : 'var(--gray-200)',
                          zIndex: 1,
                          transition: 'all 0.5s ease',
                        }} />
                      )}
                      <div className={`step-dot ${
                        i < currentStep ? 'completed' : 
                        i === currentStep ? 'active' : 
                        'pending'
                      }`}
                      style={{ 
                        position: 'relative',
                        zIndex: 2,
                        width: '36px',
                        height: '36px',
                        fontSize: '0.9rem',
                      }}>
                        {i < currentStep ? '✓' : i === currentStep && order.kitchenStatus === 'preparing' ? '🍳' : i}
                      </div>
                      <div className="step-label" style={{
                        color: i <= currentStep ? (i === currentStep ? 'var(--red)' : '#43a047') : 'var(--gray-500)',
                        fontWeight: i <= currentStep ? 600 : 400,
                        maxWidth: '80px',
                      }}>
                        {KITCHEN_STATUS_LABELS[s]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ETA & Elapsed */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap',
              }}>
                {order.estimatedReadyAt && (
                  <div style={{ 
                    flex: 1,
                    padding: '0.75rem', 
                    background: '#fff8e1', 
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>⏰ Estimasi Selesai</div>
                    <div style={{ fontWeight: 'bold', color: '#e65100', fontSize: '1.3rem' }}>
                      {formatETA(order.estimatedReadyAt)}
                    </div>
                  </div>
                )}
                {order.createdAt && (
                  <div style={{ 
                    flex: 1,
                    padding: '0.75rem', 
                    background: '#e3f2fd', 
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>⏱️ Waktu Berlalu</div>
                    <div style={{ fontWeight: 'bold', color: '#1565c0', fontSize: '1.3rem' }}>
                      {elapsedMinutes < 60 ? `${elapsedMinutes} menit` : `${Math.floor(elapsedMinutes / 60)} jam ${elapsedMinutes % 60} menit`}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Action */}
            {order.paymentStatus === 'unpaid' && order.status !== 'cancelled' && (
              <div className="card" style={{ 
                marginBottom: '1rem', 
                textAlign: 'center',
                border: '2px solid var(--yellow)',
                animation: 'pulse 2s ease-in-out infinite',
              }}>
                <p style={{ margin: '0 0 0.75rem', color: 'var(--gray-700)' }}>
                  ⚠️ Pesanan belum dibayar. Silakan lakukan pembayaran untuk melanjutkan.
                </p>
                <Link to={`/payment/${order.orderCode}`} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 2rem',
                  background: 'linear-gradient(135deg, var(--red), var(--red-dark))',
                  color: '#fff',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '1.05rem',
                }}>
                  💳 Bayar Sekarang
                </Link>
              </div>
            )}

            {/* Order Items */}
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h4 style={{ margin: '0 0 0.75rem', color: 'var(--black)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                🛒 Item Pesanan
              </h4>
              {order.items?.map((item, i) => (
                <div key={i} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '0.5rem 0', 
                  borderBottom: i < order.items.length - 1 ? '1px solid var(--gray-200)' : 'none',
                  animation: `fadeIn 0.3s ease ${i * 0.1}s both`,
                }}>
                  <span>{item.name} <strong>x{item.quantity}</strong></span>
                  <span style={{ fontWeight: 'bold' }}>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                paddingTop: '0.75rem', 
                fontSize: '1.2rem', 
                fontWeight: 'bold', 
                borderTop: '2px solid var(--gray-300)',
                marginTop: '0.5rem',
              }}>
                <span>Total</span>
                <span style={{ color: 'var(--red)' }}>{formatPrice(order.totalAmount)}</span>
              </div>
            </div>

            {/* Payment Card */}
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h4 style={{ margin: '0 0 0.75rem', color: 'var(--black)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                💳 Pembayaran
              </h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--gray-700)' }}>
                  Status: {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                </span>
                <span className="badge" style={{
                  background: order.paymentStatus === 'paid' ? '#43a047' : order.paymentStatus === 'refunded' ? 'var(--gray-500)' : '#ff9800',
                  color: '#fff',
                  fontSize: '0.85rem',
                  padding: '0.35rem 0.75rem',
                }}>
                  {order.paymentStatus === 'paid' ? '✅ Lunas' : order.paymentStatus === 'refunded' ? '↩️ Dikembalikan' : '⏳ Belum Dibayar'}
                </span>
              </div>
              {order.paymentStatus === 'paid' && (
                <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
                  <a
                    href={`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api'}/invoices/order/${order.orderCode}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn"
                    style={{ background: 'var(--gray-800)', color: '#fff', padding: '0.5rem 1rem', fontSize: '0.9rem', textDecoration: 'none' }}
                  >
                    📄 Download Faktur PDF
                  </a>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="card" style={{ background: '#f5f5f5', border: '1px dashed var(--gray-300)' }}>
              <h4 style={{ margin: '0 0 0.5rem', color: 'var(--gray-700)', fontSize: '0.95rem' }}>📋 Informasi Pesanan</h4>
              <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
                <span>Channel: {order.channel === 'online' ? '🌐 Online' : '🚶 Walk In'}</span>
                <span>Tanggal: {formatDate(order.createdAt)}</span>
                {order.notes && <span style={{ gridColumn: '1 / -1' }}>Catatan: {order.notes}</span>}
              </div>
            </div>
          </div>
        )}
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
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link to="/" style={{ color: 'var(--yellow)', fontSize: '0.85rem' }}>Beranda</Link>
          <Link to="/order" style={{ color: 'var(--yellow)', fontSize: '0.85rem' }}>Pesan</Link>
        </div>
      </footer>
    </div>
  )
}