import React, { useState, useEffect } from 'react';
import api from '../api';

function InventoryAnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [reorder, setReorder] = useState([]);
  const [aging, setAging] = useState([]);
  const [waste, setWaste] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [ovRes, reRes, agRes, waRes, supRes] = await Promise.all([
        api.get('/analytics/inventory/overview'),
        api.get('/analytics/reorder-recommendations'),
        api.get('/analytics/inventory-aging'),
        api.get('/analytics/waste-analysis'),
        api.get('/analytics/supplier-performance')
      ]);
      setOverview(ovRes.data.data);
      setReorder(reRes.data.data || []);
      setAging(agRes.data.data || []);
      setWaste(waRes.data.data);
      setSuppliers(supRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const fmt = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

  if (loading) return <div className="card"><div className="spinner" /></div>;

  return (
    <div className="space-y-6">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Inventory & Supply Chain Intelligence</h2>
        <button className="btn btn-primary btn-sm" onClick={loadData}>Refresh</button>
      </div>

      {overview && (
        <div className="grid-4">
          <div className="card"><div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Total Items</div><div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{overview.totalItems}</div></div>
          <div className="card"><div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Inventory Value</div><div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{fmt(overview.totalInventoryValue)}</div></div>
          <div className="card"><div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Low Stock</div><div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--red)' }}>{overview.lowStockCount}</div></div>
          <div className="card"><div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Overstock</div><div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{overview.overstockCount}</div></div>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <h3>Reorder Recommendations</h3>
          <table className="table">
            <thead><tr><th>Bahan</th><th>Stok</th><th>Days Left</th><th>Suggested Qty</th><th>Urgency</th></tr></thead>
            <tbody>
              {reorder.slice(0, 12).map((r) => (
                <tr key={r.ingredientId}>
                  <td>{r.name}</td><td>{r.currentStock} {r.unit}</td>
                  <td>{r.daysOfStockLeft ?? '-'}</td><td>{r.suggestedReorderQty}</td>
                  <td><span style={{ color: r.urgency === 'critical' ? 'var(--red)' : r.urgency === 'high' ? 'orange' : 'inherit' }}>{r.urgency}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3>Inventory Aging</h3>
          <table className="table">
            <thead><tr><th>Bahan</th><th>Stok</th><th>Age (days)</th><th>Category</th></tr></thead>
            <tbody>
              {aging.slice(0, 12).map((a) => (
                <tr key={a.ingredientId}>
                  <td>{a.name}</td><td>{a.currentStock} {a.unit}</td><td>{a.ageDays}</td>
                  <td>{a.agingCategory}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Waste Analysis</h3>
          {waste && (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <div>Total Incidents: <strong>{waste.totalIncidents}</strong></div>
                <div>Total Waste Value: <strong>{fmt(waste.totalWasteValue)}</strong></div>
              </div>
              <table className="table">
                <thead><tr><th>Bahan</th><th>Qty</th><th>Value</th></tr></thead>
                <tbody>
                  {(waste.items || []).slice(0, 8).map((i) => (
                    <tr key={i.ingredientId}><td>{i.name}</td><td>{i.totalWaste}</td><td>{fmt(i.wasteValue)}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
        <div className="card">
          <h3>Supplier Performance</h3>
          <table className="table">
            <thead><tr><th>Supplier</th><th>On-Time %</th><th>Reliability</th><th>Total Spent</th></tr></thead>
            <tbody>
              {suppliers.slice(0, 8).map((s) => (
                <tr key={s.supplier._id}>
                  <td>{s.supplier.name}</td>
                  <td>{s.metrics.onTimeDeliveryRate}%</td>
                  <td>{s.metrics.reliabilityScore}/100</td>
                  <td>{fmt(s.metrics.totalSpent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default InventoryAnalyticsPage;
