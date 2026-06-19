import React, { useState, useEffect } from 'react';
import api from '../api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('7d');

  useEffect(() => { loadData(); }, [period]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/analytics/dashboard?period=${period}`);
      setData(res.data.data);
    } catch (err) {
      setError('Gagal memuat data analytics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const fmt = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

  /* ── Loading ─────────────────────────────── */
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px', margin: '0 auto' }} />
          <p style={{ color: 'var(--gray-500)', marginTop: '1rem' }}>Memuat data analytics…</p>
        </div>
      </div>
    );
  }

  /* ── Error ───────────────────────────────── */
  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="card" style={{ border: '2px solid var(--red)', padding: '2rem', display: 'inline-block' }}>
          <p style={{ color: 'var(--red)', fontWeight: 'bold' }}>{error}</p>
          <button className="btn btn-red" onClick={loadData} style={{ marginTop: '0.5rem' }}>🔄 Coba Lagi</button>
        </div>
      </div>
    );
  }

  const kpi         = data?.kpi || {};
  const hourly      = data?.hourlyDistribution?.data || [];
  const payment     = data?.paymentBreakdown?.data || [];
  const topMenus    = data?.topMenus || [];
  const kitchen     = data?.kitchenEfficiency?.summary || {};
  const segments    = data?.customerSegment?.data || [];
  const lowStock    = data?.lowStock || [];
  const trends      = data?.trends?.data || [];

  /* ── Page header ─────────────────────────── */
  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ animation: 'fadeInDown 0.4s ease' }}>
        <div>
          <h2 style={{ margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📊 Business Intelligence
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
            Analytics & insights · {period === '7d' ? '7 hari' : period === '30d' ? '30 hari' : '90 hari'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {['7d', '30d', '90d'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`btn btn-sm ${period === p ? 'btn-red' : 'btn-gray'}`}
            >
              {p === '7d' ? '7 Hari' : p === '30d' ? '30 Hari' : '90 Hari'}
            </button>
          ))}
          <button className="btn btn-sm btn-black" onClick={loadData} style={{ marginLeft: '0.3rem' }}>🔄</button>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────── */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="card card-accent-red" style={{
          textAlign: 'center', animation: 'fadeInUp 0.4s ease 0.05s both',
        }}>
          <div style={{ fontSize: '2rem' }}>💰</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>Revenue Hari Ini</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#43a047' }}>{fmt(kpi.revenue)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Diskon: {fmt(kpi.discount)}</div>
        </div>

        <div className="card card-accent-black" style={{
          textAlign: 'center', animation: 'fadeInUp 0.4s ease 0.1s both',
        }}>
          <div style={{ fontSize: '2rem' }}>📋</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>Total Order</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{kpi.orderCount || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#43a047' }}>Avg {fmt(kpi.avgOrderValue)}</div>
        </div>

        <div className="card card-accent-green" style={{
          textAlign: 'center', animation: 'fadeInUp 0.4s ease 0.15s both',
        }}>
          <div style={{ fontSize: '2rem' }}>✅</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>Payment Success</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{kpi.paymentSuccessRate || 0}%</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Kuota: {kpi.activeKitchenOrders || 0} order</div>
        </div>

        <div className="card card-accent-yellow" style={{
          textAlign: 'center', animation: 'fadeInUp 0.4s ease 0.2s both',
        }}>
          <div style={{ fontSize: '2rem' }}>⏱️</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>Kitchen Avg Time</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{kitchen.avgPrepTimeMinutes || 0}<span style={{ fontSize: '1rem' }}> mnt</span></div>
          <div style={{ fontSize: '0.75rem', color: '#43a047' }}>On-time: {kitchen.onTimeRate || 0}%</div>
        </div>
      </div>

      {/* ── Hourly Distribution ──────────────── */}
      {hourly.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', animation: 'fadeInUp 0.4s ease 0.25s both' }}>
          <h3 style={{ marginBottom: '1rem' }}>⏰ Distribusi Jam Sibuk</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={hourly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--gray-200)' }} />
              <Bar dataKey="orders" fill="#FF8042" name="Pesanan" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Payment Breakdown & Top Menus ────── */}
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        {payment.length > 0 && (
          <div className="card" style={{ animation: 'fadeInUp 0.4s ease 0.3s both' }}>
            <h3 style={{ marginBottom: '1rem' }}>💳 Metode Pembayaran</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={payment}
                  dataKey="amount"
                  nameKey="method"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ method, amount, percent }) =>
                    `${method === 'cash' ? 'Tunai' : method === 'transfer' ? 'Transfer' : method === 'qris_static' ? 'QRIS' : method}: ${Math.round((percent || 0) * 100)}%`
                  }
                >
                  {payment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="card card-accent-red" style={{ animation: 'fadeInUp 0.4s ease 0.35s both' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--red-dark)' }}>🏆 Top 10 Menu (Profit)</h3>
          {topMenus.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Menu</th>
                    <th>Qty Terjual</th>
                    <th>Revenue</th>
                    <th>Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {topMenus.slice(0, 10).map((m, i) => (
                    <tr key={m.menuId || i}>
                      <td><strong>{m.name}</strong></td>
                      <td>{m.quantity}</td>
                      <td style={{ fontWeight: 'bold' }}>{fmt(m.revenue)}</td>
                      <td>
                        <span style={{ color: (m.profit || 0) >= 0 ? '#43a047' : 'var(--red)', fontWeight: 'bold' }}>
                          {fmt(m.profit)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--gray-500)', textAlign: 'center', padding: '2rem' }}>Belum ada data menu.</p>
          )}
        </div>
      </div>

      {/* ── Revenue Trend ───────────────────── */}
      {trends.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', animation: 'fadeInUp 0.4s ease 0.4s both' }}>
          <h3 style={{ marginBottom: '1rem' }}>📈 Revenue Trend ({period === '7d' ? '7' : period === '30d' ? '30' : '90'} hari)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--gray-200)' }}
                formatter={(v) => fmt(v)}
              />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#0088FE" name="Revenue" strokeWidth={2} />
              <Line type="monotone" dataKey="orders" stroke="#00C49F" name="Orders" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Kitchen Efficiency & Segments ───── */}
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        {/* Kitchen metrics */}
        <div className="card card-accent-green" style={{ animation: 'fadeInUp 0.4s ease 0.45s both' }}>
          <h3 style={{ marginBottom: '1rem', color: '#2e7d32' }}>👨‍🍳 Kinerja Kitchen</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            {[
              { label: 'Avg Prep Time', value: `${kitchen.avgPrepTimeMinutes || 0} menit`, icon: '⏱️' },
              { label: 'On-Time Rate', value: `${kitchen.onTimeRate || 0}%`, icon: '✅' },
              { label: 'Active Orders', value: kpi.activeKitchenOrders || 0, icon: '📋' },
            ].map((item) => (
              <div key={item.label} style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--gray-50)', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.5rem' }}>{item.icon}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{item.label}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer segments */}
        <div className="card card-accent-yellow" style={{ animation: 'fadeInUp 0.4s ease 0.5s both' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--yellow-dark)' }}>👥 Segmen Pelanggan</h3>
          {segments.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {segments.map((s) => {
                const colors = { gold: '#fdd835', silver: '#C0C0C0', bronze: '#cd7f32', new: '#90caf9' };
                return (
                  <div key={s.segment} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.5rem 0.75rem', borderRadius: '6px',
                    background: colors[s.segment] ? `${colors[s.segment]}22` : 'var(--gray-50)',
                    borderLeft: `3px solid ${colors[s.segment] || 'var(--gray-300)'}`,
                  }}>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{s.segment}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                      {s.customers} · <strong>{fmt(s.totalSpent)}</strong>
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: 'var(--gray-500)', textAlign: 'center', padding: '2rem' }}>Belum ada data segmen.</p>
          )}
        </div>
      </div>

      {/* ── Low Stock Alert ─────────────────── */}
      {lowStock.length > 0 && (
        <div className="card card-accent-red" style={{ marginBottom: '1.5rem', animation: 'fadeInUp 0.4s ease 0.55s both' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--red-dark)' }}>⚠️ Low Stock Alert</h3>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Current Stock</th>
                  <th>Min Stock</th>
                  <th>Unit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.slice(0, 10).map((item) => (
                  <tr key={item._id}>
                    <td><strong>{item.name}</strong></td>
                    <td style={{ fontWeight: 'bold', color: 'var(--red)' }}>{item.currentStock}</td>
                    <td>{item.minStock}</td>
                    <td>{item.unit}</td>
                    <td>
                      <span className="badge badge-red">
                        {item.currentStock === 0 ? 'Out of Stock' : 'Low Stock'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalyticsPage;