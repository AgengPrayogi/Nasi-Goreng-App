import { useEffect, useState } from 'react'
import api from '../api'

export default function AdminMarketplacePage() {
  const [orders, setOrders] = useState([])
  const [mappings, setMappings] = useState([])
  const [form, setForm] = useState({ platform: 'grabfood', externalMenuId: '', externalName: '', internalMenuId: '' })
  const [error, setError] = useState('')

  async function load() {
    try {
      const [orderRes, mappingRes] = await Promise.all([api.get('/marketplace/orders'), api.get('/marketplace/mappings')])
      setOrders(orderRes.data.data || []); setMappings(mappingRes.data.data || [])
    } catch (err) { setError(err.response?.data?.message || 'Gagal memuat marketplace') }
  }
  useEffect(() => { load() }, [])
  async function addMapping(event) {
    event.preventDefault()
    try { await api.post('/marketplace/mappings', form); setForm({ ...form, externalMenuId: '', externalName: '', internalMenuId: '' }); load() }
    catch (err) { setError(err.response?.data?.message || 'Gagal menyimpan mapping') }
  }
  return <div className="space-y-6">
    <div className="page-header"><h2 style={{ margin: 0 }}>Marketplace Integration</h2><p className="muted">Inbox webhook dan mapping menu. Belum ada platform atau mapping yang di-seed.</p></div>
    {error && <div className="alert alert-error">{error}</div>}
    <div className="card"><h3>Tambah Menu Mapping</h3><p className="muted">Gunakan ID menu internal dari halaman Menus dan ID menu dari marketplace.</p><form onSubmit={addMapping} style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
      <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}><option value="grabfood">GrabFood</option><option value="gofood">GoFood</option><option value="shopeefood">ShopeeFood</option><option value="other">Other</option></select>
      <input required placeholder="External menu ID" value={form.externalMenuId} onChange={(e) => setForm({ ...form, externalMenuId: e.target.value })} />
      <input placeholder="External menu name" value={form.externalName} onChange={(e) => setForm({ ...form, externalName: e.target.value })} />
      <input required placeholder="Internal menu ID" value={form.internalMenuId} onChange={(e) => setForm({ ...form, internalMenuId: e.target.value })} />
      <button className="btn btn-primary" type="submit" style={{ gridColumn: '1 / -1' }}>Simpan Mapping</button>
    </form></div>
    <div className="grid-2"><div className="card"><h3>Menu Mappings ({mappings.length})</h3>{mappings.length === 0 ? <p className="muted">Belum ada mapping. Order marketplace belum boleh disinkronkan sebelum mapping dibuat.</p> : mappings.map((mapping) => <div key={mapping._id} style={{ padding: '0.65rem 0', borderBottom: '1px solid var(--gray-200)' }}>{mapping.platform}: {mapping.externalName || mapping.externalMenuId} → {mapping.internalMenuId?.name || mapping.internalMenuId}</div>)}</div>
    <div className="card"><h3>Marketplace Inbox ({orders.length})</h3>{orders.length === 0 ? <p className="muted">Belum ada webhook order marketplace.</p> : orders.map((order) => <div key={order._id} style={{ padding: '0.65rem 0', borderBottom: '1px solid var(--gray-200)' }}><strong>{order.platform}</strong> · {order.externalOrderId}<div className="muted">Status: {order.status}</div></div>)}</div></div>
  </div>
}
