import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import api from '../api.js'

const METHODS = [
  { value: 'transfer', label: 'Transfer Bank', icon: '🏦', desc: 'BCA / Mandiri / BRI' },
  { value: 'qris_static', label: 'QRIS', icon: '📱', desc: 'Scan via GoPay, OVO, DANA' },
]

export default function PaymentPage() {
  const { orderCode } = useParams()
  const queryClient = useQueryClient()
  const [selectedMethod, setSelectedMethod] = useState('transfer')
  const [paymentData, setPaymentData] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['order', orderCode],
    queryFn: async () => {
      const res = await api.get(`/orders/track/${orderCode}`)
      return res.data.data
    },
    enabled: !!orderCode,
    retry: false,
    refetchInterval: 5000,
  })

  const order = data

  const createPaymentMutation = useMutation({
    mutationFn: async ({ orderId, method, amount }) => {
      const res = await api.post('/payments/create', { orderId, method, amount })
      return res.data.data
    },
    onSuccess: (payment) => {
      queryClient.setQueryData(['payment', orderCode], payment)
      setPaymentData(payment)
      launchConfetti()
    },
  })

  const launchConfetti = () => {
    const colors = ['var(--yellow)', 'var(--red)', '#43a047', '#2196f3', '#ff9800']
    for (let i = 0; i < 20; i++) {
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
      }, i * 80)
    }
  }

  const handlePay = async (e) => {
    e.preventDefault()
    if (!order) return
    const amount = order.totalAmount
    try {
      await createPaymentMutation.mutateAsync({
        orderId: order._id,
        method: selectedMethod,
        amount,
      })
    } catch (err) {
      console.error(err)
    }
  }

  const formatPrice = (price) => {
    if (price == null) return '-'
    return `Rp ${Number(price).toLocaleString('id-ID')}`
  }

  const isPaid = order?.paymentStatus === 'paid'

  // Auto-detect paid status
  useEffect(() => {
    if (isPaid) {
      setShowSuccess(true)
      launchConfetti()
    }
  }, [isPaid])

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--black) 0%, #2c2c2c 50%, var(--red-dark) 100%)' }}>
        <div style={{ textAlign: 'center', color: 'var(--white)' }}>
          <div className="spinner" style={{ borderTopColor: 'var(--yellow)', borderColor: 'rgba(255,255,255,0.2)', width: '40px', height: '40px' }} />
          <p style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.7)' }}>Memuat data pesanan...</p>
        </div>
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--black) 0%, #2c2c2c 50%, var(--red-dark) 100%)' }}>
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem', maxWidth: '400px', animation: 'bounceIn 0.5s ease' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>😕</div>
          <p style={{ color: 'var(--red)', fontWeight: 'bold' }}>Pesanan tidak ditemukan.</p>
          <Link to="/track" style={{ color: 'var(--gray-700)' }}>← Cari lagi</Link>
        </div>
      </div>
    )
  }

  // Success State
  if (showSuccess || isPaid) {
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
          maxWidth: '480px',
          width: '90%',
          animation: 'bounceIn 0.6s ease',
          zIndex: 1,
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'bounceIn 0.6s ease 0.2s both' }}>✅</div>
          <h2 style={{ color: '#43a047' }}>Pembayaran Berhasil!</h2>
          <p style={{ color: 'var(--gray-700)' }}>Pesanan <strong>{order.orderCode}</strong> sudah dibayar.</p>
          <div style={{ 
            background: '#e8f5e9', 
            padding: '1rem', 
            borderRadius: '8px', 
            margin: '1rem 0',
            display: 'flex',
            justifyContent: 'space-around',
          }}>
            {paymentData?.externalPaymentId && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>ID Pembayaran</div>
                <strong>{paymentData.externalPaymentId}</strong>
              </div>
            )}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Kode Pesanan</div>
              <strong>{order.orderCode}</strong>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Total</div>
              <strong style={{ color: 'var(--red)' }}>{formatPrice(order.totalAmount)}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={`/track?code=${order.orderCode}`} className="btn btn-red" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', textDecoration: 'none' }}>
              🔍 Lihat Status Pesanan
            </Link>
            <Link to="/" className="btn" style={{ background: 'var(--gray-200)', color: 'var(--gray-700)', padding: '0.75rem 1.5rem', fontSize: '1rem', textDecoration: 'none' }}>
              🏠 Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Payment Instructions State
  if (paymentData) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
        <div className="hero-gradient" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
          <div className="hero-content" style={{ animation: 'fadeInDown 0.5s ease' }}>
            <h1 style={{ color: 'var(--yellow)', fontSize: '2rem', margin: '0 0 0.5rem' }}>
              💳 Instruksi Pembayaran
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.8)' }}>Selesaikan pembayaran untuk melanjutkan pesanan</p>
          </div>
        </div>

        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem 1rem' }}>
          <div className="card" style={{ marginBottom: '1rem', animation: 'fadeInUp 0.5s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Metode Pembayaran</h3>
              <span className="badge" style={{ background: 'var(--red)', color: '#fff', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}>
                {selectedMethod === 'transfer' ? '🏦 Transfer' : '📱 QRIS'}
              </span>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '1rem', 
              marginBottom: '1.5rem',
              padding: '1rem',
              background: '#fff8e1',
              borderRadius: '8px',
            }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Kode Pesanan</div>
                <strong>{order.orderCode}</strong>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Total Bayar</div>
                <strong style={{ color: 'var(--red)', fontSize: '1.2rem' }}>{formatPrice(order.totalAmount)}</strong>
              </div>
            </div>

            {selectedMethod === 'transfer' && (
              <div style={{ background: '#e8f5e9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <h4 style={{ marginTop: 0, color: '#2e7d32' }}>🏦 Transfer ke Rekening:</h4>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Bank</div>
                  <strong>BCA</strong>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>No. Rekening</div>
                  <strong style={{ fontSize: '1.2rem', letterSpacing: '2px' }}>1234567890</strong>
                  <button
                    onClick={() => navigator.clipboard.writeText('1234567890')}
                    style={{
                      marginLeft: '0.5rem',
                      padding: '0.2rem 0.5rem',
                      border: '1px solid #43a047',
                      background: 'transparent',
                      borderRadius: '4px',
                      color: '#2e7d32',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                  >
                    📋 Salin
                  </button>
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Atas nama</div>
                  <strong>Nasi Goreng Polonia</strong>
                </div>
              </div>
            )}

            {selectedMethod === 'qris_static' && (
              <div style={{ textAlign: 'center', margin: '1rem 0' }}>
                <div style={{
                  display: 'inline-block',
                  background: '#fff',
                  padding: '1rem',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}>
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=ExampleQRIS"
                    alt="QRIS"
                    style={{ borderRadius: '8px' }}
                  />
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--gray-700)', marginTop: '0.75rem' }}>
                  📱 Scan QRIS menggunakan GoPay, OVO, DANA, atau LinkAja
                </p>
              </div>
            )}

            {paymentData && (
              <div style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '8px', margin: '1rem 0' }}>
                <h4 style={{ margin: '0 0 0.5rem', color: '#1565c0' }}>🔑 Referensi Pembayaran</h4>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  ID: <strong>{paymentData.externalPaymentId}</strong>
                </p>
              </div>
            )}

            <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
              ⏳ Status pembayaran akan diperbarui otomatis. Halaman ini akan memeriksa pembayaran setiap 5 detik.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <Link to={`/track?code=${order.orderCode}`} className="btn btn-red" style={{ flex: 1, textDecoration: 'none', padding: '0.75rem' }}>
                🔍 Cek Status
              </Link>
              <button 
                className="btn btn-yellow" 
                onClick={() => { setPaymentData(null); refetch() }}
                style={{ flex: 1, padding: '0.75rem' }}
              >
                🔄 Saya Sudah Bayar
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Payment Form State
  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      {/* Hero Header */}
      <div className="hero-gradient" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
        <div className="hero-content" style={{ animation: 'fadeInDown 0.5s ease' }}>
          <Link to={`/track?code=${order.orderCode}`} style={{ 
            color: 'rgba(255,255,255,0.7)', 
            fontSize: '0.9rem', 
            textDecoration: 'none',
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.3rem',
            marginBottom: '1rem',
          }}>
            ← Kembali ke Pesanan
          </Link>
          <h1 style={{ color: 'var(--yellow)', fontSize: '2.5rem', margin: '0 0 0.5rem' }}>
            💳 Bayar Pesanan
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)' }}>
            Kode: <strong style={{ color: 'var(--yellow)' }}>{order.orderCode}</strong>
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem 1rem' }}>
        {/* Order Summary */}
        <div className="card" style={{ 
          marginBottom: '1.5rem', 
          animation: 'fadeInUp 0.5s ease',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: '0.5rem' }}>Total Pembayaran</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--red)' }}>
            {formatPrice(order.totalAmount)}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: '0.5rem' }}>
            {order.items?.reduce((s, i) => s + i.quantity, 0)} item
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="card" style={{ marginBottom: '1.5rem', animation: 'fadeInUp 0.5s ease 0.1s both' }}>
          <h3 style={{ margin: '0 0 1rem', color: 'var(--black)' }}>Pilih Metode Pembayaran</h3>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setSelectedMethod(m.value)}
                style={{
                  flex: 1,
                  padding: '1rem 0.75rem',
                  border: selectedMethod === m.value ? '2px solid var(--red)' : '2px solid var(--gray-200)',
                  borderRadius: '10px',
                  background: selectedMethod === m.value ? '#fff5f5' : 'var(--white)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>{m.icon}</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{m.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.15rem' }}>{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handlePay}
          style={{
            width: '100%',
            padding: '0.85rem',
            fontSize: '1.1rem',
            fontWeight: 700,
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, var(--red), var(--red-dark))',
            color: '#fff',
            transition: 'all 0.2s ease',
            opacity: createPaymentMutation.isPending ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            animation: 'fadeInUp 0.5s ease 0.2s both',
          }}
          disabled={createPaymentMutation.isPending}
        >
          {createPaymentMutation.isPending ? (
            <>
              <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
              Memproses...
            </>
          ) : (
            `Bayar ${formatPrice(order.totalAmount)}`
          )}
        </button>

        {createPaymentMutation.isError && (
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
            ❌ Gagal memproses pembayaran. Silakan coba lagi.
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link to={`/track?code=${order.orderCode}`} style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>
            ← Kembali ke Lacak Pesanan
          </Link>
        </div>
      </div>
    </div>
  )
}