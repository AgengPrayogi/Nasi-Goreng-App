import React, { useState, useEffect } from 'react';
import api from '../api';

function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [discount, setDiscount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', type: 'promotion',
    startDate: '', endDate: '', budget: 0,
    discountConfig: { type: 'percentage', value: 10, minOrderAmount: 0 }
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [campRes, perfRes, discRes] = await Promise.all([
        api.get('/campaigns'),
        api.get('/analytics/campaign-performance'),
        api.get('/analytics/discount-analysis')
      ]);
      setCampaigns(campRes.data.data || []);
      setPerformance(perfRes.data.data || []);
      setDiscount(discRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await api.post('/campaigns', {
        ...form,
        startDate: new Date(form.startDate),
        endDate: new Date(form.endDate),
        status: 'draft'
      });
      setShowForm(false);
      setForm({ name: '', description: '', type: 'promotion', startDate: '', endDate: '', budget: 0, discountConfig: { type: 'percentage', value: 10, minOrderAmount: 0 } });
      loadData();
    } catch (err) {
      console.error(err);
    }
  }

  const fmt = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

  if (loading) return <div className="card"><div className="spinner" /></div>;

  return (
    <div className="space-y-6">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Promotion & Campaign Analytics</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>{showForm ? 'Batal' : '+ Campaign Baru'}</button>
      </div>

      {discount?.summary && (
        <div className="grid-4">
          <div className="card"><div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Total Discount</div><div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{fmt(discount.summary.totalDiscountSpent)}</div></div>
          <div className="card"><div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Discount Dependency</div><div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{discount.summary.discountDependency}%</div></div>
          <div className="card"><div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Discounted Orders</div><div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{discount.summary.discountedOrders}</div></div>
          <div className="card"><div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Avg Discount/Order</div><div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{fmt(discount.summary.avgDiscountPerOrder)}</div></div>
        </div>
      )}

      {showForm && (
        <div className="card">
          <h3>Buat Campaign</h3>
          <form onSubmit={handleCreate} style={{ display: 'grid', gap: '1rem', maxWidth: '500px' }}>
            <div className="form-group"><label>Nama</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="form-group"><label>Deskripsi</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group"><label>Start Date</label><input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
              <div className="form-group"><label>End Date</label><input type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>Budget</label><input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} /></div>
            <button type="submit" className="btn btn-primary">Simpan Campaign</button>
          </form>
        </div>
      )}

      {discount?.recommendations?.length > 0 && (
        <div className="card">
          <h3>Rekomendasi Diskon</h3>
          {discount.recommendations.map((r, i) => (
            <div key={i} style={{ padding: '0.5rem', marginBottom: '0.5rem', background: r.type === 'warning' ? '#fff3cd' : r.type === 'positive' ? '#d4edda' : '#e7f3ff', borderRadius: '4px' }}>
              {r.message}
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3>Campaign Performance</h3>
        <table className="table">
          <thead><tr><th>Nama</th><th>Status</th><th>Redemptions</th><th>Revenue</th><th>Cost</th><th>ROI</th><th>Conversion</th></tr></thead>
          <tbody>
            {performance.map((c) => (
              <tr key={c.campaignId}>
                <td>{c.name}</td><td>{c.status}</td>
                <td>{c.metrics.redemptions}</td><td>{fmt(c.metrics.revenueGenerated)}</td>
                <td>{fmt(c.metrics.costIncurred)}</td>
                <td>{c.metrics.roi}%</td><td>{c.metrics.conversionRate}%</td>
              </tr>
            ))}
            {performance.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--gray-500)' }}>Belum ada campaign</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>All Campaigns</h3>
        <table className="table">
          <thead><tr><th>Nama</th><th>Type</th><th>Status</th><th>Period</th><th>Budget</th></tr></thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c._id}>
                <td>{c.name}</td><td>{c.type}</td><td>{c.status}</td>
                <td>{new Date(c.startDate).toLocaleDateString('id-ID')} - {new Date(c.endDate).toLocaleDateString('id-ID')}</td>
                <td>{fmt(c.budget)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CampaignsPage;
