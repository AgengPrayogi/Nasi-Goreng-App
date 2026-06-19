import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminReconciliationPage.css';

const AdminReconciliationPage = () => {
  const [view, setView] = useState('close'); // close, history, trend, health, monthly
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reconciliationData, setReconciliationData] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [healthMetrics, setHealthMetrics] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7));

  const [closeFormData, setCloseFormData] = useState({
    actualTotal: '',
    notes: ''
  });

  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  const token = localStorage.getItem('adminToken');

  // Auto-fetch when view changes
  useEffect(() => {
    if (view === 'close') {
      fetchTodayReconciliation();
    } else if (view === 'history') {
      fetchHistory();
    } else if (view === 'trend') {
      fetchTrend();
    } else if (view === 'health') {
      fetchHealthMetrics();
    } else if (view === 'monthly') {
      fetchMonthly();
    }
  }, [view, selectedDate, dateRange, monthYear]);

  const fetchTodayReconciliation = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:5000/api/reconciliation/${selectedDate}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setReconciliationData(response.data.data);
      setError(null);
    } catch (err) {
      if (err.response?.status === 404) {
        setReconciliationData(null);
      } else {
        setError(err.response?.data?.message || 'Gagal memuat data');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:5000/api/reconciliation/range/period?from=${dateRange.from}&to=${dateRange.to}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setHistoryData(response.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat history');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrend = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:5000/api/reconciliation/trend/data?from=${dateRange.from}&to=${dateRange.to}&granularity=daily`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setTrendData(response.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat trend');
    } finally {
      setLoading(false);
    }
  };

  const fetchHealthMetrics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:5000/api/reconciliation/health/metrics?from=${dateRange.from}&to=${dateRange.to}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setHealthMetrics(response.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat health metrics');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthly = async () => {
    try {
      setLoading(true);
      const [year, month] = monthYear.split('-');
      const response = await axios.get(
        `http://localhost:5000/api/reconciliation/monthly/${year}/${month}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setMonthlyData(response.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data bulanan');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDay = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await axios.post(
        'http://localhost:5000/api/reconciliation/close',
        {
          date: selectedDate,
          actualTotal: closeFormData.actualTotal ? parseInt(closeFormData.actualTotal) : undefined,
          notes: closeFormData.notes
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setReconciliationData(response.data.data);
      setCloseFormData({ actualTotal: '', notes: '' });
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menutup penjualan');
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (level) => {
    switch(level) {
      case 'EXCELLENT': return '#4CAF50';
      case 'GOOD': return '#8BC34A';
      case 'WARNING': return '#FF9800';
      case 'CRITICAL': return '#F44336';
      default: return '#999';
    }
  };

  return (
    <div className="admin-reconciliation-page">
      <div className="page-header">
        <h1>Daily Reconciliation & Reporting</h1>
        <div className="view-tabs">
          <button 
            className={`tab ${view === 'close' ? 'active' : ''}`}
            onClick={() => setView('close')}
          >
            Tutup Penjualan
          </button>
          <button 
            className={`tab ${view === 'history' ? 'active' : ''}`}
            onClick={() => setView('history')}
          >
            History
          </button>
          <button 
            className={`tab ${view === 'trend' ? 'active' : ''}`}
            onClick={() => setView('trend')}
          >
            Trend
          </button>
          <button 
            className={`tab ${view === 'health' ? 'active' : ''}`}
            onClick={() => setView('health')}
          >
            Health
          </button>
          <button 
            className={`tab ${view === 'monthly' ? 'active' : ''}`}
            onClick={() => setView('monthly')}
          >
            Bulanan
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {view === 'close' && (
        <div className="close-view">
          <div className="form-card">
            <h2>Tutup Penjualan Hari Ini</h2>
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-input"
            />

            {reconciliationData ? (
              <div className="reconciliation-result">
                <h3>Ringkasan Penjualan {selectedDate}</h3>
                <div className="result-grid">
                  <div className="result-item">
                    <span className="label">Total Order:</span>
                    <span className="value">{reconciliationData.totalOrders}</span>
                  </div>
                  <div className="result-item">
                    <span className="label">Total Revenue:</span>
                    <span className="value">Rp {reconciliationData.totalRevenue?.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="result-item">
                    <span className="label">Total Discount:</span>
                    <span className="value">Rp {reconciliationData.discountApplied?.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="result-item">
                    <span className="label">Cash:</span>
                    <span className="value">Rp {reconciliationData.paymentBreakdown?.cash?.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="result-item">
                    <span className="label">Transfer:</span>
                    <span className="value">Rp {reconciliationData.paymentBreakdown?.transfer?.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="result-item">
                    <span className="label">QRIS:</span>
                    <span className="value">Rp {reconciliationData.paymentBreakdown?.qris?.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {reconciliationData.status === 'open' && (
                  <form onSubmit={handleCloseDay} className="close-form">
                    <div className="form-group">
                      <label>Actual Total (Optional)</label>
                      <input 
                        type="number"
                        value={closeFormData.actualTotal}
                        onChange={(e) => setCloseFormData({...closeFormData, actualTotal: e.target.value})}
                        placeholder="Jika ada perbedaan"
                      />
                    </div>

                    <div className="form-group">
                      <label>Catatan</label>
                      <textarea 
                        value={closeFormData.notes}
                        onChange={(e) => setCloseFormData({...closeFormData, notes: e.target.value})}
                        rows="3"
                        placeholder="Catatan tambahan"
                      />
                    </div>

                    <button type="submit" className="btn btn-success" disabled={loading}>
                      {loading ? 'Menutup...' : 'Tutup Penjualan'}
                    </button>
                  </form>
                )}

                {reconciliationData.status === 'closed' && (
                  <div className="closed-status">
                    <p>✓ Penjualan sudah ditutup</p>
                    <p>Ditutup oleh: {reconciliationData.closedBy?.name}</p>
                    <p>Waktu: {new Date(reconciliationData.closedAt).toLocaleString('id-ID')}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-data">
                Tidak ada data penjualan untuk tanggal {selectedDate}
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'history' && (
        <div className="history-view">
          <div className="date-range-filter">
            <input 
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
            />
            <span>to</span>
            <input 
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
            />
          </div>

          {loading ? (
            <div className="loading">Memuat...</div>
          ) : historyData ? (
            <>
              <div className="summary-cards">
                <div className="summary-card">
                  <span className="label">Total Orders</span>
                  <span className="value">{historyData.summary?.totalOrders}</span>
                </div>
                <div className="summary-card">
                  <span className="label">Total Revenue</span>
                  <span className="value">Rp {historyData.summary?.totalRevenue?.toLocaleString('id-ID')}</span>
                </div>
                <div className="summary-card">
                  <span className="label">Avg/Day</span>
                  <span className="value">Rp {historyData.summary?.avgRevenuePerDay?.toLocaleString('id-ID')}</span>
                </div>
                <div className="summary-card">
                  <span className="label">Days</span>
                  <span className="value">{historyData.summary?.totalDays}</span>
                </div>
              </div>

              <table className="history-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Orders</th>
                    <th>Revenue</th>
                    <th>Discount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.reconciliations?.map(rec => (
                    <tr key={rec._id}>
                      <td>{new Date(rec.date).toLocaleDateString('id-ID')}</td>
                      <td>{rec.totalOrders}</td>
                      <td>Rp {rec.totalRevenue?.toLocaleString('id-ID')}</td>
                      <td>Rp {rec.discountApplied?.toLocaleString('id-ID')}</td>
                      <td><span className="badge badge-success">{rec.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}
        </div>
      )}

      {view === 'trend' && (
        <div className="trend-view">
          <div className="date-range-filter">
            <input 
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
            />
            <span>to</span>
            <input 
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
            />
          </div>

          {loading ? (
            <div className="loading">Memuat...</div>
          ) : (
            <table className="trend-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Revenue</th>
                  <th>Orders</th>
                  <th>Avg/Order</th>
                  <th>Discount</th>
                </tr>
              </thead>
              <tbody>
                {trendData?.map((row, idx) => (
                  <tr key={idx}>
                    <td>{typeof row._id === 'string' ? row._id : new Date(row._id).toLocaleDateString('id-ID')}</td>
                    <td>Rp {row.revenue?.toLocaleString('id-ID')}</td>
                    <td>{row.orders}</td>
                    <td>Rp {row.avgOrderValue?.toLocaleString('id-ID')}</td>
                    <td>Rp {row.discount?.toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {view === 'health' && (
        <div className="health-view">
          <div className="date-range-filter">
            <input 
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
            />
            <span>to</span>
            <input 
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
            />
          </div>

          {loading ? (
            <div className="loading">Memuat...</div>
          ) : healthMetrics ? (
            <div className="health-metrics">
              <div className="metric-card highlight">
                <span className="label">Accuracy</span>
                <span className="value">{healthMetrics.accuracy}%</span>
                <span className="risk-level" style={{backgroundColor: getHealthColor(healthMetrics.riskLevel)}}>
                  {healthMetrics.riskLevel}
                </span>
              </div>

              <div className="metric-card">
                <span className="label">Total Days</span>
                <span className="value">{healthMetrics.totalDays}</span>
              </div>

              <div className="metric-card">
                <span className="label">Days with Errors</span>
                <span className="value">{healthMetrics.daysWithErrors}</span>
              </div>

              <div className="metric-card">
                <span className="label">Total Discrepancy</span>
                <span className="value">Rp {Math.abs(healthMetrics.totalDiscrepancy)?.toLocaleString('id-ID')}</span>
              </div>

              <div className="metric-card">
                <span className="label">Avg Discrepancy/Day</span>
                <span className="value">Rp {healthMetrics.avgDiscrepancyPerDay}</span>
              </div>

              <div className="metric-card">
                <span className="label">Max Discrepancy</span>
                <span className="value">Rp {healthMetrics.maxDiscrepancy?.toLocaleString('id-ID')}</span>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {view === 'monthly' && (
        <div className="monthly-view">
          <input 
            type="month"
            value={monthYear}
            onChange={(e) => setMonthYear(e.target.value)}
            className="month-input"
          />

          {loading ? (
            <div className="loading">Memuat...</div>
          ) : monthlyData ? (
            <>
              <div className="monthly-summary">
                <h3>Ringkasan Bulan {monthYear}</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="label">Total Orders</span>
                    <span className="value">{monthlyData.monthlySummary?.totalOrders}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Total Revenue</span>
                    <span className="value">Rp {monthlyData.monthlySummary?.totalRevenue?.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Total Discount</span>
                    <span className="value">Rp {monthlyData.monthlySummary?.totalDiscount?.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Days Reconciled</span>
                    <span className="value">{monthlyData.monthlySummary?.daysReconciled}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Avg/Day</span>
                    <span className="value">Rp {monthlyData.monthlySummary?.avgRevenuePerDay?.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Max Day Revenue</span>
                    <span className="value">Rp {monthlyData.monthlySummary?.maxRevenueDay?.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              <h3 style={{marginTop: '30px'}}>Detail Harian</h3>
              <table className="monthly-detail-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Orders</th>
                    <th>Revenue</th>
                    <th>Discount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.dailyBreakdown?.map(day => (
                    <tr key={day._id}>
                      <td>{new Date(day.date).toLocaleDateString('id-ID')}</td>
                      <td>{day.totalOrders}</td>
                      <td>Rp {day.totalRevenue?.toLocaleString('id-ID')}</td>
                      <td>Rp {day.discountApplied?.toLocaleString('id-ID')}</td>
                      <td><span className="badge badge-success">{day.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default AdminReconciliationPage;
