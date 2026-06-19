import React, { useState, useEffect } from 'react';
import api from '../api';

function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [counts, setCounts] = useState({});
  const [configs, setConfigs] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadData(); }, [filter]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const query = filter !== 'all' ? `?type=${filter}` : '';
      const [alertsRes, configsRes, historyRes] = await Promise.all([
        api.get(`/alerts${query}`),
        api.get('/alerts/configs'),
        api.get('/alerts/history?days=7')
      ]);
      setAlerts(alertsRes.data.data.alerts || []);
      setCounts(alertsRes.data.data.counts || {});
      setConfigs(configsRes.data.data || []);
      setHistory(historyRes.data.data || {});
    } catch (err) {
      setError('Gagal memuat data alert');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAcknowledge(alertId) {
    try {
      await api.patch(`/alerts/${alertId}/acknowledge`);
      loadData();
    } catch (err) { console.error(err); }
  }

  async function handleResolve(alertId) {
    try {
      await api.patch(`/alerts/${alertId}/resolve`);
      loadData();
    } catch (err) { console.error(err); }
  }

  async function handleToggleConfig(configId, enabled) {
    try {
      await api.patch(`/alerts/configs/${configId}`, { enabled: !enabled });
      loadData();
    } catch (err) { console.error(err); }
  }

  async function handleCheckAlerts() {
    try {
      await api.post('/alerts/check');
      loadData();
    } catch (err) { console.error(err); }
  }

  const fmt = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

  const severityConfig = {
    critical: { badge: 'badge-red', bg: '#fff0f0', border: 'var(--red)' },
    warning:  { badge: 'badge-yellow', bg: '#fff8e1', border: '#ff9800' },
    info:     { badge: '', bg: '#e3f2fd', border: '#2196f3' },
  };

  /* ── Loading ─────────────────────────────── */
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px', margin: '0 auto' }} />
          <p style={{ color: 'var(--gray-500)', marginTop: '1rem' }}>Memuat data alert…</p>
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

  /* ── Page header ─────────────────────────── */
  return (
    <div>
      <div className="page-header" style={{ animation: 'fadeInDown 0.4s ease' }}>
        <div>
          <h2 style={{ margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🔔 Alert Management
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
            {counts.total || 0} total · {counts.unacknowledged || 0} belum diakui
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button className="btn btn-black btn-sm" onClick={handleCheckAlerts}>🔍 Check Now</button>
          <button className="btn btn-sm btn-red" onClick={loadData}>🔄</button>
        </div>
      </div>

      {/* ── Summary Cards ───────────────────── */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Total',      value: counts.total || 0, icon: '🔔', accent: '' },
          { label: 'Critical',   value: counts.critical || 0, icon: '🔴', accent: 'card-accent-red' },
          { label: 'Warning',    value: counts.warning || 0, icon: '🟡', accent: 'card-accent-yellow' },
          { label: 'Belum Diakui', value: counts.unacknowledged || 0, icon: '🔔', accent: 'card-accent-black' },
        ].map(({ label, value, icon, accent }) => (
          <div key={label} className={`card ${accent}`} style={{
            textAlign: 'center', animation: `fadeInUp 0.4s ease ${0.05 + ['','card-accent-red','card-accent-yellow','card-accent-black'].indexOf(accent) * 0.05}s both`,
          }}>
            <div style={{ fontSize: '2rem' }}>{icon}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>{label}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ─────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '0.25rem', marginBottom: '1.5rem',
        borderBottom: '2px solid var(--gray-200)', paddingBottom: 0,
      }}>
        {['active', 'config', 'history'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.6rem 1.2rem',
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontWeight: activeTab === tab ? 700 : 500,
              color: activeTab === tab ? 'var(--red)' : 'var(--gray-500)',
              borderBottom: activeTab === tab ? '3px solid var(--red)' : '3px solid transparent',
              marginBottom: '-2px', fontSize: '0.9rem',
            }}
          >
            {tab === 'active' ? 'Active Alerts' : tab === 'config' ? 'Configurations' : 'History (7 hari)'}
          </button>
        ))}
      </div>

      {/* ── Active Alerts Tab ────────────────── */}
      {activeTab === 'active' && (
        <div style={{ animation: 'fadeInUp 0.35s ease' }}>
          {/* Filter buttons */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {[
              { key: 'all', label: 'All' },
              { key: 'low_stock', label: 'Low Stock' },
              { key: 'sales_spike', label: 'Sales Spike' },
              { key: 'sales_drop', label: 'Sales Drop' },
              { key: 'high_wait_time', label: 'High Wait' },
              { key: 'payment_failure', label: 'Payment Fail' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`btn btn-sm ${filter === key ? 'btn-red' : 'btn-gray'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {alerts.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>
              ✅ Tidak ada alert aktif. Dashboard aman!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {alerts.map((alert) => {
                const sev = severityConfig[alert.severity] || severityConfig.info;
                return (
                  <div
                    key={alert._id}
                    className={`card ${alert.severity === 'critical' ? 'card-accent-red' : alert.severity === 'warning' ? 'card-accent-yellow' : 'card-accent-blue'}`}
                    style={{ animation: 'fadeInUp 0.35s ease' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{alert.title}</span>
                          <span className={`badge ${sev.badge}`} style={sev.badge ? {} : { background: sev.bg, color: sev.border, border: `1px solid ${sev.border}` }}>
                            {alert.severity}
                          </span>
                        </div>
                        <p style={{ color: 'var(--gray-700)', fontSize: '0.9rem', margin: '0 0 0.5rem' }}>{alert.message}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.78rem', color: 'var(--gray-500)' }}>
                          <span>{alert.type.replace(/_/g, ' ')}</span>
                          <span>{new Date(alert.createdAt).toLocaleString('id-ID')}</span>
                          {alert.acknowledged
                            ? <span className="badge badge-green">✓ Diakui</span>
                            : <span style={{ color: '#e65100', fontWeight: 600 }}>● Belum diakui</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', marginLeft: '1rem', flexShrink: 0 }}>
                        {!alert.acknowledged && (
                          <button className="btn btn-sm btn-black" onClick={() => handleAcknowledge(alert._id)}>Akui</button>
                        )}
                        <button className="btn btn-sm btn-green" style={{ background: '#43a047', color: '#fff' }} onClick={() => handleResolve(alert._id)}>
                          Selesai
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Config Tab ───────────────────────── */}
      {activeTab === 'config' && (
        <div className="card" style={{ animation: 'fadeInUp 0.35s ease' }}>
          <div style={{ padding: '0 0 1rem', marginBottom: '1rem', borderBottom: '1px solid var(--gray-200)' }}>
            <h3 style={{ color: 'var(--black)', margin: 0 }}>Alert Configurations</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Name</th>
                  <th>Threshold</th>
                  <th style={{ textAlign: 'center' }}>Frequency</th>
                  <th style={{ textAlign: 'center' }}>Enabled</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((config) => (
                  <tr key={config._id}>
                    <td style={{ textTransform: 'capitalize' }}>{config.type.replace(/_/g, ' ')}</td>
                    <td><strong>{config.name}</strong></td>
                    <td style={{ color: 'var(--gray-500)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {config.thresholds?.warning ? JSON.stringify(config.thresholds.warning) : '-'}
                    </td>
                    <td style={{ textAlign: 'center' }}>{config.frequency}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => handleToggleConfig(config._id, config.enabled)}
                        className={`badge ${config.enabled ? 'badge-green' : 'badge-gray'}`}
                        style={{ cursor: 'pointer', border: 'none', fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}
                      >
                        {config.enabled ? 'ON' : 'OFF'}
                      </button>
                    </td>
                  </tr>
                ))}
                {configs.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '2rem' }}>No configurations found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── History Tab ──────────────────────── */}
      {activeTab === 'history' && (
        <div style={{ animation: 'fadeInUp 0.35s ease' }}>
          {/* Summary cards */}
          <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Alert by Type</h3>
              {history.byType && Object.keys(history.byType).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {Object.entries(history.byType).map(([type, count]) => (
                    <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.6rem', background: 'var(--gray-50)', borderRadius: '4px', textTransform: 'capitalize' }}>
                      <span>{type.replace(/_/g, ' ')}</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--gray-500)' }}>Tidak ada data</p>
              )}
            </div>
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Alert by Day</h3>
              {(history.byDay || []).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {history.byDay.map((d) => (
                    <div key={d.date} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.6rem', background: 'var(--gray-50)', borderRadius: '4px' }}>
                      <span>{d.date}</span>
                      <strong>{d.count}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--gray-500)' }}>Tidak ada data</p>
              )}
            </div>
          </div>

          {/* Recent history table */}
          <div className="card">
            <div style={{ padding: '0 0 1rem', marginBottom: '1rem', borderBottom: '1px solid var(--gray-200)' }}>
              <h3 style={{ color: 'var(--black)', margin: 0 }}>Recent Alert History</h3>
            </div>
            <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Title</th>
                    <th style={{ textAlign: 'center' }}>Severity</th>
                    <th style={{ textAlign: 'center' }}>Date</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(history.alerts || []).slice(0, 30).map((alert) => (
                    <tr key={alert._id}>
                      <td style={{ textTransform: 'capitalize' }}>{alert.type.replace(/_/g, ' ')}</td>
                      <td><strong>{alert.title}</strong></td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${alert.severity === 'critical' ? 'badge-red' : alert.severity === 'warning' ? 'badge-yellow' : ''}`}
                          style={alert.severity === 'info' ? { background: '#e3f2fd', color: '#1976d2', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600, fontSize: '0.75rem' } : {}}>
                          {alert.severity}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                        {new Date(alert.createdAt).toLocaleDateString('id-ID')}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {alert.resolved ? <span className="badge badge-green">Resolved</span>
                          : alert.acknowledged ? <span className="badge" style={{ background: '#e3f2fd', color: '#1976d2', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>Acknowledged</span>
                          : <span style={{ color: '#e65100', fontWeight: 600 }}>Open</span>}
                      </td>
                    </tr>
                  ))}
                  {(history.alerts || []).length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '2rem' }}>Tidak ada riwayat alert.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AlertsPage;