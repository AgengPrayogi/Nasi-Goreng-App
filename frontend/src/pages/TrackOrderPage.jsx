import { useState } from 'react'
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

export default function TrackOrderPage() {
  const [searchParams] = useSearchParams()
  const initialCode = searchParams.get('code') || ''
  const [orderCode, setOrderCode] = useState(initialCode)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['track-order', orderCode],
    queryFn: async () => {
      const res = await api.get(`/orders/track/${orderCode}`)
      return res.data
    },
    enabled: orderCode.length > 0,
    retry: false,
  })

  const order = data?.data
  const currentStep = order ? STATUS_ORDER.indexOf(order.kitchenStatus || 'none') : 0

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

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem', maxWidth: '700px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/" style={{ textDecoration: 'none', fontSize: '0.9rem', color: 'var(--gray-700)' }}>← Kembali ke Beranda</Link>
      </div>

      <h2>Lacak Pesanan</h2>

      <form onSubmit={handleTrack} style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        <input
          type="text"
          value={orderCode}
          onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
          placeholder="Masukkan kode pesanan (contoh: NGP-20260522-XXXXXX)"
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-red" disabled={!orderCode.trim() || isLoading}>
          {isLoading ? '...' : 'Cari'}
        </button>
      </form>

      {isError && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', border: '2px solid var(--red)' }}>
          <p style={{ color: 'var(--red)', fontWeight: 'bold' }}>Pesanan tidak ditemukan.</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--gray-500)' }}>Periksa kembali kode pesanan Anda.</p>
        </div>
      )}

      {order && (
        <div>
          {/* Status Card */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>{order.orderCode}</h3>
              <span className="badge" style={{
                background: KITCHEN_STATUS_COLORS[order.kitchenStatus] || 'var(--gray-500)',
                color: '#fff',
                padding: '0.35rem 0.75rem',
                fontSize: '0.85rem',
              }}>
                {KITCHEN_STATUS_LABELS[order.kitchenStatus] || order.kitchenStatus}
              </span>
            </div>

            <div style={{ color: 'var(--gray-700)', marginBottom: '1rem' }}>
              {order.customerName && <div><strong>Nama:</strong> {order.customerName}</div>}
              {order.customerPhone && <div><strong>Telepon:</strong> {order.customerPhone}</div>}
              <div><strong>Channel:</strong> {order.channel === 'online' ? 'Online' : 'Walk In'}</div>
              <div><strong>Tanggal:</strong> {formatDate(order.createdAt)}</div>
            </div>

            {/* Progress Bar */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                {STATUS_ORDER.map((s, i) => (
                  <div
                    key={s}
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: i <= currentStep ? 'bold' : 'normal',
                      color: i <= currentStep ? 'var(--red)' : 'var(--gray-500)',
                      textAlign: 'center',
                      flex: 1,
                    }}
                  >
                    {KITCHEN_STATUS_LABELS[s]}
                  </div>
                ))}
              </div>
              <div style={{ height: '8px', background: 'var(--gray-200)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(currentStep / (STATUS_ORDER.length - 1)) * 100}%`,
                    background: 'linear-gradient(90deg, var(--red), var(--yellow))',
                    borderRadius: '4px',
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
            </div>

            {order.estimatedReadyAt && (
              <div style={{ textAlign: 'center', padding: '0.75rem', background: '#fff8e1', borderRadius: '8px', marginTop: '0.5rem' }}>
                <span style={{ fontWeight: 'bold', color: '#e65100' }}>
                  Estimasi Selesai: {formatETA(order.estimatedReadyAt)}
                </span>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h4 style={{ margin: '0 0 0.75rem', color: 'var(--black)' }}>Item Pesanan</h4>
            {order.items?.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: i < order.items.length - 1 ? '1px solid var(--gray-200)' : 'none' }}>
                <span>{item.name} x{item.quantity}</span>
                <span style={{ fontWeight: 'bold' }}>{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', fontSize: '1.1rem', fontWeight: 'bold', borderTop: '2px solid var(--gray-300)' }}>
              <span>Total</span>
              <span style={{ color: 'var(--red)' }}>{formatPrice(order.totalAmount)}</span>
            </div>
          </div>

          {/* Payment */}
          <div className="card">
            <h4 style={{ margin: '0 0 0.75rem', color: 'var(--black)' }}>Pembayaran</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--gray-700)' }}>
                Status: {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
              </span>
              <span className="badge" style={{
                background: order.paymentStatus === 'paid' ? '#43a047' : order.paymentStatus === 'refunded' ? 'var(--gray-500)' : '#ff9800',
                color: '#fff',
              }}>
                {order.paymentStatus === 'paid' ? 'Lunas' : order.paymentStatus === 'refunded' ? 'Dikembalikan' : 'Belum Dibayar'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}