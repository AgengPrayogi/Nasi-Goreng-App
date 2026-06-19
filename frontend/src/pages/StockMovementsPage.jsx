import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api.js'

export default function StockMovementsPage() {
  const queryClient = useQueryClient()
  const [showRestock, setShowRestock] = useState(false)
  const [showAdjustment, setShowAdjustment] = useState(false)
  const [restockForm, setRestockForm] = useState({ ingredientId: '', quantity: 0, notes: '' })
  const [adjForm, setAdjForm] = useState({ ingredientId: '', quantity: 0, reason: '', notes: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { data: ingredientsData, isLoading: ingLoading, refetch: refetchIngredients } = useQuery({
    queryKey: ['ingredients'],
    queryFn: async () => { const res = await api.get('/ingredients'); return res.data },
  })
  const ingredients = ingredientsData?.data || []

  const restockMutation = useMutation({
    mutationFn: (body) => api.post('/stock-movements/restock', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      setShowRestock(false); setRestockForm({ ingredientId: '', quantity: 0, notes: '' })
      setSuccess('Restock berhasil!')
      setTimeout(() => setSuccess(''), 3000)
    },
    onError: () => setError('Gagal restock bahan'),
  })
  const adjustmentMutation = useMutation({
    mutationFn: (body) => api.post('/stock-movements/adjustment', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      setShowAdjustment(false); setAdjForm({ ingredientId: '', quantity: 0, reason: '', notes: '' })
      setSuccess('Adjustment berhasil!')
      setTimeout(() => setSuccess(''), 3000)
    },
    onError: () => setError('Gagal melakukan adjustment'),
  })

  const handleRestockSubmit = (e) => {
    e.preventDefault()
    restockMutation.mutate({ ...restockForm, quantity: Number(restockForm.quantity) })
  }
  const handleAdjustmentSubmit = (e) => {
    e.preventDefault()
    adjustmentMutation.mutate({ ...adjForm, quantity: Number(adjForm.quantity) })
  }

  const selectedIngredientRestock = ingredients.find((i) => i._id === restockForm.ingredientId)
  const selectedIngredientAdj = ingredients.find((i) => i._id === adjForm.ingredientId)

  const fmt = (v) => v != null ? Number(v).toLocaleString('id-ID') : '-'

  /* ── Page header ─────────────────────────── */
  return (
    <div>
      <div className="page-header" style={{ animation: 'fadeInDown 0.4s ease' }}>
        <div>
          <h2 style={{ margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📦 Stock Movements
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
            {ingredients.length} bahan · Restock & adjustment
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button className="btn btn-yellow btn-sm" onClick={() => { setShowRestock(!showRestock); setShowAdjustment(false); setError(''); }}>
            {showRestock ? 'Cancel' : '+ Restock'}
          </button>
          <button className="btn btn-red btn-sm" onClick={() => { setShowAdjustment(!showAdjustment); setShowRestock(false); setError(''); }}>
            {showAdjustment ? 'Cancel' : 'Adjustment'}
          </button>
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
      {success && (
        <div className="card card-accent-green" style={{ marginBottom: '1.5rem', border: '2px solid #43a047' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: '#2e7d32', fontWeight: 'bold', margin: 0 }}>{success}</p>
            <button className="btn btn-sm btn-gray" onClick={() => setSuccess('')}>✕</button>
          </div>
        </div>
      )}

      {/* ── Restock Form ────────────────────── */}
      {showRestock && (
        <div className="card" style={{ marginBottom: '1.5rem', animation: 'fadeInUp 0.35s ease' }}>
          <h3 style={{ color: 'var(--yellow-dark)', marginBottom: '1rem' }}>📥 Restock Ingredient</h3>
          <form onSubmit={handleRestockSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label>Ingredient</label>
                <select value={restockForm.ingredientId} onChange={(e) => setRestockForm({ ...restockForm, ingredientId: e.target.value })} required>
                  <option value="">Select ingredient…</option>
                  {ingredients.map((i) => <option key={i._id} value={i._id}>{i.name} (stok: {fmt(i.stock)} {i.unit})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Quantity to Add</label>
                <input type="number" value={restockForm.quantity} onChange={(e) => setRestockForm({ ...restockForm, quantity: e.target.value })} required min="1" placeholder="10" />
              </div>
              <div className="form-group">
                <label>Notes (optional)</label>
                <input type="text" value={restockForm.notes} onChange={(e) => setRestockForm({ ...restockForm, notes: e.target.value })} placeholder="e.g. Purchase order #123" />
              </div>
            </div>
            {selectedIngredientRestock && (
              <div className="card card-accent-green" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📊</span>
                <span style={{ fontSize: '0.9rem' }}>
                  Stok setelah restock: <strong>{fmt(selectedIngredientRestock.stock + Number(restockForm.quantity || 0))} {selectedIngredientRestock.unit}</strong>
                </span>
              </div>
            )}
            <button type="submit" className="btn btn-yellow" disabled={restockMutation.isPending}>
              {restockMutation.isPending ? 'Processing…' : 'Confirm Restock'}
            </button>
          </form>
        </div>
      )}

      {/* ── Adjustment Form ─────────────────── */}
      {showAdjustment && (
        <div className="card" style={{ marginBottom: '1.5rem', animation: 'fadeInUp 0.35s ease' }}>
          <h3 style={{ color: 'var(--red)', marginBottom: '1rem' }}>🔧 Stock Adjustment</h3>
          <form onSubmit={handleAdjustmentSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label>Ingredient</label>
                <select value={adjForm.ingredientId} onChange={(e) => setAdjForm({ ...adjForm, ingredientId: e.target.value })} required>
                  <option value="">Select ingredient…</option>
                  {ingredients.map((i) => <option key={i._id} value={i._id}>{i.name} (stok: {fmt(i.stock)} {i.unit})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Quantity (use negative to deduct)</label>
                <input type="number" value={adjForm.quantity} onChange={(e) => setAdjForm({ ...adjForm, quantity: e.target.value })} required placeholder="-5 or 10" />
              </div>
              <div className="form-group">
                <label>Reason</label>
                <input type="text" value={adjForm.reason} onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })} required placeholder="e.g. Damage, expired" />
              </div>
              <div className="form-group">
                <label>Notes (optional)</label>
                <input type="text" value={adjForm.notes} onChange={(e) => setAdjForm({ ...adjForm, notes: e.target.value })} placeholder="Additional notes" />
              </div>
            </div>
            {selectedIngredientAdj && (
              <div className={`card ${Number(adjForm.quantity || 0) < 0 ? 'card-accent-red' : 'card-accent-green'}`} style={{ marginBottom: '1rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📊</span>
                <span style={{ fontSize: '0.9rem' }}>
                  Stok setelah adjustment: <strong>{fmt(selectedIngredientAdj.stock + Number(adjForm.quantity || 0))} {selectedIngredientAdj.unit}</strong>
                </span>
              </div>
            )}
            <button type="submit" className="btn btn-red" disabled={adjustmentMutation.isPending}>
              {adjustmentMutation.isPending ? 'Processing…' : 'Apply Adjustment'}
            </button>
          </form>
        </div>
      )}

      {/* ── Current Stock Table ─────────────── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>📋 Current Ingredient Stock</h3>
          <button className="btn btn-sm btn-black" onClick={refetchIngredients}>🔄</button>
        </div>
        {ingLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" /></div>
        ) : ingredients.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Unit</th>
                  <th style={{ textAlign: 'right' }}>Current Stock</th>
                  <th style={{ textAlign: 'right' }}>Min Stock</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((item) => {
                  const isLow = item.stock <= item.minStock
                  return (
                    <tr key={item._id} style={{ background: isLow ? '#fff3e0' : 'transparent' }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>{isLow ? '⚠️' : '✅'}</span>
                          <strong>{item.name}</strong>
                        </div>
                      </td>
                      <td>{item.unit}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: isLow ? 'var(--red)' : 'inherit' }}>{fmt(item.stock)}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(item.minStock)}</td>
                      <td style={{ textAlign: 'center' }}>
                        {isLow
                          ? <span className="badge badge-red">
                              {item.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                            </span>
                          : <span className="badge badge-green">OK</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📦</div>
            <p>No ingredients found. Add ingredients first.</p>
          </div>
        )}
      </div>
    </div>
  )
}