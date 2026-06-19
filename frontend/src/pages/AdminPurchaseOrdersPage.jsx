import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminPurchaseOrdersPage.css';

const AdminPurchaseOrdersPage = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [filters, setFilters] = useState({ status: 'pending' });

  const [formData, setFormData] = useState({
    supplierId: '',
    items: [{ ingredientId: '', quantity: '', unit: 'kg', unitPrice: '' }],
    notes: ''
  });

  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    fetchPurchaseOrders();
    fetchSuppliers();
    fetchIngredients();
  }, [filters]);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);

      const response = await axios.get(
        `http://localhost:5000/api/purchase-orders?${params}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      setPurchaseOrders(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat PO');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get(
        'http://localhost:5000/api/suppliers?isActive=true&limit=100',
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setSuppliers(response.data.data);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const fetchIngredients = async () => {
    try {
      const response = await axios.get(
        'http://localhost:5000/api/ingredients?limit=200',
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setIngredients(response.data.data);
    } catch (err) {
      console.error('Error fetching ingredients:', err);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { ingredientId: '', quantity: '', unit: 'kg', unitPrice: '' }]
    });
  };

  const handleRemoveItem = (idx) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== idx)
    });
  };

  const handleItemChange = (idx, field, value) => {
    const newItems = [...formData.items];
    newItems[idx][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleCreatePO = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        ...formData,
        items: formData.items.map(item => ({
          ...item,
          quantity: parseInt(item.quantity),
          unitPrice: parseInt(item.unitPrice)
        }))
      };

      const response = await axios.post(
        'http://localhost:5000/api/purchase-orders',
        payload,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      setPurchaseOrders([response.data.data, ...purchaseOrders]);
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal membuat PO');
    } finally {
      setLoading(false);
    }
  };

  const handleReceivePO = async (poId) => {
    if (window.confirm('Terima PO ini? Stock akan otomatis terupdate.')) {
      try {
        const response = await axios.patch(
          `http://localhost:5000/api/purchase-orders/${poId}/receive`,
          {},
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        setPurchaseOrders(
          purchaseOrders.map(po => po._id === poId ? response.data.data : po)
        );
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Gagal menerima PO');
      }
    }
  };

  const handleCancelPO = async (poId) => {
    const reason = prompt('Alasan pembatalan:');
    if (reason) {
      try {
        const response = await axios.patch(
          `http://localhost:5000/api/purchase-orders/${poId}/cancel`,
          { reason },
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        setPurchaseOrders(
          purchaseOrders.map(po => po._id === poId ? response.data.data : po)
        );
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Gagal membatalkan PO');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      supplierId: '',
      items: [{ ingredientId: '', quantity: '', unit: 'kg', unitPrice: '' }],
      notes: ''
    });
    setShowForm(false);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return '#FF9800';
      case 'confirmed': return '#2196F3';
      case 'received': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return '#999';
    }
  };

  const calculateItemTotal = (quantity, price) => {
    return (parseInt(quantity) || 0) * (parseInt(price) || 0);
  };

  const calculatePOTotal = () => {
    return formData.items.reduce((sum, item) => 
      sum + calculateItemTotal(item.quantity, item.unitPrice), 0
    );
  };

  const getPOTotal = (po) => {
    return po.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  return (
    <div className="admin-po-page">
      <div className="page-header">
        <h1>Manajemen Purchase Order</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Batal' : '+ Buat PO Baru'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="form-card">
          <h2>Buat Purchase Order Baru</h2>
          <form onSubmit={handleCreatePO}>
            <div className="form-group">
              <label>Supplier *</label>
              <select 
                value={formData.supplierId}
                onChange={(e) => setFormData({...formData, supplierId: e.target.value})}
                required
              >
                <option value="">Pilih Supplier</option>
                {suppliers.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="items-section">
              <h3>Item PO</h3>
              {formData.items.map((item, idx) => (
                <div key={idx} className="item-row">
                  <select 
                    value={item.ingredientId}
                    onChange={(e) => handleItemChange(idx, 'ingredientId', e.target.value)}
                    required
                  >
                    <option value="">Pilih Bahan</option>
                    {ingredients.map(ing => (
                      <option key={ing._id} value={ing._id}>{ing.name}</option>
                    ))}
                  </select>

                  <input 
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    placeholder="Qty"
                    required
                  />

                  <select 
                    value={item.unit}
                    onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                  >
                    <option value="kg">kg</option>
                    <option value="liter">liter</option>
                    <option value="pcs">pcs</option>
                    <option value="pack">pack</option>
                  </select>

                  <input 
                    type="number"
                    min="0"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                    placeholder="Harga Satuan"
                    required
                  />

                  <div className="item-subtotal">
                    Rp {calculateItemTotal(item.quantity, item.unitPrice).toLocaleString('id-ID')}
                  </div>

                  {formData.items.length > 1 && (
                    <button 
                      type="button"
                      className="btn-remove"
                      onClick={() => handleRemoveItem(idx)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              <button 
                type="button"
                className="btn btn-secondary btn-add-item"
                onClick={handleAddItem}
              >
                + Tambah Item
              </button>
            </div>

            <div className="form-group">
              <label>Catatan</label>
              <textarea 
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows="3"
              />
            </div>

            <div className="po-total">
              <strong>Total: Rp {calculatePOTotal().toLocaleString('id-ID')}</strong>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-success" disabled={loading}>
                {loading ? 'Membuat...' : 'Buat PO'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="filters">
        <select 
          value={filters.status}
          onChange={(e) => setFilters({...filters, status: e.target.value})}
          className="filter-select"
        >
          <option value="">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Memuat...</div>
      ) : (
        <div className="po-list">
          {purchaseOrders.length === 0 ? (
            <div className="empty-state">Tidak ada PO ditemukan</div>
          ) : (
            purchaseOrders.map(po => (
              <div key={po._id} className="po-card">
                <div className="card-header">
                  <div>
                    <h3>{po.poNumber}</h3>
                    <p>{po.supplier?.name}</p>
                  </div>
                  <span className="status-badge" style={{backgroundColor: getStatusColor(po.status)}}>
                    {po.status}
                  </span>
                </div>

                <div className="card-body">
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="label">Tanggal Order:</span>
                      <span>{new Date(po.orderDate).toLocaleDateString('id-ID')}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Expected Date:</span>
                      <span>{new Date(po.expectedDate).toLocaleDateString('id-ID')}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Total Cost:</span>
                      <span className="value">Rp {getPOTotal(po).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Item Count:</span>
                      <span>{po.items.length}</span>
                    </div>
                  </div>
                </div>

                <div className="card-footer">
                  <button 
                    className="btn-small btn-info"
                    onClick={() => {
                      setSelectedPO(po);
                      setShowDetail(true);
                    }}
                  >
                    Detail
                  </button>

                  {po.status === 'pending' && (
                    <>
                      <button 
                        className="btn-small btn-success"
                        onClick={() => handleReceivePO(po._id)}
                      >
                        Terima
                      </button>
                      <button 
                        className="btn-small btn-danger"
                        onClick={() => handleCancelPO(po._id)}
                      >
                        Batalkan
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showDetail && selectedPO && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedPO.poNumber}</h2>
              <button className="close-btn" onClick={() => setShowDetail(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-info">
                <div className="info-pair">
                  <span className="label">Supplier:</span>
                  <span>{selectedPO.supplier?.name}</span>
                </div>
                <div className="info-pair">
                  <span className="label">Status:</span>
                  <span className="badge" style={{backgroundColor: getStatusColor(selectedPO.status)}}>
                    {selectedPO.status}
                  </span>
                </div>
                <div className="info-pair">
                  <span className="label">Order Date:</span>
                  <span>{new Date(selectedPO.orderDate).toLocaleDateString('id-ID')}</span>
                </div>
                <div className="info-pair">
                  <span className="label">Expected Date:</span>
                  <span>{new Date(selectedPO.expectedDate).toLocaleDateString('id-ID')}</span>
                </div>
              </div>

              <h3 style={{marginTop: '20px'}}>Item Detail</h3>
              <table className="detail-table">
                <thead>
                  <tr>
                    <th>Bahan</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Harga Satuan</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPO.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.ingredientId?.name || 'Unknown'}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unit}</td>
                      <td>Rp {item.unitPrice.toLocaleString('id-ID')}</td>
                      <td>Rp {(item.quantity * item.unitPrice).toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="total-row">
                <strong>Total: Rp {getPOTotal(selectedPO).toLocaleString('id-ID')}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPurchaseOrdersPage;
