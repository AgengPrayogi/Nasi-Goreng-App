import { useEffect, useState } from 'react'
import api from '../api'

const emptyForm = { number: '', area: 'indoor', capacity: 2, notes: '' }

export default function AdminTablesPage() {
  const [tables, setTables] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadTables() {
    try { setLoading(true); setTables((await api.get('/tables')).data.data || []); setError('') }
    catch (err) { setError(err.response?.data?.message || 'Gagal memuat meja') }
    finally { setLoading(false) }
  }
  useEffect(() => { loadTables() }, [])

  async function createTable(event) {
    event.preventDefault()
    try {
      await api.post('/tables', { ...form, capacity: Number(form.capacity) })
      setForm(emptyForm); setShowForm(false); loadTables()
    } catch (err) { setError(err.response?.data?.message || 'Gagal membuat meja') }
  }
  async function updateStatus(table, status) {
    try { await api.patch(`/tables/${table._id}`, { status }); loadTables() }
    catch (err) { setError(err.response?.data?.message || 'Gagal memperbarui status meja') }
  }
  async function releaseTable(table) {
    try { await api.post(`/tables/${table._id}/release`); loadTables() }
    catch (err) { setError(err.response?.data?.message || 'Meja belum dapat dilepas') }
  }

  return <div className="space-y-6">
    <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
      <div><h2 style={{ margin: 0 }}>Table Management</h2><p className="muted">Kelola meja dine-in, kapasitas, area, dan order aktif.</p></div>
      <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>{showForm ? 'Batal' : '+ Tambah Meja'}</button>
    </div>
    {error && <div className="alert alert-error">{error}</div>}
    {showForm && <div className="card"><h3>Tambah Meja</h3><form onSubmit={createTable} style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
      <input required placeholder="Nomor meja" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
      <input placeholder="Area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
      <input required type="number" min="1" placeholder="Kapasitas" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
      <input placeholder="Catatan" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      <button className="btn btn-primary" type="submit" style={{ gridColumn: '1 / -1' }}>Simpan Meja</button>
    </form></div>}
    {loading ? <div className="card"><div className="spinner" /></div> : tables.length === 0 ? <div className="card" style={{ textAlign: 'center', padding: '3rem' }}><div style={{ fontSize: '3rem' }}>🪑</div><h3>Belum ada meja</h3><p className="muted">Data meja sengaja kosong. Tambahkan meja ketika layout restoran sudah siap.</p><button className="btn btn-primary" onClick={() => setShowForm(true)}>Tambah Meja Pertama</button></div> : <div className="grid-3">{tables.map((table) => <div className="card" key={table._id}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><h3>Meja {table.number}</h3><span className="badge">{table.status}</span></div>
      <p className="muted">{table.area} · {table.capacity} kursi</p>
      {table.activeOrderId && <p>Order aktif: <strong>{table.activeOrderId.orderCode}</strong><br />Rp {Number(table.activeOrderId.totalAmount || 0).toLocaleString('id-ID')}</p>}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {table.status === 'available' && <button className="btn btn-gray btn-sm" onClick={() => updateStatus(table, 'cleaning')}>Tandai Cleaning</button>}
        {table.status === 'cleaning' && <button className="btn btn-primary btn-sm" onClick={() => releaseTable(table)}>Set Available</button>}
        {table.status !== 'occupied' && table.status !== 'inactive' && <button className="btn btn-gray btn-sm" onClick={() => updateStatus(table, table.status === 'reserved' ? 'available' : 'reserved')}>{table.status === 'reserved' ? 'Batalkan Reservasi' : 'Reserve'}</button>}
      </div>
    </div>)}</div>}
  </div>
}
