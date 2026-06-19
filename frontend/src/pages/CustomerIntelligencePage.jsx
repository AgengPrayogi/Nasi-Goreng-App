import React, { useState, useEffect } from 'react';
import api from '../api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

function CustomerIntelligencePage() {
  const [rfm, setRfm] = useState(null);
  const [segments, setSegments] = useState(null);
  const [churn, setChurn] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [rfmRes, segRes, churnRes] = await Promise.all([
        api.get('/analytics/rfm-analysis'),
        api.get('/analytics/customer-segments'),
        api.get('/analytics/forecasting/customer-churn')
      ]);
      setRfm(rfmRes.data.data);
      setSegments(segRes.data.data);
      setChurn(churnRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const fmt = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

  if (loading) return <div className="card"><div className="spinner" /></div>;

  const segmentChart = rfm?.segments ? Object.entries(rfm.segments).map(([name, value]) => ({ name, value })) : [];

  return (
    <div className="space-y-6">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Customer Intelligence</h2>
        <button className="btn btn-primary btn-sm" onClick={loadData}>Refresh</button>
      </div>

      {rfm?.summary && (
        <div className="grid-4">
          <div className="card"><div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Total Analyzed</div><div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{rfm.summary.totalAnalyzed}</div></div>
          <div className="card"><div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Avg Recency</div><div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{rfm.summary.averageRecency} hari</div></div>
          <div className="card"><div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Avg Frequency</div><div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{rfm.summary.averageFrequency}</div></div>
          <div className="card"><div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Avg Monetary</div><div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{fmt(rfm.summary.averageMonetary)}</div></div>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <h3>RFM Segment Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={segmentChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {segmentChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3>Churn Risk ({churn?.atRiskCustomers?.length || 0} customers)</h3>
          <table className="table">
            <thead><tr><th>Nama</th><th>Last Order</th><th>Total Spent</th><th>Risk</th></tr></thead>
            <tbody>
              {(churn?.atRiskCustomers || []).slice(0, 10).map((c) => (
                <tr key={c.customerId}>
                  <td>{c.name}</td>
                  <td>{c.daysSinceLastOrder} hari lalu</td>
                  <td>{fmt(c.totalSpent)}</td>
                  <td><span style={{ color: c.churnProbability > 50 ? 'var(--red)' : 'orange' }}>{Math.round(c.churnProbability)}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Top RFM Customers</h3>
        <table className="table">
          <thead><tr><th>Nama</th><th>Tier</th><th>Segment</th><th>Recency</th><th>Frequency</th><th>Monetary</th><th>RFM Score</th></tr></thead>
          <tbody>
            {(rfm?.customers || []).slice(0, 15).map((c) => (
              <tr key={c.customerId}>
                <td>{c.name}</td><td>{c.tier}</td><td>{c.segment}</td>
                <td>{c.recency}d</td><td>{c.frequency}</td><td>{fmt(c.monetary)}</td><td>{c.rfmTotal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CustomerIntelligencePage;
