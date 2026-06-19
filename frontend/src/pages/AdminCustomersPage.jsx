import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminCustomersPage.css';

const AdminCustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('list'); // list, analytics, churn, segments
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [segments, setSegments] = useState(null);
  const [churnRiskCustomers, setChurnRiskCustomers] = useState(null);
  const [repeatRate, setRepeatRate] = useState(null);
  const [filters, setFilters] = useState({
    tier: '',
    search: ''
  });

  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    if (currentView === 'list') {
      fetchCustomers();
    } else if (currentView === 'analytics') {
      fetchTopCustomers();
    } else if (currentView === 'segments') {
      fetchSegments();
    } else if (currentView === 'churn') {
      fetchChurnRisk();
    } else if (currentView === 'repeat') {
      fetchRepeatRate();
    }
  }, [currentView, filters]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.tier) params.append('tier', filters.tier);
      if (filters.search) params.append('search', filters.search);

      const response = await axios.get(
        `http://localhost:5000/api/customers?${params}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      setCustomers(response.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat customer');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopCustomers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        'http://localhost:5000/api/customers/analytics/top?limit=20',
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setAnalytics(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchSegments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        'http://localhost:5000/api/customers/analytics/segments',
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setSegments(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat segmentasi');
    } finally {
      setLoading(false);
    }
  };

  const fetchChurnRisk = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        'http://localhost:5000/api/customers/analytics/churn-risk?days=30&limit=20',
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setChurnRiskCustomers(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat churn risk');
    } finally {
      setLoading(false);
    }
  };

  const fetchRepeatRate = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        'http://localhost:5000/api/customers/analytics/repeat-rate',
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setRepeatRate(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat repeat rate');
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrders = async (customerId) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/customers/${customerId}/orders`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setCustomerOrders(response.data.data);
      setShowOrderHistory(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat order history');
    }
  };

  const getTierColor = (tier) => {
    switch(tier) {
      case 'gold': return '#FFD700';
      case 'silver': return '#C0C0C0';
      case 'bronze': return '#CD7F32';
      default: return '#999';
    }
  };

  return (
    <div className="admin-customers-page">
      <div className="page-header">
        <h1>CRM - Manajemen Customer</h1>
        <div className="view-tabs">
          <button 
            className={`tab ${currentView === 'list' ? 'active' : ''}`}
            onClick={() => setCurrentView('list')}
          >
            Daftar Customer
          </button>
          <button 
            className={`tab ${currentView === 'analytics' ? 'active' : ''}`}
            onClick={() => setCurrentView('analytics')}
          >
            Top Customer
          </button>
          <button 
            className={`tab ${currentView === 'segments' ? 'active' : ''}`}
            onClick={() => setCurrentView('segments')}
          >
            Segmentasi
          </button>
          <button 
            className={`tab ${currentView === 'repeat' ? 'active' : ''}`}
            onClick={() => setCurrentView('repeat')}
          >
            Repeat Rate
          </button>
          <button 
            className={`tab ${currentView === 'churn' ? 'active' : ''}`}
            onClick={() => setCurrentView('churn')}
          >
            Churn Risk
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {currentView === 'list' && (
        <>
          <div className="filters">
            <input 
              type="text"
              placeholder="Cari nama atau nomor telepon..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="filter-input"
            />
            <select 
              value={filters.tier}
              onChange={(e) => setFilters({...filters, tier: e.target.value})}
              className="filter-select"
            >
              <option value="">Semua Tier</option>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="bronze">Bronze</option>
            </select>
          </div>

          {loading ? (
            <div className="loading">Memuat...</div>
          ) : (
            <div className="customers-grid">
              {customers.map(customer => (
                <div key={customer._id} className="customer-card">
                  <div className="card-header">
                    <h3>{customer.name}</h3>
                    <span className="tier-badge" style={{backgroundColor: getTierColor(customer.tier)}}>
                      {customer.tier.toUpperCase()}
                    </span>
                  </div>
                  <div className="card-body">
                    <div className="info-row">
                      <span className="label">Telepon:</span>
                      <span>{customer.phone}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Email:</span>
                      <span>{customer.email || '-'}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Total Order:</span>
                      <span className="value">{customer.totalOrders}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Total Belanja:</span>
                      <span className="value">Rp {customer.totalSpent?.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Order Terakhir:</span>
                      <span>{customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString('id-ID') : '-'}</span>
                    </div>
                  </div>
                  <div className="card-footer">
                    <button 
                      className="btn-small btn-primary"
                      onClick={() => handleViewOrders(customer._id)}
                    >
                      Lihat Order
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {currentView === 'analytics' && (
        <div className="analytics-view">
          {loading ? (
            <div className="loading">Memuat...</div>
          ) : (
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama</th>
                  <th>Total Belanja</th>
                  <th>Total Order</th>
                  <th>Rata-rata Order</th>
                  <th>Tier</th>
                </tr>
              </thead>
              <tbody>
                {analytics?.map((customer, idx) => (
                  <tr key={customer._id}>
                    <td>{idx + 1}</td>
                    <td>{customer.name}</td>
                    <td>Rp {customer.totalSpent?.toLocaleString('id-ID')}</td>
                    <td>{customer.orderCount}</td>
                    <td>Rp {customer.avgOrder?.toLocaleString('id-ID')}</td>
                    <td>
                      <span className="tier-badge" style={{backgroundColor: getTierColor(customer.tier)}}>
                        {customer.tier.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {currentView === 'segments' && (
        <div className="segments-view">
          {loading ? (
            <div className="loading">Memuat...</div>
          ) : (
            <div className="segments-grid">
              {segments?.map(seg => (
                <div key={seg._id} className="segment-card">
                  <h3>{seg._id.toUpperCase()}</h3>
                  <div className="segment-stats">
                    <div className="stat">
                      <span className="label">Jumlah</span>
                      <span className="value">{seg.count} Customer</span>
                    </div>
                    <div className="stat">
                      <span className="label">Total Belanja</span>
                      <span className="value">Rp {seg.totalSpent?.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Rata-rata/Customer</span>
                      <span className="value">Rp {seg.avgSpent?.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Rata-rata Order</span>
                      <span className="value">{seg.avgOrders?.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {currentView === 'repeat' && (
        <div className="repeat-rate-view">
          {loading ? (
            <div className="loading">Memuat...</div>
          ) : repeatRate ? (
            <div className="repeat-stats">
              <div className="stat-card">
                <h3>Total Customer</h3>
                <div className="stat-value">{repeatRate.totalCustomers}</div>
              </div>
              <div className="stat-card">
                <h3>Repeat Customer</h3>
                <div className="stat-value">{repeatRate.repeatCustomers}</div>
              </div>
              <div className="stat-card">
                <h3>Single Order</h3>
                <div className="stat-value">{repeatRate.singleOrderCustomers}</div>
              </div>
              <div className="stat-card highlight">
                <h3>Repeat Rate</h3>
                <div className="stat-value">{repeatRate.repeatRate?.toFixed(2)}%</div>
              </div>
              <div className="stat-card">
                <h3>Rata-rata Order/Customer</h3>
                <div className="stat-value">{repeatRate.avgOrdersPerCustomer?.toFixed(2)}</div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {currentView === 'churn' && (
        <div className="churn-risk-view">
          {loading ? (
            <div className="loading">Memuat...</div>
          ) : (
            <div className="churn-list">
              {churnRiskCustomers?.length === 0 ? (
                <div className="empty-state">Tidak ada customer dengan risiko churn</div>
              ) : (
                churnRiskCustomers?.map(customer => (
                  <div key={customer._id} className="churn-item">
                    <div className="churn-info">
                      <h4>{customer.name}</h4>
                      <p>{customer.phone}</p>
                      <p className="last-order">
                        Order terakhir: {new Date(customer.lastOrderDate).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <div className="churn-stats">
                      <span className="badge">{customer.totalOrders} order</span>
                      <span className="badge">Rp {customer.totalSpent?.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {showOrderHistory && (
        <div className="modal-overlay" onClick={() => setShowOrderHistory(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Order History</h2>
              <button className="close-btn" onClick={() => setShowOrderHistory(false)}>×</button>
            </div>
            <div className="modal-body">
              {customerOrders.length === 0 ? (
                <div className="empty-state">Tidak ada order</div>
              ) : (
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Order Code</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerOrders.map(order => (
                      <tr key={order._id}>
                        <td>{order.orderCode}</td>
                        <td>Rp {order.amountAfterDiscount?.toLocaleString('id-ID')}</td>
                        <td><span className="badge badge-success">{order.status}</span></td>
                        <td>{new Date(order.createdAt).toLocaleDateString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCustomersPage;
