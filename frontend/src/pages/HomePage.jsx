import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../api.js'

const heroBg = {
  background: 'linear-gradient(135deg, var(--black) 0%, #2c2c2c 50%, var(--red-dark) 100%)',
  padding: '5rem 2rem',
  textAlign: 'center',
  color: 'var(--white)',
  position: 'relative',
  overflow: 'hidden',
}

const heroPattern = {
  position: 'absolute',
  top: '-50%',
  right: '-20%',
  width: '400px',
  height: '400px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(253,216,53,0.08) 0%, transparent 70%)',
}

export default function HomePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['public-menus'],
    queryFn: async () => {
      const res = await api.get('/menus')
      return res.data
    },
  })

  const menus = data?.data || []

  const categories = [...new Set(menus.map((m) => m.category || 'main_course').filter(Boolean))]
  const categoryLabels = {
    main_course: 'Main Course',
    appetizer: 'Appetizer',
    beverage: 'Beverage',
    dessert: 'Dessert',
    snack: 'Snack',
  }

  const formatPrice = (price) => {
    if (price == null) return '-'
    return `Rp ${Number(price).toLocaleString('id-ID')}`
  }

  return (
    <div>
      {/* Hero Section */}
      <div style={heroBg}>
        <div style={heroPattern} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ color: 'var(--yellow)', fontSize: '3.5rem', marginBottom: '0.5rem' }}>
            Nasi Goreng Polonia
          </h1>
          <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.85)', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
            Cita rasa autentik Nusantara, siap memanjakan lidah Anda. Nikmati nasi goreng terbaik dengan bahan berkualitas.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/order" className="btn btn-yellow" style={{ fontSize: '1rem', padding: '0.75rem 2rem', textDecoration: 'none' }}>
              Pesan Sekarang
            </Link>
            <Link to="/track" className="btn" style={{ background: 'transparent', border: '2px solid var(--yellow)', color: 'var(--yellow)', padding: '0.75rem 2rem', fontSize: '1rem', textDecoration: 'none' }}>
              Lacak Pesanan
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="container" style={{ paddingTop: '3rem', paddingBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', textAlign: 'center' }}>
          <div className="card" style={{ borderTop: '4px solid var(--red)' }}>
            <h3 style={{ color: 'var(--red)' }}>🌶️ Pedas & Lezat</h3>
            <p style={{ color: 'var(--gray-700)' }}>Nasi goreng dengan bumbu rempah pilihan dan level pedas sesuai selera.</p>
          </div>
          <div className="card" style={{ borderTop: '4px solid var(--yellow)' }}>
            <h3 style={{ color: 'var(--yellow-dark)' }}>⚡ Cepat & Mudah</h3>
            <p style={{ color: 'var(--gray-700)' }}>Pesan online, lacak real-time, dan siap dalam hitungan menit.</p>
          </div>
          <div className="card" style={{ borderTop: '4px solid var(--black)' }}>
            <h3 style={{ color: 'var(--black)' }}>🥡 Bahan Berkualitas</h3>
            <p style={{ color: 'var(--gray-700)' }}>Bahan segar, higienis, dan pilihan terbaik untuk setiap porsi.</p>
          </div>
        </div>
      </div>

      {/* Menu Section */}
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2>Menu Kami</h2>
          <p style={{ color: 'var(--gray-700)' }}>Pilih menu favorit Anda dan pesan sekarang!</p>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center' }}><div className="spinner" /></div>
        ) : (
          categories.map((cat) => {
            const filtered = menus.filter((m) => (m.category || 'main_course') === cat && m.available !== false)
            if (filtered.length === 0) return null
            return (
              <div key={cat} style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: 'var(--red)', borderBottom: '2px solid var(--yellow)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                  {categoryLabels[cat] || cat}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                  {filtered.map((menu) => (
                    <div key={menu._id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem' }}>{menu.name}</h4>
                        <span style={{ fontWeight: 'bold', color: 'var(--red)', fontSize: '1.1rem' }}>{formatPrice(menu.price)}</span>
                      </div>
                      <Link to="/order" className="btn btn-red btn-sm" style={{ textDecoration: 'none' }}>
                        Pesan
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}

        {!isLoading && menus.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--gray-500)' }}>Menu belum tersedia saat ini.</p>
        )}
      </div>

      {/* Footer */}
      <footer style={{ background: 'var(--black)', color: 'var(--white)', padding: '1.5rem', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.7)' }}>© 2026 Nasi Goreng Polonia. All rights reserved.</p>
        <div style={{ marginTop: '0.5rem' }}>
          <Link to="/admin/login" style={{ color: 'var(--yellow)', fontSize: '0.85rem' }}>Admin</Link>
        </div>
      </footer>
    </div>
  )
}