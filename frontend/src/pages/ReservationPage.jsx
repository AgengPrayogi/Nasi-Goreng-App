import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api.js'

const statusLabels = {
  pending: 'Menunggu konfirmasi PIC',
  confirmed: 'Dikonfirmasi',
  checked_in: 'Sudah check-in',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  rejected: 'Tidak dapat dikonfirmasi',
  no_show: 'Tidak hadir'
}

function getLocalDateTimeMinimum() {
  const minimum = new Date()
  minimum.setMinutes(Math.ceil(minimum.getMinutes() / 15) * 15, 0, 0)
  const pad = (value) => String(value).padStart(2, '0')
  return `${minimum.getFullYear()}-${pad(minimum.getMonth() + 1)}-${pad(minimum.getDate())}T${pad(minimum.getHours())}:${pad(minimum.getMinutes())}`
}

export default function ReservationPage() {
  const [form, setForm] = useState({ customerName: '', customerPhone: '', partySize: 2, startAt: '', notes: '' })
  const [whatsAppUtilityConsent, setWhatsAppUtilityConsent] = useState(false)
  const [whatsAppMarketingConsent, setWhatsAppMarketingConsent] = useState(false)
  const [availableTables, setAvailableTables] = useState([])
  const [reservation, setReservation] = useState(null)
  const [lookupForm, setLookupForm] = useState({ reservationCode: '', customerPhone: '' })
  const [trackedReservation, setTrackedReservation] = useState(null)
  const [trackingError, setTrackingError] = useState('')
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const checkAvailability = async (event) => {
    event.preventDefault()
    setError('')
    setLoadingAvailability(true)
    try {
      const response = await api.get('/reservations/availability', {
        params: {
          startAt: new Date(form.startAt).toISOString(),
          partySize: Number(form.partySize),
          durationMinutes: 90
        }
      })
      setAvailableTables(response.data.data || [])
    } catch (requestError) {
      setAvailableTables([])
      setError(requestError.response?.data?.message || 'Tidak dapat memeriksa ketersediaan meja.')
    } finally {
      setLoadingAvailability(false)
    }
  }

  const submitReservation = async () => {
    setError('')
    setSubmitting(true)
    try {
      const response = await api.post('/reservations', {
        ...form,
        partySize: Number(form.partySize),
        durationMinutes: 90,
        startAt: new Date(form.startAt).toISOString(),
        whatsappConsent: {
          utility: whatsAppUtilityConsent,
          marketing: whatsAppMarketingConsent
        }
      })
      setReservation(response.data.data)
      setLookupForm({ reservationCode: response.data.data.reservationCode, customerPhone: response.data.data.customerPhone })
      setTrackedReservation(response.data.data)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Reservasi belum dapat dikirim. Silakan coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  async function checkReservationStatus(event) {
    event.preventDefault()
    setTrackingError('')
    setTrackedReservation(null)
    try {
      const response = await api.get(`/reservations/track/${encodeURIComponent(lookupForm.reservationCode.trim())}`, {
        params: { customerPhone: lookupForm.customerPhone.trim() }
      })
      setTrackedReservation(response.data.data)
    } catch (requestError) {
      setTrackingError(requestError.response?.data?.message || 'Reservasi tidak ditemukan. Periksa kembali kode dan nomor telepon.')
    }
  }

  async function cancelReservation() {
    if (!trackedReservation || !window.confirm('Batalkan reservasi ini?')) return
    setTrackingError('')
    try {
      const response = await api.post(`/reservations/cancel/${encodeURIComponent(trackedReservation.reservationCode)}`, {
        customerPhone: lookupForm.customerPhone.trim()
      })
      setTrackedReservation(response.data.data)
    } catch (requestError) {
      setTrackingError(requestError.response?.data?.message || 'Reservasi tidak dapat dibatalkan.')
    }
  }

  return (
    <main className="container" style={{ maxWidth: 760, padding: '2rem 1rem 3rem' }}>
      <div className="page-header">
        <div>
          <h1 style={{ margin: 0 }}>Reservasi Meja</h1>
          <p style={{ color: 'var(--gray-600)', marginBottom: 0 }}>Ajukan reservasi dine-in. PIC akan mengonfirmasi ketersediaan meja.</p>
        </div>
        <Link to="/" className="btn btn-gray btn-sm">Beranda</Link>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {reservation && (
        <section className="card" role="status" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--yellow)' }}>
          <strong>Permintaan reservasi diterima.</strong> Simpan kode {reservation.reservationCode} untuk memeriksa konfirmasi PIC.
        </section>
      )}

      <section className="card">
        <form onSubmit={checkAvailability}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="reservation-name">Nama</label>
              <input id="reservation-name" required maxLength="100" value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} />
            </div>
            <div className="form-group">
              <label htmlFor="reservation-phone">Nomor telepon</label>
              <input id="reservation-phone" type="tel" required minLength="6" maxLength="30" value={form.customerPhone} onChange={(event) => setForm({ ...form, customerPhone: event.target.value })} />
            </div>
            <div className="form-group">
              <label htmlFor="reservation-party">Jumlah tamu</label>
              <input id="reservation-party" type="number" required min="1" max="30" value={form.partySize} onChange={(event) => { setForm({ ...form, partySize: event.target.value }); setAvailableTables([]) }} />
            </div>
            <div className="form-group">
              <label htmlFor="reservation-start">Tanggal dan waktu</label>
              <input id="reservation-start" type="datetime-local" required min={getLocalDateTimeMinimum()} step="900" value={form.startAt} onChange={(event) => { setForm({ ...form, startAt: event.target.value }); setAvailableTables([]) }} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="reservation-notes">Catatan (opsional)</label>
              <textarea id="reservation-notes" maxLength="500" rows="3" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </div>
            <fieldset style={{ gridColumn: '1 / -1', border: '1px solid var(--gray-300)', borderRadius: 4, padding: '0.75rem' }}>
              <legend style={{ padding: '0 0.35rem', fontSize: '0.9rem' }}>Pesan WhatsApp (opsional)</legend>
              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <input type="checkbox" checked={whatsAppUtilityConsent} onChange={(event) => setWhatsAppUtilityConsent(event.target.checked)} />
                <span>Saya setuju menerima update reservasi dari Nasi Goreng Polonia melalui WhatsApp.</span>
              </label>
              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <input type="checkbox" checked={whatsAppMarketingConsent} onChange={(event) => setWhatsAppMarketingConsent(event.target.checked)} />
                <span>Saya setuju menerima promo dan rekomendasi menu dari Nasi Goreng Polonia melalui WhatsApp.</span>
              </label>
            </fieldset>
          </div>
          <button className="btn btn-black" type="submit" disabled={loadingAvailability || !form.startAt}>
            {loadingAvailability ? 'Memeriksa…' : 'Periksa Ketersediaan'}
          </button>
        </form>

        {availableTables.length > 0 && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--gray-200)' }}>
            <strong>{availableTables.length} pilihan meja tersedia</strong>
            <p style={{ color: 'var(--gray-600)', margin: '0.35rem 0 1rem' }}>Meja final ditentukan PIC saat menyetujui permintaan.</p>
            <button className="btn btn-yellow" type="button" onClick={submitReservation} disabled={submitting}>
              {submitting ? 'Mengirim…' : 'Ajukan Reservasi'}
            </button>
          </div>
        )}
        {availableTables.length === 0 && form.startAt && !loadingAvailability && !error && (
          <p role="status" style={{ marginBottom: 0, color: 'var(--gray-600)' }}>Belum ada meja sesuai kapasitas pada waktu tersebut. Coba waktu lain.</p>
        )}
      </section>

      <section className="card" style={{ marginTop: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Cek Status Reservasi</h2>
        <form onSubmit={checkReservationStatus} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div className="form-group">
            <label htmlFor="reservation-code">Kode reservasi</label>
            <input id="reservation-code" required pattern="RSV-[A-Fa-f0-9]{8}" value={lookupForm.reservationCode} onChange={(event) => setLookupForm({ ...lookupForm, reservationCode: event.target.value.toUpperCase() })} placeholder="RSV-XXXXXXXX" />
          </div>
          <div className="form-group">
            <label htmlFor="lookup-phone">Nomor telepon saat booking</label>
            <input id="lookup-phone" type="tel" required value={lookupForm.customerPhone} onChange={(event) => setLookupForm({ ...lookupForm, customerPhone: event.target.value })} />
          </div>
          <button className="btn btn-black" type="submit">Cari Reservasi</button>
        </form>
        {trackingError && <p role="alert" style={{ color: 'var(--red)' }}>{trackingError}</p>}
        {trackedReservation && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--gray-200)' }}>
            <strong>{statusLabels[trackedReservation.status] || trackedReservation.status}</strong>
            <div>{trackedReservation.customerName} · {trackedReservation.partySize} tamu · {new Date(trackedReservation.startAt).toLocaleString('id-ID')}</div>
            {trackedReservation.tableId && <div>Meja {trackedReservation.tableId.number} · {trackedReservation.tableId.area}</div>}
            <small style={{ color: 'var(--gray-500)' }}>Kode: {trackedReservation.reservationCode}</small>
            {['pending', 'confirmed'].includes(trackedReservation.status) && (
              <div style={{ marginTop: '0.75rem' }}>
                <button className="btn btn-red btn-sm" type="button" onClick={cancelReservation}>Batalkan Reservasi</button>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}