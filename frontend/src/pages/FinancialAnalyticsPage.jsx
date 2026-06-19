import React, { useState, useEffect } from 'react';
import api from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

function FinancialAnalyticsPage() {
  const [profitability, setProfitability] = useState(null);
  const [costAnalysis, setCostAnalysis] = useState(null);
  const [cashFlow, setCashFlow] = useState(null);
  const [budget, setBudget] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const now = new Date();
      const [profRes, costRes, cfRes, bvaRes, listRes] = await Promise.all([
        api.get('/analytics/profitability-summary'),
        api.get('/analytics/cost-analysis'),
        api.get('/analytics/cash-flow'),
        api.get(`/analytics/budget-vs-actual?year=${now.getFullYear()}&month=${now.getMonth() + 1}`),
        api.get('/budget')
      ]);
      setProfitability(profRes.data.data);
      setCostAnalysis(costRes.data.data);
      setCashFlow(cfRes.data.data);
      setBudget(bvaRes.data.data);
      setBudgets(listRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const fmt = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

  if (loading) return <div className="card"><div className="spinner" /></div>;

  const cashFlowChart = (cashFlow?.cashFlow || []).map((c) => ({
    period: c.period,
    cashIn: c.cashIn,
    cashOut: c.cashOut,
    net: c.netCashFlow
  }));

  return (
    <div className="space-y-6">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Financial Intelligence</h2>
        <button className="btn btn-primary btn-sm" onClick={loadData}>Refresh</button>
      </div>

      {profitability && (
        <div className="grid-4">
          <div className="card"><div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Revenue</div><div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{fmt(profitability.revenue)}</div></div>
          <div className="card"><div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Gross Profit</div><div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{fmt(profitability.grossProfit)}</div></div>
          <div className="card"><div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Gross Margin</div><div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{profitability.grossMarginPercent}%</div></div>
          <div className="card"><div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Food Cost %</div><div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{profitability.foodCostPercent}%</div></div>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <h3>Cash Flow</h3>
          {cashFlow?.summary && (
            <div style={{ marginBottom: '1rem' }}>
              <div>Cash In: <strong>{fmt(cashFlow.summary.totalCashIn)}</strong></div>
              <div>Cash Out: <strong>{fmt(cashFlow.summary.totalCashOut)}</strong></div>
              <div>Net: <strong style={{ color: cashFlow.summary.netCashFlow >= 0 ? 'green' : 'var(--red)' }}>{fmt(cashFlow.summary.netCashFlow)}</strong></div>
            </div>
          )}
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cashFlowChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip formatter={(v) => fmt(v)} />
              <Bar dataKey="cashIn" fill="#00C49F" name="Cash In" />
              <Bar dataKey="cashOut" fill="#FF8042" name="Cash Out" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3>Cost Analysis</h3>
          {costAnalysis && (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <div>Variable (COGS): <strong>{fmt(costAnalysis.variableCosts?.cogs)}</strong></div>
                <div>Cost per Order: <strong>{fmt(costAnalysis.variableCosts?.costPerOrder)}</strong></div>
                <div>Fixed Costs: <strong>{fmt(costAnalysis.fixedCosts?.total)}</strong></div>
                <div>Total Costs: <strong>{fmt(costAnalysis.totalCosts)}</strong></div>
              </div>
              <h4>Fixed by Category</h4>
              {(costAnalysis.fixedCosts?.byCategory || []).map((c) => (
                <div key={c.category} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                  <span>{c.category}</span><span>{fmt(c.total)}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Budget vs Actual ({budget?.period?.month}/{budget?.period?.year})</h3>
        {budget?.budget ? (
          <table className="table">
            <thead><tr><th>Category</th><th>Item</th><th>Budgeted</th><th>Actual</th><th>Variance</th><th>%</th></tr></thead>
            <tbody>
              {(budget.variance || []).map((v, i) => (
                <tr key={i}>
                  <td>{v.category}</td><td>{v.name}</td>
                  <td>{fmt(v.budgeted)}</td><td>{fmt(v.actual)}</td>
                  <td style={{ color: v.variance < 0 ? 'var(--red)' : 'green' }}>{fmt(v.variance)}</td>
                  <td>{v.variancePercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: 'var(--gray-500)' }}>{budget?.message || 'Belum ada budget untuk periode ini.'}</p>
        )}
        {budgets.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h4>Budget History</h4>
            {budgets.slice(0, 5).map((b) => (
              <div key={b._id}>{b.name} — {b.period.month}/{b.period.year} ({b.status}) — {fmt(b.totalBudgeted)}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FinancialAnalyticsPage;
