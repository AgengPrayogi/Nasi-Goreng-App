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

export default function FinancePage() {
  const queryClient = useQueryClient()
  const [period, setPeriod] = useState('daily')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'income', amount: '', description: '', category: 'other', reference: '' })

  const queryParams = { period }
  if (startDate) queryParams.startDate = startDate
  if (endDate) queryParams.endDate = endDate

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['finance-summary', period, startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/finance/summary', { params: queryParams })
      return res.data
    },
  })

  const { data: txData, isLoading: txLoading } = useQuery({
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

  const formatPrice = (price) => price != null ? `Rp ${Number(price).toLocaleString('id-ID')}` : '-'

  const handleToday = () => {
    const today = new Date().toISOString().split('T')[0]
    setStartDate(today)
    setEndDate(today)
  }

  const handleThisMonth = () => {
    const now = new Date()
    const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const last = now.toISOString().split('T')[0]
    setStartDate(first)
    setEndDate(last)
  }

  const handleThisYear = () => {
    const now = new Date()
    const first = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
    const last = now.toISOString().split('T')[0]
    setStartDate(first)
    setEndDate(last)
  }

  const clearFilter = () => {
    setStartDate('')
    setEndDate('')
  }

  return (
    <div>
      <div className="page-header">
        <h2 style={{ margin: 0 }}>Finance Management</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-yellow" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add Transaction'}
          </button>
        </div>
      </div>

      {/* Add Transaction Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <form onSubmit={handleSubmit}>
            <h3 style={{ color: 'var(--red)', marginBottom: '1rem' }}>New Transaction</h3>
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

      {/* Filter & Period */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '0.25rem' }}>Period</label>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              <button className={`btn btn-sm ${period === 'daily' ? 'btn-red' : 'btn-gray'}`} onClick={() => setPeriod('daily')}>Daily</button>
              <button className={`btn btn-sm ${period === 'monthly' ? 'btn-red' : 'btn-gray'}`} onClick={() => setPeriod('monthly')}>Monthly</button>
              <button className={`btn btn-sm ${period === 'yearly' ? 'btn-red' : 'btn-gray'}`} onClick={() => setPeriod('yearly')}>Yearly</button>
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

      {/* Grand Totals */}
      {summaryLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" /></div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ textAlign: 'center', borderTop: '4px solid #43a047' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Total Income</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#43a047' }}>{formatPrice(summary?.grandTotal?.totalIncome)}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{summary?.grandTotal?.incomeCount || 0} transactions</div>
            </div>
            <div className="card" style={{ textAlign: 'center', borderTop: '4px solid var(--red)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Total Expense</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--red)' }}>{formatPrice(summary?.grandTotal?.totalExpense)}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{summary?.grandTotal?.expenseCount || 0} transactions</div>
            </div>
            <div className="card" style={{ textAlign: 'center', borderTop: '4px solid var(--black)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Net Profit</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: (summary?.grandTotal?.netProfit || 0) >= 0 ? '#43a047' : 'var(--red)' }}>
                {formatPrice(summary?.grandTotal?.netProfit)}
              </div>
            </div>
            <div className="card" style={{ textAlign: 'center', borderTop: '4px solid var(--yellow)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>Period View</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--black)' }}>
                {period === 'daily' ? 'Daily' : period === 'monthly' ? 'Monthly' : 'Yearly'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{summary?.periods?.length || 0} periods</div>
            </div>
          </div>

          {/* Period Breakdown */}
          {summary?.periods?.length > 0 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--black)', marginBottom: '0.75rem' }}>
                {period === 'daily' ? 'Daily' : period === 'monthly' ? 'Monthly' : 'Yearly'} Breakdown
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
                        <td style={{ color: '#43a047', fontWeight: 'bold' }}>{formatPrice(p.totalIncome)}</td>
                        <td style={{ color: 'var(--red)', fontWeight: 'bold' }}>{formatPrice(p.totalExpense)}</td>
                        <td style={{ fontWeight: 'bold', color: p.netProfit >= 0 ? '#43a047' : 'var(--red)' }}>
                          {formatPrice(p.netProfit)}
                        </td>
                        <td>{p.incomeCount + p.expenseCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          <div className="card">
            <h3 style={{ color: 'var(--black)', marginBottom: '0.75rem' }}>Recent Transactions</h3>
            {txLoading ? (
              <div style={{ textAlign: 'center', padding: '1rem' }}><div className="spinner" /></div>
            ) : (
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
                          {tx.type === 'income' ? '+' : '-'}{formatPrice(tx.amount)}
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>{tx.reference || '-'}</td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--gray-500)' }}>No transactions found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}