import React, { useState, useEffect } from 'react';
import api from '../api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

function CustomerIntelligencePage() {
  const [rfm, setRfm] = useState(null);
  const [segments, setSegments] = useState(null);
  const [churn, setChurn] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticket, setTicket] = useState({ customerId: '', subject: '', description: '', category: 'feedback', priority: 'normal' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [rfmRes, segRes, churnRes, dashboardRes, ticketsRes, customersRes] = await Promise.all([
        api.get('/analytics/rfm-analysis'),
        api.get('/analytics/customer-segments'),
        api.get('/analytics/forecasting/customer-churn'),
        api.get('/customers/crm-dashboard'),
        api.get('/customers/support-tickets?status=open'),
        api.get('/customers?limit=100')
      ]);
      setRfm(rfmRes.data.data);
      setSegments(segRes.data.data);
      setChurn(churnRes.data.data);
      setDashboard(dashboardRes.data.data);
      setTickets(ticketsRes.data.data || []);
      setCustomers(customersRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function createTicket(e) {
    e.preventDefault();
    try {
      await api.post('/customers/support-tickets', ticket);
      setTicket({ customerId: '', subject: '', description: '', category: 'feedback', priority: 'normal' });
      setShowTicketForm(false);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  }

  const fmt = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

  if (loading) return <div className="card"><div className="spinner" /></div>;

  const segmentChart = rfm?.segments ? Object.entries(rfm.segments).map(([name, value]) => ({ name, value })) : [];

  return (
    <div className="space-y-6">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Customer Intelligence</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowTicketForm(!showTicketForm)}>{showTicketForm ? 'Cancel' : 'New Support Ticket'}</button>
          <button className="btn btn-secondary btn-sm" onClick={loadData}>Refresh</button>
        </div>
      </div>

      {dashboard?.summary && (
        <div className="grid-4">
          <div className="card"><div className="muted">Active Customers</div><div className="metric">{dashboard.summary.customers}</div><small>{dashboard.summary.totalOrders} completed orders</small></div>
          <div className="card"><div className="muted">Customer Value</div><div className="metric">{fmt(dashboard.summary.totalSpent)}</div><small>Avg {fmt(dashboard.summary.averageValue)} / customer</small></div>
          <div className="card"><div className="muted">Open Support</div><div className="metric">{dashboard.supportOpen}</div><small>Prioritize urgent reports</small></div>
          <div className="card"><div className="muted">Active Automations</div><div className="metric">{dashboard.activeAutomations}</div><small>Segment triggers running</small></div>
        </div>
      )}

      {showTicketForm && (
        <div className="card">
          <h3>Log Customer Issue</h3>
          <form onSubmit={createTicket} style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <select required value={ticket.customerId} onChange={(e) => setTicket({ ...ticket, customerId: e.target.value })}>
              <option value="">Select customer</option>
              {customers.map((customer) => <option key={customer._id} value={customer._id}>{customer.name || customer.phone} - {customer.audienceSegment || 'individual'}</option>)}
            </select>
            <input required placeholder="Subject" value={ticket.subject} onChange={(e) => setTicket({ ...ticket, subject: e.target.value })} />
            <textarea required placeholder="Describe the issue or feedback" value={ticket.description} onChange={(e) => setTicket({ ...ticket, description: e.target.value })} style={{ gridColumn: '1 / -1', minHeight: 90 }} />
            <select value={ticket.category} onChange={(e) => setTicket({ ...ticket, category: e.target.value })}><option value="feedback">Feedback</option><option value="complaint">Complaint</option><option value="order">Order</option><option value="payment">Payment</option><option value="delivery">Delivery</option><option value="product">Product</option></select>
            <select value={ticket.priority} onChange={(e) => setTicket({ ...ticket, priority: e.target.value })}><option value="normal">Normal</option><option value="low">Low</option><option value="high">High</option><option value="urgent">Urgent</option></select>
            <button className="btn btn-primary" type="submit" style={{ gridColumn: '1 / -1' }}>Save Support History</button>
          </form>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <h3>Audience Segments</h3>
          {(dashboard?.segments || []).map((segment) => (
            <div key={segment._id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--gray-200)', padding: '0.7rem 0' }}>
              <span style={{ fontWeight: 600 }}>{(segment._id || 'individual').replace('_', ' ')}</span>
              <span>{segment.customers} customers · {fmt(segment.spent)}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Support Queue</h3>
          {tickets.length === 0 ? <p className="muted">No open customer issues.</p> : tickets.slice(0, 6).map((item) => (
            <div key={item._id} style={{ borderBottom: '1px solid var(--gray-200)', padding: '0.6rem 0' }}>
              <strong>{item.subject}</strong><div className="muted">{item.customerId?.name || 'Customer'} · {item.priority} · {item.category}</div>
            </div>
          ))}
        </div>
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
