import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminStaffPage.css';

const AdminStaffPage = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showPerformance, setShowPerformance] = useState(false);
  const [performanceData, setPerformanceData] = useState(null);
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    search: ''
  });

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'cashier',
    notes: ''
  });

  const token = localStorage.getItem('adminToken');

  // Fetch staff list
  useEffect(() => {
    fetchStaff();
  }, [filters]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.role) params.append('role', filters.role);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);

      const response = await axios.get(
        `http://localhost:5000/api/staff?${params}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      setStaffList(response.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data staff');
      console.error('Fetch staff error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = editingId ? 
        { name: formData.name, phone: formData.phone, role: formData.role, notes: formData.notes } :
        formData;

      const url = editingId 
        ? `http://localhost:5000/api/staff/${editingId}`
        : 'http://localhost:5000/api/staff';

      const method = editingId ? 'patch' : 'post';

      const response = await axios[method](url, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setStaffList(editingId 
        ? staffList.map(s => s._id === editingId ? response.data.data : s)
        : [...staffList, response.data.data]
      );

      resetForm();
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan staff');
      console.error('Save staff error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (window.confirm('Hapus staff ini? Mereka tidak akan bisa login lagi.')) {
      try {
        await axios.delete(`http://localhost:5000/api/staff/${staffId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setStaffList(staffList.filter(s => s._id !== staffId));
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Gagal menghapus staff');
      }
    }
  };

  const handleViewPerformance = async (staffId, staffName) => {
    try {
      const from = new Date();
      from.setDate(from.getDate() - 30);
      const to = new Date();

      const response = await axios.get(
        `http://localhost:5000/api/staff/${staffId}/performance?from=${from.toISOString().split('T')[0]}&to=${to.toISOString().split('T')[0]}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      setPerformanceData({ ...response.data.data, staffName });
      setShowPerformance(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat performa staff');
    }
  };

  const handleEditStaff = (staff) => {
    setEditingId(staff._id);
    setFormData({
      email: staff.email,
      password: '',
      name: staff.name,
      phone: staff.phone || '',
      role: staff.role,
      notes: ''
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      name: '',
      phone: '',
      role: 'cashier',
      notes: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="admin-staff-page">
      <div className="page-header">
        <h1>Manajemen Staff</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Batal' : '+ Tambah Staff'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="form-card">
          <h2>{editingId ? 'Edit Staff' : 'Tambah Staff Baru'}</h2>
          <form onSubmit={handleCreateStaff}>
            <div className="form-group">
              <label>Email *</label>
              <input 
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                disabled={!!editingId}
                required
              />
            </div>

            {!editingId && (
              <div className="form-group">
                <label>Password *</label>
                <input 
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Min 8 char, uppercase, lowercase, number, special char"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>Nama *</label>
              <input 
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>No Telepon</label>
              <input 
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Role *</label>
              <select 
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                required
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="cashier">Kasir</option>
                <option value="chef">Chef</option>
                <option value="waiter">Waiter</option>
              </select>
            </div>

            <div className="form-group">
              <label>Catatan</label>
              <textarea 
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows="3"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-success" disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="filters">
        <input 
          type="text"
          placeholder="Cari nama atau email..."
          value={filters.search}
          onChange={(e) => setFilters({...filters, search: e.target.value})}
          className="filter-input"
        />

        <select 
          value={filters.role}
          onChange={(e) => setFilters({...filters, role: e.target.value})}
          className="filter-select"
        >
          <option value="">Semua Role</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="cashier">Kasir</option>
          <option value="chef">Chef</option>
          <option value="waiter">Waiter</option>
        </select>

        <select 
          value={filters.status}
          onChange={(e) => setFilters({...filters, status: e.target.value})}
          className="filter-select"
        >
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Tidak Aktif</option>
          <option value="suspended">Suspend</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Memuat...</div>
      ) : (
        <div className="staff-list">
          {staffList.length === 0 ? (
            <div className="empty-state">Tidak ada staff ditemukan</div>
          ) : (
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Terdaftar</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map(staff => (
                  <tr key={staff._id}>
                    <td>{staff.name}</td>
                    <td>{staff.email}</td>
                    <td><span className={`badge badge-${staff.role}`}>{staff.role}</span></td>
                    <td><span className={`badge badge-${staff.status}`}>{staff.status}</span></td>
                    <td>{new Date(staff.joinDate).toLocaleDateString('id-ID')}</td>
                    <td className="actions">
                      <button 
                        className="btn-small btn-info"
                        onClick={() => handleViewPerformance(staff._id, staff.name)}
                      >
                        Performa
                      </button>
                      <button 
                        className="btn-small btn-warning"
                        onClick={() => handleEditStaff(staff)}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn-small btn-danger"
                        onClick={() => handleDeleteStaff(staff._id)}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showPerformance && performanceData && (
        <div className="modal-overlay" onClick={() => setShowPerformance(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Performa {performanceData.staffName}</h2>
              <button className="close-btn" onClick={() => setShowPerformance(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="perf-metric">
                <span className="label">Order Dikonfirmasi:</span>
                <span className="value">{performanceData.confirmed} order</span>
              </div>
              <div className="perf-metric">
                <span className="label">Order Selesai:</span>
                <span className="value">{performanceData.completed} order</span>
              </div>
              <div className="perf-metric">
                <span className="label">Total Revenue:</span>
                <span className="value">Rp {performanceData.revenue?.toLocaleString('id-ID')}</span>
              </div>
              <div className="perf-metric">
                <span className="label">Rata-rata Per Order:</span>
                <span className="value">
                  Rp {performanceData.completed > 0 
                    ? (performanceData.revenue / performanceData.completed).toLocaleString('id-ID')
                    : 0
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStaffPage;
