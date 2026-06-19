import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api.js'

const CATEGORY_LABELS = {
  order_payment: 'Order Payment',
  restock: 'Restock',
  operational: 'Operational',
  salary: 'Salary',
  utilities: 'Utilities',
  maintenance: 'Maintenance',
  marketing: 'Marketing',
  withdraw: 'Withdraw',
  other: 'Other',
}

const PERIOD_LABELS = { daily: 'Daily', monthly: 'Monthly', yearly: 'Yearly' }

export default function FinancePage() {
  const queryClient = useQueryClient()
  const [period, setPeriod] = useState('daily')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'income', amount: '', description: '', category: 'other', reference: '' })
  const [error, setError] = useState('')

  const queryParams = { period }
  if (startDate) queryParams.startDate = startDate
  if (endDate) queryParams.endDate = endDate

  const { data: summaryData, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['finance-summary', period, startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/finance/summary', { params: queryParams })
      return res.data
    },
  })

  const { data: txData, isLoading: txLoading, refetch: refetchTx } = useQuery({
    queryKey: ['finance-transactions', startDate, endDate],
    queryFn: async () => {
      const params = { limit: 100 }
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      const res = await api.get('/finance', { params })
      return res.data
    },
  })

  const createTx = useMutation({
    mutationFn: (body) => api.post('/finance', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] })
      setShowForm(false)
      setForm({ type: 'income', amount: '', description: '', category: 'other', reference: '' })
    },
    onError: () => setError('Gagal menyimpan transaksi'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    createTx.mutate({
      ...form,
      amount: Number(form.amount),
      date: new Date().toISOString(),
    })
  }

  const summary = summaryData?.data
  const transactions = txData?.data || []

  const fmt = (v) => v != null ? `Rp ${Number(v).toLocaleString('id-ID')}` : '-'

  const handleToday = () => {
    const today = new Date().toISOString().split('T')[0]
    setStartDate(today); setEndDate(today)
  }
  const handleThisMonth = () => {
    const now = new Date()
    const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    setStartDate(first); setEndDate(now.toISOString().split('T')[0])
  }
  const handleThisYear = () => {
    const now = new Date()
    const first = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
    setStartDate(first); setEndDate(now.toISOString().split('T')[0])
  }
  const clearFilter = () => { setStartDate(''); setEndDate('') }

  /* ── Loading ─────────────────────────────── */
  if (summaryLoading && !summary) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px', margin: '0 auto' }} />
          <p style={{ color: 'var(--gray-500)', marginTop: '1rem' }}>Memuat data keuangan…</p>
        </div>
      </div>
    )
  }

  /* ── Error ───────────────────────────────── */
  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="card" style={{ border: '2px solid var(--red)', padding: '2rem', display: 'inline-block' }}>
          <p style={{ color: 'var(--red)', fontWeight: 'bold' }}>{error}</p>
          <button className="btn btn-red" onClick={() => { setError(''); refetchSummary(); refetchTx(); }} style={{ marginTop: '0.5rem' }}>🔄 Coba Lagi</button>
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
            💰 Finance Management
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
            {PERIOD_LABELS[period]} · {startDate && endDate ? `${startDate} s/d ${endDate}` : 'All time'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button className="btn btn-yellow btn-sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add Transaction'}
          </button>
          <button className="btn btn-sm btn-black" onClick={() => { refetchSummary(); refetchTx(); }}>🔄</button>
        </div>
      </div>

      {/* ── Add Transaction Form ─────────────── */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem', animation: 'fadeInUp 0.35s ease' }}>
          <h3 style={{ color: 'var(--red)', marginBottom: '1rem' }}>New Transaction</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label>Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="income">Income (Uang Masuk)</option>
                  <option value="expense">Expense (Uang Keluar)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Amount</label>
                <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required min="0" placeholder="100000" />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required placeholder="e.g. Daily sales" />
              </div>
              <div className="form-group">
                <label>Reference (optional)</label>
                <input type="text" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Invoice / note" />
              </div>
            </div>
            <button type="submit" className="btn btn-red" disabled={createTx.isPending}>
              {createTx.isPending ? 'Saving...' : 'Save Transaction'}
            </button>
          </form>
        </div>
      )}

      {/* ── Filter & Period ──────────────────── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>Period</label>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {['daily', 'monthly', 'yearly'].map((p) => (
                <button key={p} className={`btn btn-sm ${period === p ? 'btn-red' : 'btn-gray'}`} onClick={() => setPeriod(p)}>
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>From</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>To</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'end' }}>
            <button className="btn btn-gray btn-sm" onClick={handleToday}>Today</button>
            <button className="btn btn-gray btn-sm" onClick={handleThisMonth}>This Month</button>
            <button className="btn btn-gray btn-sm" onClick={handleThisYear}>This Year</button>
            <button className="btn btn-gray btn-sm" onClick={clearFilter}>Clear</button>
          </div>
        </div>
      </div>

      {summaryLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" /></div>
      ) : (
        <>
          {/* ── Grand Total Cards ─────────────── */}
          <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
            <div className="card card-accent-green" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem' }}>📥</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>Total Income</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#43a047' }}>{fmt(summary?.grandTotal?.totalIncome)}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{summary?.grandTotal?.incomeCount || 0} tx</div>
            </div>
            <div className="card card-accent-red" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem' }}>📤</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>Total Expense</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--red)' }}>{fmt(summary?.grandTotal?.totalExpense)}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{summary?.grandTotal?.expenseCount || 0} tx</div>
            </div>
            <div className="card card-accent-black" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem' }}>💎</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>Net Profit</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: (summary?.grandTotal?.netProfit || 0) >= 0 ? '#43a047' : 'var(--red)' }}>
                {fmt(summary?.grandTotal?.netProfit)}
              </div>
            </div>
            <div className="card card-accent-yellow" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem' }}>📊</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>Period View</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--black)' }}>{PERIOD_LABELS[period] || period}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{summary?.periods?.length || 0} periods</div>
            </div>
          </div>

          {/* ── Period Breakdown ──────────────── */}
          {summary?.periods?.length > 0 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--black)', marginBottom: '0.75rem' }}>
                {PERIOD_LABELS[period] || period} Breakdown
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Income</th>
                      <th>Expense</th>
                      <th>Net Profit</th>
                      <th>Transactions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.periods.map((p) => (
                      <tr key={p.period}>
                        <td><strong>{p.period}</strong></td>
                        <td style={{ color: '#43a047', fontWeight: 'bold' }}>{fmt(p.totalIncome)}</td>
                        <td style={{ color: 'var(--red)', fontWeight: 'bold' }}>{fmt(p.totalExpense)}</td>
                        <td style={{ fontWeight: 'bold', color: p.netProfit >= 0 ? '#43a047' : 'var(--red)' }}>
                          {fmt(p.netProfit)}
                        </td>
                        <td>{p.incomeCount + p.expenseCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Recent Transactions ───────────── */}
          {txLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" /></div>
          ) : (
            <div className="card">
              <h3 style={{ color: 'var(--black)', marginBottom: '0.75rem' }}>Recent Transactions</h3>
              {transactions.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx._id}>
                          <td style={{ fontSize: '0.85rem' }}>{new Date(tx.date).toLocaleDateString('id-ID')}</td>
                          <td>
                            <span className={`badge ${tx.type === 'income' ? 'badge-green' : 'badge-red'}`}>
                              {tx.type === 'income' ? 'Income' : 'Expense'}
                            </span>
                          </td>
                          <td>{CATEGORY_LABELS[tx.category] || tx.category}</td>
                          <td>{tx.description}</td>
                          <td style={{ fontWeight: 'bold', color: tx.type === 'income' ? '#43a047' : 'var(--red)' }}>
                            {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>{tx.reference || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: 'var(--gray-500)', textAlign: 'center', padding: '2rem' }}>No transactions found for the selected period.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}