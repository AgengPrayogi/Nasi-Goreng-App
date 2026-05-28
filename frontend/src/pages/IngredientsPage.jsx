import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api.js'

export default function IngredientsPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', unit: '', stock: 0, minStock: 0 })

  const { data, isLoading } = useQuery({
    queryKey: ['ingredients'],
    queryFn: async () => {
      const res = await api.get('/ingredients')
      return res.data
    },
  })

  const { data: lowStockData } = useQuery({
    queryKey: ['ingredients', 'low-stock'],
    queryFn: async () => {
      const res = await api.get('/ingredients/low-stock')
      return res.data
    },
  })

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/ingredients', body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ingredients'] }); resetForm() },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => api.patch(`/ingredients/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ingredients'] }); resetForm() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/ingredients/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ingredients'] }),
  })

  const resetForm = () => {
    setShowForm(false); setEditItem(null); setForm({ name: '', unit: '', stock: 0, minStock: 0 })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const body = { ...form, stock: Number(form.stock), minStock: Number(form.minStock) }
    if (editItem) updateMutation.mutate({ id: editItem._id, body })
    else createMutation.mutate(body)
  }

  const handleEdit = (item) => {
    setEditItem(item); setForm({ name: item.name, unit: item.unit, stock: item.stock, minStock: item.minStock }); setShowForm(true)
  }

  const ingredients = data?.data || []
  const lowStockIds = new Set((lowStockData?.data || []).map((i) => i._id))

  if (isLoading) return <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <h2 style={{ margin: 0 }}>Ingredients Management</h2>
        <button className="btn btn-red" onClick={() => { resetForm(); setShowForm(!showForm) }}>
          {showForm ? 'Cancel' : '+ Add Ingredient'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <form onSubmit={handleSubmit}>
            <h3 style={{ color: 'var(--red)', marginBottom: '1rem' }}>{editItem ? 'Edit Ingredient' : 'New Ingredient'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label>Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Unit</label>
                <input type="text" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required />
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
            <button type="submit" className="btn btn-yellow" disabled={createMutation.isPending || updateMutation.isPending}>
              {editItem ? 'Update' : 'Create'}
            </button>
          </form>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Unit</th>
              <th>Stock</th>
              <th>Min Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((item) => (
              <tr key={item._id} style={{ background: lowStockIds.has(item._id) ? '#fff3e0' : 'transparent' }}>
                <td><strong>{item.name}</strong></td>
                <td>{item.unit}</td>
                <td style={{ fontWeight: 'bold', color: lowStockIds.has(item._id) ? 'var(--red)' : 'inherit' }}>{item.stock}</td>
                <td>{item.minStock}</td>
                <td>
                  {lowStockIds.has(item._id)
                    ? <span className="badge badge-red">Low Stock</span>
                    : <span className="badge badge-green">OK</span>}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button className="btn btn-yellow btn-sm" onClick={() => handleEdit(item)}>Edit</button>
                    <button className="btn btn-red btn-sm" onClick={() => { if (window.confirm('Delete this ingredient?')) deleteMutation.mutate(item._id) }} disabled={deleteMutation.isPending}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ingredients.length === 0 && <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>No ingredients found.</p>}
      </div>
    </div>
  )
}