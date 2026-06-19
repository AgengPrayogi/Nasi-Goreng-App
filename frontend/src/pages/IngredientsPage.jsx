import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api.js'

export default function IngredientsPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', unit: '', stock: 0, minStock: 0 })
  const [error, setError] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ingredients'],
    queryFn: async () => { const res = await api.get('/ingredients'); return res.data },
  })

  const { data: lowStockData } = useQuery({
    queryKey: ['ingredients', 'low-stock'],
    queryFn: async () => { const res = await api.get('/ingredients/low-stock'); return res.data },
  })

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/ingredients', body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ingredients'] }); resetForm() },
    onError: () => setError('Gagal menambah bahan'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => api.patch(`/ingredients/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ingredients'] }); resetForm() },
    onError: () => setError('Gagal memperbarui bahan'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/ingredients/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ingredients'] }),
    onError: () => setError('Gagal menghapus bahan'),
  })

  const resetForm = () => {
    setShowForm(false); setEditItem(null); setError('')
    setForm({ name: '', unit: '', stock: 0, minStock: 0 })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const body = { ...form, stock: Number(form.stock), minStock: Number(form.minStock) }
    if (editItem) updateMutation.mutate({ id: editItem._id, body })
    else createMutation.mutate(body)
  }

  const handleEdit = (item) => {
    setEditItem(item)
    setForm({ name: item.name, unit: item.unit, stock: item.stock, minStock: item.minStock })
    setShowForm(true); setError('')
  }

  const ingredients = data?.data || []
  const lowStockIds = new Set((lowStockData?.data || []).map((i) => i._id))

  /* ── Loading ─────────────────────────────── */
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px', margin: '0 auto' }} />
          <p style={{ color: 'var(--gray-500)', marginTop: '1rem' }}>Memuat data bahan…</p>
        </div>
      </div>
    )
  }

  const lowStockCount = lowStockIds.size

  /* ── Page header ─────────────────────────── */
  return (
    <div>
      <div className="page-header" style={{ animation: 'fadeInDown 0.4s ease' }}>
        <div>
          <h2 style={{ margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🥬 Ingredients Management
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
            {ingredients.length} bahan · {lowStockCount} low stock
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button className="btn btn-red btn-sm" onClick={() => { resetForm(); setShowForm(!showForm); }}>
            {showForm ? 'Cancel' : '+ Add Ingredient'}
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
          <h3 style={{ color: 'var(--red)', marginBottom: '1rem' }}>{editItem ? 'Edit Ingredient' : 'New Ingredient'}</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label>Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Rice" />
              </div>
              <div className="form-group">
                <label>Unit</label>
                <input type="text" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required placeholder="kg / liter / pcs" />
              </div>
              <div className="form-group">
                <label>Stock</label>
                <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required min="0" />
              </div>
              <div className="form-group">
                <label>Min Stock</label>
                <input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} required min="0" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-yellow" disabled={createMutation.isPending || updateMutation.isPending}>
                {editItem ? 'Update' : 'Create'}
              </button>
              <button type="button" className="btn btn-gray" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Low Stock Alert Bar ─────────────── */}
      {lowStockCount > 0 && (
        <div className="card card-accent-yellow" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #ff9800' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div>
              <strong>{lowStockCount} ingredient{lowStockCount > 1 ? 's' : ''} low stock</strong>
              <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', margin: 0 }}>Periksa dan lakukan restock segera</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Ingredients Table ────────────────── */}
      <div className="card">
        {ingredients.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Unit</th>
                  <th style={{ textAlign: 'right' }}>Stock</th>
                  <th style={{ textAlign: 'right' }}>Min Stock</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((item) => {
                  const isLow = lowStockIds.has(item._id)
                  return (
                    <tr key={item._id} style={{ background: isLow ? '#fff8e1' : 'transparent' }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.3rem' }}>{isLow ? '⚠️' : '✅'}</span>
                          <strong>{item.name}</strong>
                        </div>
                      </td>
                      <td>{item.unit}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: isLow ? 'var(--red)' : 'inherit' }}>{item.stock}</td>
                      <td style={{ textAlign: 'right' }}>{item.minStock}</td>
                      <td style={{ textAlign: 'center' }}>
                        {isLow
                          ? <span className="badge badge-red">Low Stock</span>
                          : <span className="badge badge-green">OK</span>}
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
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🥬</div>
            <p>No ingredients yet. Add your first ingredient!</p>
          </div>
        )}
      </div>
    </div>
  )
}