import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api.js'

export default function ReportsPage() {
  const queryClient = useQueryClient()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('sales')
  const [exportFormat, setExportFormat] = useState('json')
  const [customReport, setCustomReport] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  const queryParams = {}
  if (dateFrom) queryParams.from = dateFrom
  if (dateTo) queryParams.to = dateTo

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['reports', 'templates'],
    queryFn: async () => { const res = await api.get('/reports/templates'); return res.data.data },
  })

  const { data: salesData, isLoading: salesLoading, refetch: refetchSales } = useQuery({
    queryKey: ['reports', 'sales', queryParams],
    queryFn: async () => { const res = await api.get('/reports/sales', { params: queryParams }); return res.data },
    enabled: selectedTemplate === 'sales',
  })

  const { data: topMenusData, isLoading: topLoading, refetch: refetchTop } = useQuery({
    queryKey: ['reports', 'top-menus', queryParams],
    queryFn: async () => { const res = await api.get('/reports/top-menus', { params: queryParams }); return res.data },
    enabled: selectedTemplate === 'sales',
  })

  const fmt = (price) => {
    if (price == null) return '-'
    return `Rp ${Number(price).toLocaleString('id-ID')}`
  }

  async function handleGenerateReport() {
    setError('')
    try {
      const path = `/reports/${selectedTemplate}`
      const res = await api.get(path, { params: queryParams })
      setCustomReport(res.data.data)
    } catch (err) {
      setError('Gagal generate report')
      console.error(err)
    }
  }

  async function handleExport() {
    setExporting(true)
    setError('')
    try {
      const res = await api.post('/reports/export', {
        templateName: selectedTemplate,
        format: exportFormat,
        ...queryParams
      }, { responseType: exportFormat === 'pdf' ? 'blob' : 'text' })

      const blob = exportFormat === 'pdf'
        ? new Blob([res.data], { type: 'application/pdf' })
        : new Blob([res.data], { type: 'text/plain' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${selectedTemplate}-${Date.now()}.${exportFormat === 'pdf' ? 'pdf' : exportFormat}`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Gagal export report')
      console.error(err)
    } finally {
      setExporting(false)
    }
  }

  const summary = salesData?.data?.summary

  /* ── Page header ─────────────────────────── */
  return (
    <div>
      <div className="page-header" style={{ animation: 'fadeInDown 0.4s ease' }}>
        <div>
          <h2 style={{ margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📑 Advanced Reports
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
            Generate, preview & export reports
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button className="btn btn-black btn-sm" onClick={() => { refetchSales(); refetchTop(); }}>🔄</button>
        </div>
      </div>

      {/* ── Error ───────────────────────────── */}
      {error && (
        <div className="card card-accent-red" style={{ marginBottom: '1.5rem', border: '2px solid var(--red)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: 'var(--red)', fontWeight: 'bold', margin: 0 }}>{error}</p>
            <button className="btn btn-sm btn-red" onClick={() => setError('')}>✕</button>
          </div>
        </div>
      )}

      {/* ── Report Generator ────────────────── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Report Generator</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0, minWidth: '180px' }}>
            <label>Report Type</label>
            <select value={selectedTemplate} onChange={(e) => { setSelectedTemplate(e.target.value); setCustomReport(null); }}>
              {(templates || []).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>From Date</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>To Date</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: '140px' }}>
            <label>Export Format</label>
            <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
          <button className="btn btn-red" onClick={handleGenerateReport}>Generate</button>
          <button className="btn btn-green" style={{ background: '#43a047', color: '#fff' }} onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export'}
          </button>
        </div>
        {(templates || []).find((t) => t.id === selectedTemplate) && (
          <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: '0.75rem' }}>
            {(templates || []).find((t) => t.id === selectedTemplate)?.description}
          </p>
        )}
      </div>

      {/* ── Generated Report Preview ────────── */}
      {customReport && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ color: 'var(--black)', margin: 0 }}>Generated: {customReport.reportType || selectedTemplate}</h3>
            <span className="badge badge-green">Preview</span>
          </div>
          <pre style={{
            background: 'var(--gray-50)', padding: '1rem', borderRadius: '8px',
            overflow: 'auto', maxHeight: '300px', fontSize: '0.8rem',
            border: '1px solid var(--gray-200)',
          }}>
            {JSON.stringify(customReport, null, 2)}
          </pre>
        </div>
      )}

      {/* ── Sales Summary & Top Menus ───────── */}
      {(selectedTemplate === 'sales' || customReport) && (
        <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
          <div className="card card-accent-red">
            <h3 style={{ color: 'var(--red-dark)', marginBottom: '1rem' }}>Sales Summary</h3>
            {salesLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" /></div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--gray-50)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Total Orders</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{summary?.orderCount ?? '-'}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--gray-50)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Total Revenue</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--red)' }}>{fmt(summary?.totalAmount)}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--gray-50)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Avg Order</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{fmt(summary?.averageOrderValue)}</div>
                </div>
              </div>
            )}
          </div>

          <div className="card card-accent-yellow">
            <h3 style={{ color: 'var(--yellow-dark)', marginBottom: '1rem' }}>Top Menus</h3>
            {topLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" /></div>
            ) : topMenusData?.data?.items?.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Menu</th>
                      <th>Qty</th>
                      <th>Revenue</th>
                      <th>Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topMenusData.data.items.slice(0, 5).map((item) => (
                      <tr key={item.menuId}>
                        <td><strong>{item.name}</strong></td>
                        <td>{item.totalQuantity}</td>
                        <td style={{ fontWeight: 'bold' }}>{fmt(item.totalRevenue)}</td>
                        <td style={{ color: '#43a047', fontWeight: 'bold' }}>{fmt(item.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--gray-500)', textAlign: 'center', padding: '2rem' }}>No data available.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Available Templates ─────────────── */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>📋 Available Report Templates</h3>
        {templatesLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" /></div>
        ) : (
          <div className="grid-2">
            {(templates || []).map((t) => (
              <div
                key={t.id}
                onClick={() => { setSelectedTemplate(t.id); setCustomReport(null); }}
                style={{
                  padding: '1rem', border: selectedTemplate === t.id ? '2px solid var(--red)' : '1px solid var(--gray-200)',
                  borderRadius: '8px', cursor: 'pointer', background: selectedTemplate === t.id ? '#fff5f5' : 'var(--white)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>📄</span>
                  <strong>{t.name}</strong>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', margin: '0.5rem 0 0' }}>{t.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}