import { useEffect, useState } from 'react'
import api from '../api.js'

const statusLabels = {
  pending: 'Menunggu',
  confirmed: 'Dikonfirmasi',
  checked_in: 'Sudah tiba',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  rejected: 'Ditolak',
  no_show: 'Tidak hadir'
}

function getDateRange() {
  const from = new Date()
  from.setHours(0, 0, 0, 0)
  const to = new Date(from)
  to.setDate(to.getDate() + 14)
  to.setHours(23, 59, 59, 999)
  return { from: from.toISOString(), to: to.toISOString() }
}

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [availableById, setAvailableById] = useState({})
  const [selectedTableById, setSelectedTableById] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadReservations() {
    setLoading(true)
    setError('')
    try {
      const params = { ...getDateRange() }
      if (statusFilter) params.status = statusFilter
      const response = await api.get('/reservations', { params })
      setReservations(response.data.data || [])
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Gagal memuat reservasi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadReservations() }, [statusFilter])

  async function findTables(reservation) {
    setError('')
    try {
      const response = await api.get('/reservations/availability', {
        params: {
          startAt: reservation.startAt,
          partySize: reservation.partySize,
          durationMinutes: reservation.durationMinutes
        }
      })
      setAvailableById({ ...availableById, [reservation._id]: response.data.data || [] })
      if (response.data.data?.length) {
        setSelectedTableById({ ...selectedTableById, [reservation._id]: response.data.data[0]._id })
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Gagal mencari meja yang tersedia.')
    }
  }

  async function changeStatus(reservation, status) {
    setError('')
    setSuccess('')
    try {
      const body = { status }
      if (status === 'confirmed') body.tableId = selectedTableById[reservation._id]
      await api.patch(`/reservations/${reservation._id}/status`, body)
      setSuccess(`Status reservasi ${reservation.customerName} diperbarui.`)
      await loadReservations()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Gagal memperbarui reservasi.')
    }
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>Reservasi Meja</h2>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--gray-600)' }}>Permintaan dan agenda 14 hari ke depan.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label htmlFor="reservation-status-filter">Status</label>
          <select id="reservation-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Semua</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button className="btn btn-black btn-sm" onClick={loadReservations}>Muat ulang</button>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {success && <div className="alert alert-success" role="status">{success}</div>}

      {loading ? <div className="card"><div className="spinner" /></div> : reservations.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>Tidak ada reservasi pada periode ini.</div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {reservations.map((reservation) => {
            const options = availableById[reservation._id] || []
            return (
              <article className="card" key={reservation._id} style={{ borderLeft: `4px solid ${reservation.status === 'pending' ? 'var(--yellow)' : 'var(--gray-300)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.3rem' }}>{reservation.customerName} · {reservation.partySize} tamu</h3>
                    <div>{new Date(reservation.startAt).toLocaleString('id-ID')} · {reservation.durationMinutes} menit</div>
                    <div><a href={`tel:${reservation.customerPhone}`}>{reservation.customerPhone}</a>{reservation.tableId ? ` · Meja ${reservation.tableId.number}` : ''}</div>
                    {reservation.notes && <p style={{ margin: '0.5rem 0 0', color: 'var(--gray-600)' }}>{reservation.notes}</p>}
                  </div>
                  <span className="badge">{statusLabels[reservation.status] || reservation.status}</span>
                </div>

                {reservation.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '1rem' }}>
                    <button className="btn btn-gray btn-sm" onClick={() => findTables(reservation)}>Cari meja</button>
                    {options.length > 0 && (
                      <>
                        <select
                          aria-label={`Pilih meja untuk ${reservation.customerName}`}
                          value={selectedTableById[reservation._id] || ''}
                          onChange={(event) => setSelectedTableById({ ...selectedTableById, [reservation._id]: event.target.value })}
                        >
                          {options.map((table) => <option key={table._id} value={table._id}>Meja {table.number} · {table.area} · {table.capacity} kursi</option>)}
                        </select>
                        <button className="btn btn-yellow btn-sm" onClick={() => changeStatus(reservation, 'confirmed')}>Konfirmasi</button>
                      </>
                    )}
                    <button className="btn btn-red btn-sm" onClick={() => changeStatus(reservation, 'rejected')}>Tolak</button>
                  </div>
                )}
                {reservation.status === 'confirmed' && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                    <button className="btn btn-yellow btn-sm" onClick={() => changeStatus(reservation, 'checked_in')}>Check-in</button>
                    <button className="btn btn-gray btn-sm" onClick={() => changeStatus(reservation, 'no_show')}>Tandai tidak hadir</button>
                    <button className="btn btn-red btn-sm" onClick={() => changeStatus(reservation, 'cancelled')}>Batalkan</button>
                  </div>
                )}
                {reservation.status === 'checked_in' && (
                  <div style={{ marginTop: '1rem' }}><button className="btn btn-black btn-sm" onClick={() => changeStatus(reservation, 'completed')}>Selesaikan reservasi</button></div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}