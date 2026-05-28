import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api.js'

export default function MenusPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', price: 0, category: 'main_course', available: true })

  const { data, isLoading } = useQuery({
    queryKey: ['menus'],
    queryFn: async () => {
      const res = await api.get('/menus')
      return res.data
    },
  })

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/menus', body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['menus'] }); resetForm() },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => api.patch(`/menus/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['menus'] }); resetForm() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/menus/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menus'] }),
  })

  const resetForm = () => { setShowForm(false); setEditItem(null); setForm({ name: '', price: 0, category: 'main_course', available: true }) }

  const handleSubmit = (e) => {
    e.preventDefault()
    const body = { ...form, price: Number(form.price) }
    if (editItem) updateMutation.mutate({ id: editItem._id, body })
    else createMutation.mutate(body)
  }

  const handleEdit = (item) => {
    setEditItem(item); setForm({ name: item.name, price: item.price, category: item.category || 'main_course', available: item.available !== false }); setShowForm(true)
  }

  const menus = data?.data || []
  const formatPrice = (price) => price != null ? `Rp ${Number(price).toLocaleString('id-ID')}` : '-'

  if (isLoading) return <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <h2 style={{ margin: 0 }}>Menus Management</h2>
        <button className="btn btn-red" onClick={() => { resetForm(); setShowForm(!showForm) }}>
          {showForm ? 'Cancel' : '+ Add Menu'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <form onSubmit={handleSubmit}>
            <h3 style={{ color: 'var(--red)', marginBottom: '1rem' }}>{editItem ? 'Edit Menu' : 'New Menu'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label>Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Price</label>
                <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required min="0" />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="main_course">Main Course</option>
                  <option value="appetizer">Appetizer</option>
                  <option value="beverage">Beverage</option>
                  <option value="dessert">Dessert</option>
                  <option value="snack">Snack</option>
                </select>
              </div>
              <div className="form-group">
                <label>Available</label>
                <select value={form.available ? 'true' : 'false'} onChange={(e) => setForm({ ...form, available: e.target.value === 'true' })}>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
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
              <th>Price</th>
              <th>Category</th>
              <th>Available</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {menus.map((item) => (
              <tr key={item._id} style={{ background: item.available === false ? '#f5f5f5' : 'transparent' }}>
                <td><strong>{item.name}</strong></td>
                <td style={{ fontWeight: 'bold', color: 'var(--red)' }}>{formatPrice(item.price)}</td>
                <td>{item.category || '-'}</td>
                <td>{item.available !== false ? <span className="badge badge-green">Available</span> : <span className="badge badge-gray">Unavailable</span>}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button className="btn btn-yellow btn-sm" onClick={() => handleEdit(item)}>Edit</button>
                    <button className="btn btn-red btn-sm" onClick={() => { if (window.confirm('Delete this menu?')) deleteMutation.mutate(item._id) }} disabled={deleteMutation.isPending}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {menus.length === 0 && <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>No menus found.</p>}
      </div>
    </div>
  )
}