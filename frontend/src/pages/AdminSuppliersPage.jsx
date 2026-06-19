import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminSuppliersPage.css';

const AdminSuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({ search: '' });

  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    email: '',
    phone: '',
    address: '',
    leadTime: 1,
    paymentTerms: 'NET 30'
  });

  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    fetchSuppliers();
  }, [filters]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      params.append('isActive', 'true');

      const response = await axios.get(
        `http://localhost:5000/api/suppliers?${params}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      setSuppliers(response.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat supplier');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const url = editingId 
        ? `http://localhost:5000/api/suppliers/${editingId}`
        : 'http://localhost:5000/api/suppliers';

      const method = editingId ? 'patch' : 'post';

      const response = await axios[method](url, formData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setSuppliers(editingId 
        ? suppliers.map(s => s._id === editingId ? response.data.data : s)
        : [...suppliers, response.data.data]
      );

      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan supplier');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (supplierId) => {
    if (window.confirm('Hapus supplier ini?')) {
      try {
        await axios.delete(`http://localhost:5000/api/suppliers/${supplierId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setSuppliers(suppliers.filter(s => s._id !== supplierId));
      } catch (err) {
        setError(err.response?.data?.message || 'Gagal menghapus supplier');
      }
    }
  };

  const handleEdit = (supplier) => {
    setEditingId(supplier._id);
    setFormData({
      name: supplier.name,
      contact: supplier.contact,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      leadTime: supplier.leadTime,
      paymentTerms: supplier.paymentTerms
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact: '',
      email: '',
      phone: '',
      address: '',
      leadTime: 1,
      paymentTerms: 'NET 30'
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="admin-suppliers-page">
      <div className="page-header">
        <h1>Manajemen Supplier</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Batal' : '+ Tambah Supplier'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="form-card">
          <h2>{editingId ? 'Edit Supplier' : 'Tambah Supplier Baru'}</h2>
          <form onSubmit={handleSave}>
            <div className="form-row">
              <div className="form-group">
                <label>Nama Supplier *</label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Kontak (Nama) *</label>
                <input 
                  type="text"
                  value={formData.contact}
                  onChange={(e) => setFormData({...formData, contact: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Telepon</label>
                <input 
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Alamat</label>
              <textarea 
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                rows="3"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Lead Time (hari) *</label>
                <input 
                  type="number"
                  min="1"
                  value={formData.leadTime}
                  onChange={(e) => setFormData({...formData, leadTime: parseInt(e.target.value)})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Payment Terms</label>
                <input 
                  type="text"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({...formData, paymentTerms: e.target.value})}
                  placeholder="e.g., NET 30"
                />
              </div>
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
          placeholder="Cari nama supplier..."
          value={filters.search}
          onChange={(e) => setFilters({...filters, search: e.target.value})}
          className="filter-input"
        />
      </div>

      {loading ? (
        <div className="loading">Memuat...</div>
      ) : (
        <div className="suppliers-list">
          {suppliers.length === 0 ? (
            <div className="empty-state">Tidak ada supplier ditemukan</div>
          ) : (
            suppliers.map(supplier => (
              <div key={supplier._id} className="supplier-card">
                <div className="card-header">
                  <h3>{supplier.name}</h3>
                  <span className="lead-time">Lead Time: {supplier.leadTime} hari</span>
                </div>
                <div className="card-body">
                  <div className="info-group">
                    <div className="info-item">
                      <span className="label">Kontak:</span>
                      <span>{supplier.contact}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Email:</span>
                      <span>{supplier.email || '-'}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Telepon:</span>
                      <span>{supplier.phone || '-'}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Payment Terms:</span>
                      <span>{supplier.paymentTerms}</span>
                    </div>
                  </div>
                  {supplier.address && (
                    <div className="address">
                      <strong>Alamat:</strong>
                      <p>{supplier.address}</p>
                    </div>
                  )}
                </div>
                <div className="card-footer">
                  <button 
                    className="btn-small btn-warning"
                    onClick={() => handleEdit(supplier)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn-small btn-danger"
                    onClick={() => handleDelete(supplier._id)}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AdminSuppliersPage;
