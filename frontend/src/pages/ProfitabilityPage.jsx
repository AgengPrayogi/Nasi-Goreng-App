import React, { useState, useEffect } from 'react';
import api from '../api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

function ProfitabilityPage() {
  const [profitabilityData, setProfitabilityData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('netMarginPercent');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [profitRes, catRes] = await Promise.all([
        api.get('/analytics/profitability/all'),
        api.get('/analytics/profitability/by-category')
      ]);
      setProfitabilityData(profitRes.data.data || []);
      setCategoryData(catRes.data.data || []);
    } catch (err) {
      setError('Gagal memuat data profitabilitas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);
  };

  const sortedData = [...profitabilityData].sort((a, b) => {
    const valA = a[sortBy] || 0;
    const valB = b[sortBy] || 0;
    return sortDir === 'desc' ? valB - valA : valA - valB;
  });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Memuat data profitabilitas...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Menu Profitability Analysis</h1>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded">{error}</div>
      )}

      {/* Summary Cards */}
      {profitabilityData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total Menu Dianalisis</div>
            <div className="text-2xl font-bold">{profitabilityData.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Rata-rata Margin Bersih</div>
            <div className="text-2xl font-bold text-green-600">
              {Math.round(profitabilityData.reduce((s, m) => s + (m.netMarginPercent || 0), 0) / profitabilityData.length)}%
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Menu dengan Margin Terbaik</div>
            <div className="text-2xl font-bold text-green-600">{profitabilityData[0]?.name || '-'}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Menu Perlu Evaluasi</div>
            <div className="text-2xl font-bold text-red-600">
              {profitabilityData.filter(m => (m.netMarginPercent || 0) < 20).length}
            </div>
          </div>
        </div>
      )}

      {/* Category Profitability */}
      {categoryData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-4">Profitability by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="avgMargin" fill="#0088FE" name="Avg Margin %" />
              <Bar dataKey="totalRevenue" fill="#00C49F" name="Total Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Menu Profitability Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Menu Profitability Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 cursor-pointer" onClick={() => handleSort('name')}>
                  Menu Name {sortBy === 'name' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th className="text-right px-4 py-3 cursor-pointer" onClick={() => handleSort('currentPrice')}>
                  Price {sortBy === 'currentPrice' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th className="text-right px-4 py-3 cursor-pointer" onClick={() => handleSort('grossMarginPercent')}>
                  Gross Margin {sortBy === 'grossMarginPercent' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th className="text-right px-4 py-3 cursor-pointer" onClick={() => handleSort('netMarginPercent')}>
                  Net Margin {sortBy === 'netMarginPercent' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th className="text-right px-4 py-3 cursor-pointer" onClick={() => handleSort('totalSales')}>
                  Total Sold {sortBy === 'totalSales' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th className="text-right px-4 py-3 cursor-pointer" onClick={() => handleSort('totalRevenue')}>
                  Total Revenue {sortBy === 'totalRevenue' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th className="text-center px-4 py-3">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((item, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(item.currentPrice)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${item.grossMarginPercent >= 40 ? 'text-green-600' : item.grossMarginPercent >= 20 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {item.grossMarginPercent}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${item.netMarginPercent >= 30 ? 'text-green-600' : item.netMarginPercent >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {item.netMarginPercent}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{item.totalSales}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(item.totalRevenue)}</td>
                  <td className="px-4 py-3 text-center">
                    {item.recommendation && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        item.recommendation.priority === 'high' ? 'bg-red-100 text-red-700' :
                        item.recommendation.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {item.recommendation.action === 'increase_price' ? '⚠️ Naikkan Harga' :
                         item.recommendation.action === 'promote' ? '📢 Promosikan' :
                         '✅ Pertahankan'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {sortedData.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-400">
                    Belum ada data profitabilitas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Margin Distribution Pie */}
      {sortedData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-4">Net Margin Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'High (>30%)', value: sortedData.filter(m => (m.netMarginPercent || 0) >= 30).length },
                    { name: 'Medium (10-30%)', value: sortedData.filter(m => (m.netMarginPercent || 0) >= 10 && (m.netMarginPercent || 0) < 30).length },
                    { name: 'Low (<10%)', value: sortedData.filter(m => (m.netMarginPercent || 0) < 10).length }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                >
                  {[0, 1, 2].map((idx) => (
                    <Cell key={`cell-${idx}`} fill={['#00C49F', '#FFBB28', '#FF8042'][idx]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-4">Revenue vs Margin Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sortedData.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalRevenue" fill="#0088FE" name="Revenue" />
                <Bar dataKey="netMarginPercent" fill="#00C49F" name="Net Margin %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfitabilityPage;
