import React, { useState, useEffect } from 'react';
import api from '../api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

function DashboardPage() {
  const [executiveData, setExecutiveData] = useState(null);
  const [kpiData, setKpiData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [comparisonsData, setComparisonsData] = useState(null);
  const [alertsData, setAlertsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('7d');

  useEffect(() => {
    loadAllData();
  }, [period]);

  async function loadAllData() {
    setLoading(true);
    setError('');
    try {
      const [executive, kpi, trends, comparisons, alerts] = await Promise.all([
        api.get('/dashboard/executive'),
        api.get('/dashboard/kpi'),
        api.get(`/dashboard/trends?period=${period}`),
        api.get('/dashboard/comparisons'),
        api.get('/dashboard/alerts')
      ]);
      setExecutiveData(executive.data.data);
      setKpiData(kpi.data.data);
      setTrendsData(trends.data.data);
      setComparisonsData(comparisons.data.data);
      setAlertsData(alerts.data.data);
    } catch (err) {
      setError('Gagal memuat data dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px', margin: '0 auto' }} />
          <p style={{ color: 'var(--gray-500)', marginTop: '1rem' }}>Memuat data dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="card" style={{ border: '2px solid var(--red)', padding: '2rem', display: 'inline-block' }}>
          <p style={{ color: 'var(--red)', fontWeight: 'bold' }}>{error}</p>
          <button className="btn btn-red" onClick={loadAllData} style={{ marginTop: '0.5rem' }}>🔄 Coba Lagi</button>
        </div>
      </div>
    );
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);
  };

  const formatPercent = (val) => {
    const num = Number(val) || 0;
    return num > 0 ? `+${num}%` : `${num}%`;
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ animation: 'fadeInDown 0.4s ease' }}>
        <div>
          <h2 style={{ margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📊 Executive Dashboard
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
            Real-time overview · {period === '7d' ? '7 hari' : period === '30d' ? '30 hari' : '90 hari'}
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
        </div>
      </div>

      {/* Today's KPI Cards */}
      {kpiData && (
        <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
          <div className="card card-accent-red" style={{ 
            textAlign: 'center',
            animation: 'fadeInUp 0.4s ease 0.05s both',
          }}>
            <div style={{ fontSize: '2rem' }}>📋</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>Total Pesanan Hari Ini</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{kpiData.orders.today}</div>
            <div style={{ fontSize: '0.75rem', color: '#43a047' }}>{kpiData.orders.completed} selesai</div>
          </div>
          <div className="card card-accent-green" style={{ 
            textAlign: 'center',
            animation: 'fadeInUp 0.4s ease 0.1s both',
          }}>
            <div style={{ fontSize: '2rem' }}>💰</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>Pendapatan Hari Ini</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#43a047' }}>{formatCurrency(kpiData.revenue.today)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Diskon: {formatCurrency(kpiData.revenue.totalDiscount)}</div>
          </div>
          <div className="card card-accent-yellow" style={{ 
            textAlign: 'center',
            animation: 'fadeInUp 0.4s ease 0.15s both',
          }}>
            <div style={{ fontSize: '2rem' }}>📊</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>Rata-rata Pesanan</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{formatCurrency(kpiData.revenue.avgOrderValue)}</div>
          </div>
          <div className="card card-accent-black" style={{ 
            textAlign: 'center',
            animation: 'fadeInUp 0.4s ease 0.2s both',
          }}>
            <div style={{ fontSize: '2rem' }}>👥</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>Pelanggan</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{kpiData.customers.total}</div>
            <div style={{ fontSize: '0.75rem', color: '#43a047' }}>+{kpiData.customers.newToday} hari ini</div>
          </div>
        </div>
      )}

      {/* Comparison Cards */}
      {comparisonsData && (
        <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
          <div className="card card-accent-green" style={{ animation: 'fadeInUp 0.4s ease 0.25s both' }}>
            <h3 style={{ marginBottom: '1rem', color: '#2e7d32' }}>📈 Hari Ini vs Kemarin</h3>
            <div className="grid-2">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Pesanan</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{comparisonsData.todayVsYesterday.today.orders}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: comparisonsData.todayVsYesterday.orderChange >= 0 ? '#43a047' : 'var(--red)' }}>
                  {formatPercent(comparisonsData.todayVsYesterday.orderChange)}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Pendapatan</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(comparisonsData.todayVsYesterday.today.revenue)}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: comparisonsData.todayVsYesterday.revenueChange >= 0 ? '#43a047' : 'var(--red)' }}>
                  {formatPercent(comparisonsData.todayVsYesterday.revenueChange)}
                </div>
              </div>
            </div>
          </div>
          <div className="card card-accent-yellow" style={{ animation: 'fadeInUp 0.4s ease 0.3s both' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--yellow-dark)' }}>📊 Minggu Ini vs Minggu Lalu</h3>
            <div className="grid-2">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Pesanan</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{comparisonsData.thisWeekVsLastWeek.thisWeek.orders}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: comparisonsData.thisWeekVsLastWeek.orderChange >= 0 ? '#43a047' : 'var(--red)' }}>
                  {formatPercent(comparisonsData.thisWeekVsLastWeek.orderChange)}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Pendapatan</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(comparisonsData.thisWeekVsLastWeek.thisWeek.revenue)}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: comparisonsData.thisWeekVsLastWeek.revenueChange >= 0 ? '#43a047' : 'var(--red)' }}>
                  {formatPercent(comparisonsData.thisWeekVsLastWeek.revenueChange)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Trend Chart */}
      {trendsData && trendsData.revenue && trendsData.revenue.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', animation: 'fadeInUp 0.4s ease 0.35s both' }}>
          <h3 style={{ marginBottom: '1rem' }}>📈 Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendsData.revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--gray-200)' }} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#0088FE" name="Revenue" strokeWidth={2} />
              <Line type="monotone" dataKey="orders" stroke="#00C49F" name="Orders" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Products & Top Customers */}
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        {executiveData && executiveData.topProducts && (
          <div className="card" style={{ animation: 'fadeInUp 0.4s ease 0.4s both' }}>
            <h3 style={{ marginBottom: '1rem' }}>🏆 Top 10 Produk (30 hari)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={executiveData.topProducts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--gray-200)' }} />
                <Bar dataKey="totalRevenue" fill="#0088FE" name="Revenue" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {executiveData && executiveData.topCustomers && (
          <div className="card" style={{ animation: 'fadeInUp 0.4s ease 0.45s both' }}>
            <h3 style={{ marginBottom: '1rem' }}>👑 Top 5 Pelanggan</h3>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Total Order</th>
                    <th>Total Belanja</th>
                    <th>Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {executiveData.topCustomers.map((c, idx) => (
                    <tr key={idx}>
                      <td><strong>{c.name || c.phone}</strong></td>
                      <td>{c.totalOrders}</td>
                      <td><strong>{formatCurrency(c.totalSpent)}</strong></td>
                      <td>
                        <span className={`badge ${
                          c.tier === 'gold' ? 'badge-yellow' :
                          c.tier === 'silver' ? '' :
                          'badge-gray'
                        }`} style={c.tier === 'silver' ? { background: '#C0C0C0', color: '#fff' } : {}}>
                          {c.tier}
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

      {/* Staff Performance & Alerts */}
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        {executiveData && executiveData.staffPerformance && (
          <div className="card" style={{ animation: 'fadeInUp 0.4s ease 0.5s both' }}>
            <h3 style={{ marginBottom: '1rem' }}>👨‍🍳 Kinerja Staff Hari Ini</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={executiveData.staffPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--gray-200)' }} />
                <Bar dataKey="ordersCompleted" fill="#00C49F" name="Pesanan Selesai" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {alertsData && alertsData.alerts && (
          <div className="card" style={{ animation: 'fadeInUp 0.4s ease 0.55s both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>🔔 Alert Terkini</h3>
              <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.75rem' }}>
                <span className="badge badge-red">{alertsData.counts.critical} Critical</span>
                <span style={{ background: '#ff9800', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>{alertsData.counts.warning} Warning</span>
                <span style={{ background: '#2196f3', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>{alertsData.counts.info} Info</span>
              </div>
            </div>
            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {alertsData.alerts.slice(0, 8).map((alert, idx) => (
                <div key={idx} style={{
                  padding: '0.6rem',
                  marginBottom: '0.4rem',
                  borderRadius: '6px',
                  borderLeft: `4px solid ${
                    alert.severity === 'critical' ? 'var(--red)' :
                    alert.severity === 'warning' ? '#ff9800' :
                    '#2196f3'
                  }`,
                  background: alert.severity === 'critical' ? '#fff0f0' :
                    alert.severity === 'warning' ? '#fff8e1' :
                    '#e3f2fd',
                }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{alert.title}</div>
                  <div style={{ color: 'var(--gray-500)', fontSize: '0.8rem' }}>{alert.message}</div>
                  <div style={{ color: 'var(--gray-400)', fontSize: '0.7rem', marginTop: '0.2rem' }}>
                    {new Date(alert.createdAt).toLocaleString('id-ID')}
                    {!alert.acknowledged && <span style={{ color: '#e65100', marginLeft: '0.5rem' }}>● Belum diakui</span>}
                  </div>
                </div>
              ))}
              {alertsData.alerts.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '2rem' }}>
                  ✅ Tidak ada alert
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hourly Trend */}
      {trendsData && trendsData.hourlyTrend && trendsData.hourlyTrend.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', animation: 'fadeInUp 0.4s ease 0.6s both' }}>
          <h3 style={{ marginBottom: '1rem' }}>⏰ Distribusi Pesanan Per Jam (Hari Ini)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={trendsData.hourlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--gray-200)' }} />
              <Area type="monotone" dataKey="orders" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} name="Pesanan" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Status Distribution & Payment Distribution */}
      {trendsData && (
        <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
          {trendsData.statusDistribution && (
            <div className="card" style={{ animation: 'fadeInUp 0.4s ease 0.65s both' }}>
              <h3 style={{ marginBottom: '1rem' }}>📊 Distribusi Status Pesanan</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={trendsData.statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine
                    label={({ _id, count }) => `${_id}: ${count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="_id"
                  >
                    {trendsData.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--gray-200)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {trendsData.paymentDistribution && (
            <div className="card" style={{ animation: 'fadeInUp 0.4s ease 0.7s both' }}>
              <h3 style={{ marginBottom: '1rem' }}>💳 Distribusi Metode Pembayaran</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={trendsData.paymentDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine
                    label={({ _id, count }) => `${_id}: ${count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="_id"
                  >
                    {trendsData.paymentDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--gray-200)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DashboardPage;