import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api.js'

export default function StockMovementsPage() {
  const queryClient = useQueryClient()
  const [showRestock, setShowRestock] = useState(false)
  const [showAdjustment, setShowAdjustment] = useState(false)
  const [restockForm, setRestockForm] = useState({ ingredientId: '', quantity: 0, notes: '' })
  const [adjForm, setAdjForm] = useState({ ingredientId: '', quantity: 0, reason: '', notes: '' })

  const { data: ingredientsData } = useQuery({
    queryKey: ['ingredients'],
    queryFn: async () => { const res = await api.get('/ingredients'); return res.data },
  })
  const ingredients = ingredientsData?.data || []

  const restockMutation = useMutation({
    mutationFn: (body) => api.post('/stock-movements/restock', body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ingredients'] }); setShowRestock(false); setRestockForm({ ingredientId: '', quantity: 0, notes: '' }) },
  })

  const adjustmentMutation = useMutation({
    mutationFn: (body) => api.post('/stock-movements/adjustment', body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ingredients'] }); setShowAdjustment(false); setAdjForm({ ingredientId: '', quantity: 0, reason: '', notes: '' }) },
  })

  const handleRestockSubmit = (e) => { e.preventDefault(); restockMutation.mutate({ ...restockForm, quantity: Number(restockForm.quantity) }) }
  const handleAdjustmentSubmit = (e) => { e.preventDefault(); adjustmentMutation.mutate({ ...adjForm, quantity: Number(adjForm.quantity) }) }

  const selectedIngredientRestock = ingredients.find((i) => i._id === restockForm.ingredientId)
  const selectedIngredientAdj = ingredients.find((i) => i._id === adjForm.ingredientId)

  return (
    <div>
      <div className="page-header">
        <h2 style={{ margin: 0 }}>Stock Movements</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-yellow" onClick={() => { setShowRestock(!showRestock); setShowAdjustment(false) }}>
            {showRestock ? 'Cancel' : 'Restock'}
          </button>
          <button className="btn btn-red" onClick={() => { setShowAdjustment(!showAdjustment); setShowRestock(false) }}>
            {showAdjustment ? 'Cancel' : 'Adjustment'}
          </button>
        </div>
      </div>

      {showRestock && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <form onSubmit={handleRestockSubmit}>
            <h3 style={{ color: 'var(--yellow-dark)' }}>Restock Ingredient</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label>Ingredient</label>
                <select value={restockForm.ingredientId} onChange={(e) => setRestockForm({ ...restockForm, ingredientId: e.target.value })} required>
                  <option value="">Select</option>
                  {ingredients.map((i) => <option key={i._id} value={i._id}>{i.name} ({i.stock} {i.unit})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Quantity to Add</label>
                <input type="number" value={restockForm.quantity} onChange={(e) => setRestockForm({ ...restockForm, quantity: e.target.value })} required min="1" />
              </div>
              <div className="form-group">
                <label>Notes (optional)</label>
                <input type="text" value={restockForm.notes} onChange={(e) => setRestockForm({ ...restockForm, notes: e.target.value })} />
              </div>
            </div>
            {selectedIngredientRestock && <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: '0.75rem' }}>After: {selectedIngredientRestock.stock + Number(restockForm.quantity || 0)} {selectedIngredientRestock.unit}</p>}
            <button type="submit" className="btn btn-yellow" disabled={restockMutation.isPending}>Restock</button>
          </form>
        </div>
      )}

      {showAdjustment && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <form onSubmit={handleAdjustmentSubmit}>
            <h3 style={{ color: 'var(--red)' }}>Stock Adjustment</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label>Ingredient</label>
                <select value={adjForm.ingredientId} onChange={(e) => setAdjForm({ ...adjForm, ingredientId: e.target.value })} required>
                  <option value="">Select</option>
                  {ingredients.map((i) => <option key={i._id} value={i._id}>{i.name} ({i.stock} {i.unit})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Quantity (use - for deduction)</label>
                <input type="number" value={adjForm.quantity} onChange={(e) => setAdjForm({ ...adjForm, quantity: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Reason</label>
                <input type="text" value={adjForm.reason} onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Notes (optional)</label>
                <input type="text" value={adjForm.notes} onChange={(e) => setAdjForm({ ...adjForm, notes: e.target.value })} />
              </div>
            </div>
            {selectedIngredientAdj && <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: '0.75rem' }}>After: {selectedIngredientAdj.stock + Number(adjForm.quantity || 0)} {selectedIngredientAdj.unit}</p>}
            <button type="submit" className="btn btn-red" disabled={adjustmentMutation.isPending}>Apply Adjustment</button>
          </form>
        </div>
      )}
    </div>
  )
}