import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api.js'

const CATEGORIES = [
  { value: 'main_course', label: 'Main Course', emoji: '🍛' },
  { value: 'appetizer', label: 'Appetizer', emoji: '🥗' },
  { value: 'beverage', label: 'Beverage', emoji: '🥤' },
  { value: 'dessert', label: 'Dessert', emoji: '🍮' },
  { value: 'snack', label: 'Snack', emoji: '🍢' },
]

export default function MenusPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', price: 0, category: 'main_course', available: true })
  const [error, setError] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['menus'],
    queryFn: async () => { const res = await api.get('/menus'); return res.data },
  })

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/menus', body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['menus'] }); resetForm() },
    onError: () => setError('Gagal menambah menu'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => api.patch(`/menus/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['menus'] }); resetForm() },
    onError: () => setError('Gagal memperbarui menu'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/menus/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menus'] }),
    onError: () => setError('Gagal menghapus menu'),
  })

  const resetForm = () => {
    setShowForm(false); setEditItem(null); setError('')
    setForm({ name: '', price: 0, category: 'main_course', available: true })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const body = { ...form, price: Number(form.price) }
    if (editItem) updateMutation.mutate({ id: editItem._id, body })
    else createMutation.mutate(body)
  }

  const handleEdit = (item) => {
    setEditItem(item)
    setForm({ name: item.name, price: item.price, category: item.category || 'main_course', available: item.available !== false })
    setShowForm(true); setError('')
  }

  const menus = data?.data || []
  const fmt = (p) => p != null ? `Rp ${Number(p).toLocaleString('id-ID')}` : '-'

  /* ── Loading ─────────────────────────────── */
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px', margin: '0 auto' }} />
          <p style={{ color: 'var(--gray-500)', marginTop: '1rem' }}>Memuat data menu…</p>
        </div>
      </div>
    )
  }

  /* ── Page header ─────────────────────────── */
  return (
    <div>
      <div className="page-header" style={{ animation: 'fadeInDown 0.4s ease' }}>
        <div>
          <h2 style={{ margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🍛 Menus Management
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
            {menus.length} menu · {menus.filter(m => m.available !== false).length} available
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button className="btn btn-red btn-sm" onClick={() => { resetForm(); setShowForm(!showForm); }}>
            {showForm ? 'Cancel' : '+ Add Menu'}
          </button>
          <button className="btn btn-sm btn-black" onClick={() => refetch()}>🔄</button>
        </div>
      </div>

      {/* ── Error banner ─────────────────────── */}
      {error && (
        <div className="card card-accent-red" style={{ marginBottom: '1.5rem', border: '2px solid var(--red)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: 'var(--red)', fontWeight: 'bold', margin: 0 }}>{error}</p>
            <button className="btn btn-sm btn-red" onClick={() => setError('')}>✕</button>
          </div>
        </div>
      )}

      {/* ── Add/Edit Form ───────────────────── */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem', animation: 'fadeInUp 0.35s ease' }}>
          <h3 style={{ color: 'var(--red)', marginBottom: '1rem' }}>{editItem ? 'Edit Menu' : 'New Menu'}</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label>Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Nasi Goreng Special" />
              </div>
              <div className="form-group">
                <label>Price (IDR)</label>
                <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required min="0" placeholder="25000" />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Available</label>
                <select value={form.available ? 'true' : 'false'} onChange={(e) => setForm({ ...form, available: e.target.value === 'true' })}>
                  <option value="true">✅ Yes</option>
                  <option value="false">❌ No</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-yellow" disabled={createMutation.isPending || updateMutation.isPending}>
                {editItem ? 'Update Menu' : 'Create Menu'}
              </button>
              <button type="button" className="btn btn-gray" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Menu Table ───────────────────────── */}
      <div className="card">
        {menus.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Menu</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {menus.map((item) => {
                  const cat = CATEGORIES.find((c) => c.value === item.category)
                  return (
                    <tr key={item._id} style={{ background: item.available === false ? '#fafafa' : 'transparent', opacity: item.available === false ? 0.7 : 1 }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.5rem' }}>{cat?.emoji || '🍽️'}</span>
                          <strong>{item.name}</strong>
                        </div>
                      </td>
                      <td>{cat?.label || item.category || '-'}</td>
                      <td style={{ fontWeight: 'bold', color: 'var(--red)' }}>{fmt(item.price)}</td>
                      <td>
                        {item.available !== false
                          ? <span className="badge badge-green">Available</span>
                          : <span className="badge badge-gray">Unavailable</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                          <button className="btn btn-yellow btn-sm" onClick={() => handleEdit(item)}>Edit</button>
                          <button
                            className="btn btn-red btn-sm"
                            onClick={() => { if (window.confirm(`Delete "${item.name}"?`)) deleteMutation.mutate(item._id) }}
                            disabled={deleteMutation.isPending}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🍽️</div>
            <p>No menus found. Create your first menu!</p>
          </div>
        )}
      </div>
    </div>
  )
}