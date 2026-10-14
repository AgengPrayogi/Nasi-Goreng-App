import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import api from '../api.js'

const styles = {
  page: { minHeight: '100vh', background: '#fff8ed', padding: '32px 16px', color: '#27211d', fontFamily: 'system-ui, sans-serif' },
  card: { maxWidth: 760, margin: '0 auto 20px', padding: 24, background: '#fff', borderRadius: 18, boxShadow: '0 8px 28px #6f452012' },
  button: { border: 0, borderRadius: 10, padding: '12px 18px', background: '#bd3c18', color: '#fff', fontWeight: 700, cursor: 'pointer' }
}

export default function OrderFeedbackPage() {
  const { orderCode } = useParams()
  const [search] = useSearchParams()
  const token = search.get('token') || ''
  const [data, setData] = useState(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const response = await api.get(`/feedback/${encodeURIComponent(orderCode)}?token=${encodeURIComponent(token)}`)
      setData(response.data.data)
      setRating(response.data.data.feedback?.rating || 0)
      setComment(response.data.data.feedback?.comment || '')
    } catch (err) { setError(err.response?.data?.message || 'Tautan feedback tidak valid atau sudah kedaluwarsa.') }
  }

  useEffect(() => { load() }, [orderCode, token])

  const submit = async (event) => {
    event.preventDefault()
    if (!rating) return setError('Pilih rating 1 sampai 5 bintang terlebih dahulu.')
    setSaving(true); setError('')
    try {
      await api.put(`/feedback/${encodeURIComponent(orderCode)}`, { token, rating, comment })
      await load()
    } catch (err) { setError(err.response?.data?.message || 'Feedback belum berhasil disimpan.') }
    finally { setSaving(false) }
  }

  return <main style={styles.page}>
    <header style={{ ...styles.card, textAlign: 'center', background: 'linear-gradient(135deg,#fff,#fff0d8)' }}>
      <div style={{ fontSize: 36 }}>🍜</div><h1 style={{ margin: '6px 0' }}>Bagaimana pesanan Anda?</h1>
      <p style={{ margin: 0, color: '#766b62' }}>Feedback Anda membantu kami menyajikan pengalaman yang lebih baik.</p>
    </header>
    {error && !data ? <section style={styles.card}><p role="alert">{error}</p></section> : data && <>
      <section style={styles.card}>
        <h2 style={{ marginTop: 0 }}>Pesanan {data.order.orderCode}</h2>
        <p>{data.order.items.map((item) => `${item.name} × ${item.quantity}`).join(' · ')}</p>
        <form onSubmit={submit}>
          <label htmlFor="rating"><strong>Rating pesanan</strong></label>
          <div id="rating" role="radiogroup" aria-label="Rating pesanan" style={{ display: 'flex', gap: 8, margin: '8px 0 18px' }}>
            {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} bintang`} onClick={() => setRating(value)} style={{ border: 0, background: 'transparent', cursor: 'pointer', fontSize: 36, color: value <= rating ? '#f2a900' : '#d8d2ca' }}>★</button>)}
          </div>
          <label htmlFor="comment"><strong>Ceritakan pengalaman Anda</strong></label>
          <textarea id="comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} rows={4} placeholder="Rasa, pelayanan, atau hal yang bisa kami tingkatkan" style={{ display: 'block', boxSizing: 'border-box', width: '100%', margin: '8px 0 14px', padding: 12, borderRadius: 10, border: '1px solid #ddd' }} />
          {error && <p role="alert" style={{ color: '#b42318' }}>{error}</p>}
          <button style={styles.button} disabled={saving}>{saving ? 'Menyimpan…' : data.feedback ? 'Perbarui feedback' : 'Kirim feedback'}</button>
          {data.feedback && <span style={{ marginLeft: 12, color: '#477a35' }}>Feedback tersimpan. Anda dapat memperbaruinya.</span>}
        </form>
      </section>
      <section style={styles.card}>
        <h2 style={{ marginTop: 0 }}>Rating pesanan pelanggan</h2>
        <p style={{ fontSize: 28, margin: '0 0 8px' }}>⭐ {data.ratingSummary.average || '—'} <small style={{ fontSize: 14, color: '#766b62' }}>dari {data.ratingSummary.count} feedback</small></p>
        {data.ratingSummary.count ? <div style={{ width: '100%', height: 220 }}><ResponsiveContainer><BarChart data={data.ratingSummary.distribution}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="rating" tickFormatter={(value) => `${value}★`} /><YAxis allowDecimals={false} /><Tooltip labelFormatter={(value) => `${value} bintang`} /><Bar dataKey="count" fill="#bd3c18" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div> : <p>Belum ada rating. Jadilah yang pertama berbagi pengalaman.</p>}
      </section>
    </>}
    <footer style={{ maxWidth: 760, margin: 'auto', textAlign: 'center', color: '#766b62' }}>Terima kasih sudah memilih Nasi Goreng Polonia.</footer>
  </main>
}
