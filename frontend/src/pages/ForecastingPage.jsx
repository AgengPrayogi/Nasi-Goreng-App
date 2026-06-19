import React, { useState, useEffect } from 'react';
import api from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

function ForecastingPage() {
  const [demand, setDemand] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [opportunities, setOpportunities] = useState(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [days]);

  async function loadData() {
    setLoading(true);
    try {
      const [demandRes, revenueRes, invRes, oppRes] = await Promise.all([
        api.get(`/analytics/forecasting/demand?days=${days}`),
        api.get(`/analytics/forecasting/revenue?days=${days}`),
        api.get('/analytics/forecasting/inventory'),
        api.get('/analytics/forecasting/opportunities')
      ]);
      setDemand(demandRes.data.data);
      setRevenue(revenueRes.data.data);
      setInventory(invRes.data.data);
      setOpportunities(oppRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const fmt = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

  if (loading) return <div className="card"><div className="spinner" /></div>;

  const demandChart = (demand?.data || []).map((d) => ({
    date: new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    predicted: d.predictedValue,
    lower: d.lowerBound,
    upper: d.upperBound
  }));

  const revenueChart = (revenue?.data || []).map((d) => ({
    date: new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    predicted: d.predictedValue
  }));

  return (
    <div className="space-y-6">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Predictive Analytics & Forecasting</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[7, 14, 30].map((d) => (
            <button key={d} className={`btn btn-sm ${days === d ? 'btn-primary' : ''}`} onClick={() => setDays(d)}>{d} Hari</button>
          ))}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Demand Forecast (Orders)</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Akurasi model: {demand?.accuracy || 0}% | {demand?.modelVersion}</p>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={demandChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="upper" stackId="1" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.2} />
              <Area type="monotone" dataKey="predicted" stackId="2" stroke="#0088FE" fill="#0088FE" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3>Revenue Forecast</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Akurasi: {revenue?.accuracy || 0}%</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(v) => fmt(v)} />
              <Line type="monotone" dataKey="predicted" stroke="#FF8042" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Inventory Prediction (Reorder)</h3>
          <table className="table">
            <thead><tr><th>Bahan</th><th>Stok</th><th>Predicted Need</th><th>Days Left</th></tr></thead>
            <tbody>
              {(inventory?.predictions || inventory?.items || []).slice(0, 10).map((i, idx) => (
                <tr key={i.ingredientId || idx}>
                  <td>{i.name || i.ingredientName}</td>
                  <td>{i.currentStock} {i.unit}</td>
                  <td>{i.suggestedReorder || i.predictedNeed || '-'}</td>
                  <td>{i.daysUntilStockout ?? i.daysLeft ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3>Upsell Opportunities</h3>
          {(Array.isArray(opportunities) ? opportunities : []).slice(0, 8).map((o, idx) => (
            <div key={idx} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--gray-200)' }}>
              <strong>{o.name}</strong>
              <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>{o.recommendation} — potential {fmt(o.potentialUpsell)}</div>
            </div>
          ))}
          {(!opportunities || opportunities.length === 0) && (
            <p style={{ color: 'var(--gray-500)' }}>Belum cukup data untuk rekomendasi upsell.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForecastingPage;
