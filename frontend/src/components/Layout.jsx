import { Outlet, Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api.js'

const navGroups = [
  {
    id: 'operasional',
    label: 'Operasional',
    icon: '⚙️',
    links: [
      { to: '/admin/dashboard', label: 'Ringkasan', icon: '📊' },
      { to: '/admin/orders', label: 'Pesanan', icon: '📋' },
      { to: '/admin/kitchen', label: 'Dapur', icon: '🍳' },
      { to: '/admin/ingredients', label: 'Bahan baku', icon: '🥘' },
      { to: '/admin/menus', label: 'Menu', icon: '📜' },
      { to: '/admin/stock-movements', label: 'Pergerakan stok', icon: '📦' },
      { to: '/admin/finance', label: 'Keuangan', icon: '💳' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: '👤',
    links: [
      { to: '/admin/staff', label: 'Staf', icon: '👥' },
      { to: '/admin/customers', label: 'Pelanggan', icon: '🤝' },
      { to: '/admin/suppliers', label: 'Pemasok', icon: '🚚' },
      { to: '/admin/purchase-orders', label: 'Pesanan pembelian', icon: '📑' },
      { to: '/admin/reconciliation', label: 'Rekonsiliasi', icon: '🔄' },
      { to: '/admin/tables', label: 'Meja', icon: '🪑' },
      { to: '/admin/reservations', label: 'Reservasi', icon: '📅' },
      { to: '/admin/marketplace', label: 'Marketplace', icon: '🛵' },
      { to: '/admin/alerts', label: 'Peringatan', icon: '🔔' },
    ],
  },
  {
    id: 'bi',
    label: 'BI',
    icon: '🧠',
    links: [
      { to: '/admin/analytics', label: 'Analitik', icon: '📈' },
      { to: '/admin/analytics/profitability', label: 'Profitabilitas', icon: '💰' },
      { to: '/admin/analytics/customers', label: 'BI pelanggan', icon: '🎯' },
      { to: '/admin/analytics/forecasting', label: 'Peramalan', icon: '🔮' },
      { to: '/admin/analytics/inventory', label: 'BI inventaris', icon: '📊' },
      { to: '/admin/analytics/financial', label: 'BI keuangan', icon: '🏦' },
      { to: '/admin/analytics/campaigns', label: 'Kampanye', icon: '📣' },
      { to: '/admin/reports', label: 'Laporan', icon: '📄' },
    ],
  },
]

export default function Layout() {
  const location = useLocation()
  const currentPath = location.pathname
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768)
  const [expandedGroup, setExpandedGroup] = useState(() => (
    navGroups.find((group) => group.links.some((link) => (
      currentPath === link.to || currentPath.startsWith(`${link.to}/`)
    )))?.id || 'operasional'
  ))
  const [scrolled, setScrolled] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsForm, setSettingsForm] = useState({
    openingHours: [{ open: '11:00', close: '14:00' }, { open: '17:00', close: '24:00' }],
    location: 'JL Otista Raya No. 131 A, Jatinegara, Jakarta Timur',
    manualStatus: 'auto',
  })
  const [now, setNow] = useState(new Date())
  const queryClient = useQueryClient()
  const pendingOrdersQuery = useQuery({
    queryKey: ['header-pending-orders'],
    queryFn: async () => (await api.get('/orders', { params: { status: 'pending', limit: 1 } })).data,
    refetchInterval: 30000,
  })
  const lowStockQuery = useQuery({
    queryKey: ['header-low-stock'],
    queryFn: async () => (await api.get('/ingredients/low-stock')).data,
    refetchInterval: 60000,
  })
  const profileQuery = useQuery({
    queryKey: ['admin-profile'],
    queryFn: async () => (await api.get('/auth/me')).data.data,
    staleTime: 300000,
  })
  const storeSettingsQuery = useQuery({
    queryKey: ['store-settings'],
    queryFn: async () => (await api.get('/store-settings')).data.data,
    refetchInterval: 60000,
  })
  const storeSettingsMutation = useMutation({
    mutationFn: (data) => api.patch('/store-settings', data),
    onSuccess: ({ data }) => {
      queryClient.setQueryData(['store-settings'], data.data)
      queryClient.invalidateQueries({ queryKey: ['store-settings'] })
    },
    onError: () => setSettingsOpen(true),
  })

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (storeSettingsQuery.data) {
      setSettingsForm({
        openingHours: storeSettingsQuery.data.openingHours?.length
          ? storeSettingsQuery.data.openingHours
          : [{ open: '', close: '' }, { open: '', close: '' }],
        location: storeSettingsQuery.data.location || '',
        manualStatus: storeSettingsQuery.data.manualStatus || 'auto',
      })
    }
  }, [storeSettingsQuery.data])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const activeGroup = navGroups.find((group) => group.links.some((link) => (
      currentPath === link.to || currentPath.startsWith(`${link.to}/`)
    )))
    if (activeGroup) setExpandedGroup(activeGroup.id)
  }, [currentPath])

  const handleLogout = () => {
    localStorage.removeItem('jwt')
    localStorage.removeItem('adminToken')
    window.location.href = '/admin/login'
  }

  const isActive = (path) => path === '/admin/analytics'
    ? currentPath === path
    : currentPath === path || currentPath.startsWith(`${path}/`)

  const orderCount = Number(pendingOrdersQuery.data?.meta?.total || 0)
  const lowStockCount = Array.isArray(lowStockQuery.data?.data) ? lowStockQuery.data.data.length : 0
  const storeSettings = storeSettingsQuery.data
  const statusText = storeSettings?.isOpen === true ? 'Buka' : storeSettings?.isOpen === false ? 'Tutup' : 'Jam belum diatur'
  const clockTime = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)
  const clockDate = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'short', day: '2-digit', month: 'short' }).format(now)
  const updateSchedule = (index, key, value) => {
    setSettingsForm((current) => ({
      ...current,
      openingHours: current.openingHours.map((session, sessionIndex) => (
        sessionIndex === index ? { ...session, [key]: value } : session
      )),
    }))
  }

  return (
    <div className="admin-shell">
      <header className={`admin-topbar${scrolled ? ' is-scrolled' : ''}`}>
        <div className="topbar-main">
          <button
            className="sidebar-toggle"
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={sidebarOpen ? 'Tutup sidebar' : 'Buka sidebar'}
            aria-expanded={sidebarOpen}
            aria-controls="admin-sidebar"
          >
            <span>{sidebarOpen ? '✕' : '☰'}</span>
          </button>
          <Link to="/" className="brand-link" aria-label="Nasi Goreng Polonia, beranda">
            <span aria-hidden="true">🍛</span>
            <span>Nasi Goreng Polonia</span>
          </Link>
          <div className="profile-wrap">
            <button className="profile-trigger" type="button" onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen}>
              <span className="profile-avatar">{(profileQuery.data?.email || 'A').slice(0, 1).toUpperCase()}</span>
              <span className="profile-trigger-label">{profileQuery.data?.email?.split('@')[0] || 'Admin'}</span>
              <span aria-hidden="true">⌄</span>
            </button>
            {profileOpen && (
              <div className="profile-menu">
                <div className="profile-identity">
                  <strong>{profileQuery.data?.email || 'Akun admin'}</strong>
                  <small>{profileQuery.data?.role || 'Admin'}</small>
                </div>
                <Link to="/admin/profile" onClick={() => setProfileOpen(false)}>Profil</Link>
                <Link to="/admin/profile#password" onClick={() => setProfileOpen(false)}>Ganti password</Link>
                <button type="button" onClick={handleLogout}>Keluar</button>
              </div>
            )}
          </div>
        </div>

        <div className="header-info-row">
          <div className="store-info">
            <button
              type="button"
              className={`store-status${storeSettings?.isOpen === true ? ' is-open' : storeSettings?.isOpen === false ? ' is-closed' : ' is-unset'}`}
              onClick={() => {
                if (storeSettings?.isOpen === null || storeSettings === undefined) {
                  setSettingsOpen(true)
                  return
                }
                storeSettingsMutation.mutate({ manualStatus: storeSettings.isOpen ? 'closed' : 'open' })
              }}
              disabled={storeSettingsMutation.isPending}
              title="Klik untuk mengubah status buka/tutup secara manual"
            >
              <span className="status-dot">●</span> {statusText}
            </button>
            <span className="store-hours">{storeSettings?.hoursSummary || 'Memuat jam operasional…'}</span>
            <button type="button" className="store-settings-button" onClick={() => setSettingsOpen(true)} aria-label="Atur jam buka dan lokasi" title="Atur jam buka dan lokasi">⚙</button>
            <a
              className="store-location"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeSettings?.location || 'JL Otista Raya No. 131 A, Jatinegara, Jakarta Timur')}`}
              target="_blank"
              rel="noreferrer"
              title={storeSettings?.location || 'Lokasi toko'}
            >
              📍 <span>{storeSettings?.location || 'JL Otista Raya No. 131 A, Jatinegara, Jakarta Timur'}</span>
            </a>
          </div>
          <div className="header-actions">
            <div className="header-clock" aria-label={`Waktu Jakarta ${clockTime}, ${clockDate}`}>
              <strong>{clockTime}</strong><span>{clockDate} WIB</span>
            </div>
            <Link className="header-icon-action" to="/admin/orders" aria-label={`${orderCount} pesanan pending`} title={`${orderCount} pesanan pending`}>
              <span aria-hidden="true">🔔</span>
              {orderCount > 0 && <span className="action-badge">{orderCount > 99 ? '99+' : orderCount}</span>}
            </Link>
            <Link className={`header-icon-action stock-action${lowStockCount ? ' has-warning' : ''}`} to="/admin/ingredients" aria-label={`${lowStockCount} bahan stok menipis`} title={`${lowStockCount} bahan stok menipis`}>
              <span aria-hidden="true">⚠️</span>
              {lowStockCount > 0 && <span className="action-badge">{lowStockCount > 99 ? '99+' : lowStockCount}</span>}
            </Link>
            <Link className="new-order-button" to="/admin/orders/new">＋ <span>Pesanan baru</span></Link>
          </div>
        </div>
      </header>

      <div className="admin-workspace">
        {sidebarOpen && (
          <>
            <button
              className="sidebar-backdrop"
              type="button"
              aria-label="Tutup sidebar"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="admin-sidebar" id="admin-sidebar" aria-label="Navigasi admin">
              <div className="sidebar-heading">Navigasi</div>
              {navGroups.map((group) => {
                const groupIsActive = group.links.some((link) => isActive(link.to))
                const isExpanded = expandedGroup === group.id
                return (
                  <section className="nav-category" key={group.id}>
                    <button
                      className={`category-toggle${groupIsActive ? ' is-active' : ''}`}
                      type="button"
                      onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                      aria-expanded={isExpanded}
                    >
                      <span className="category-icon" aria-hidden="true">{group.icon}</span>
                      <span>{group.label}</span>
                      <span className="category-chevron" aria-hidden="true">{isExpanded ? '⌄' : '›'}</span>
                    </button>
                    {isExpanded && (
                      <nav className="category-links" aria-label={group.label}>
                        {group.links.map((link) => (
                          <Link
                            key={link.to}
                            to={link.to}
                            className={`category-link${isActive(link.to) ? ' is-current' : ''}`}
                            aria-current={isActive(link.to) ? 'page' : undefined}
                            onClick={() => {
                              if (window.innerWidth <= 768) setSidebarOpen(false)
                            }}
                          >
                            <span aria-hidden="true">{link.icon}</span>
                            <span>{link.label}</span>
                          </Link>
                        ))}
                      </nav>
                    )}
                  </section>
                )
              })}
            </aside>
          </>
        )}

        <main className="admin-main">
          <div className="container">
            <div className="page-enter"><Outlet /></div>
          </div>
        </main>
      </div>

      {settingsOpen && (
        <div className="store-settings-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSettingsOpen(false)
        }}>
          <section className="store-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="store-settings-title">
            <div className="settings-dialog-heading">
              <div><h2 id="store-settings-title">Informasi toko</h2><p>Atur jadwal dan lokasi yang tampil di header.</p></div>
              <button type="button" className="settings-close" onClick={() => setSettingsOpen(false)} aria-label="Tutup">×</button>
            </div>
            <form onSubmit={(event) => {
              event.preventDefault()
              storeSettingsMutation.mutate(settingsForm, { onSuccess: () => setSettingsOpen(false) })
            }}>
              <h3>Jam operasional harian</h3>
              {settingsForm.openingHours.map((session, index) => (
                <div className="hours-session" key={index}>
                  <strong>Sesi {index + 1}</strong>
                  <label>Mulai<input type="text" inputMode="numeric" pattern="(?:[01]\d|2[0-3]):[0-5]\d|24:00" placeholder="11:00" required value={session.open} onChange={(event) => updateSchedule(index, 'open', event.target.value)} /></label>
                  <label>Tutup<input type="text" inputMode="numeric" pattern="(?:[01]\d|2[0-3]):[0-5]\d|24:00" placeholder="14:00" required value={session.close} onChange={(event) => updateSchedule(index, 'close', event.target.value)} /></label>
                </div>
              ))}
              <p className="settings-help">Gunakan format HH:MM. Untuk tutup tengah malam, isi 24:00.</p>
              <label className="settings-field">Lokasi toko
                <input type="text" maxLength="300" value={settingsForm.location} onChange={(event) => setSettingsForm((form) => ({ ...form, location: event.target.value }))} />
              </label>
              <label className="settings-field">Status operasional
                <select value={settingsForm.manualStatus} onChange={(event) => setSettingsForm((form) => ({ ...form, manualStatus: event.target.value }))}>
                  <option value="auto">Otomatis mengikuti jadwal</option>
                  <option value="open">Buka manual</option>
                  <option value="closed">Tutup manual</option>
                </select>
              </label>
              {storeSettingsMutation.isError && <p role="alert" className="settings-error">Pengaturan toko gagal disimpan. Periksa koneksi lalu coba lagi.</p>}
              <div className="settings-dialog-actions">
                <button type="button" className="btn btn-gray" onClick={() => setSettingsOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-red" disabled={storeSettingsMutation.isPending}>{storeSettingsMutation.isPending ? 'Menyimpan…' : 'Simpan pengaturan'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      <style>{`
        .admin-shell {
          min-height: 100vh;
          background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%);
        }
        .admin-topbar {
          position: sticky;
          top: 0;
          z-index: 120;
          padding: 0.55rem 1.25rem 0.65rem;
          color: var(--white);
          background: linear-gradient(115deg, var(--black) 0%, #272323 48%, var(--red-dark) 100%);
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          transition: background 0.2s ease, box-shadow 0.2s ease;
        }
        .topbar-main { min-height: 52px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; }
        .header-info-row { min-height: 38px; display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding-top: 0.45rem; border-top: 1px solid rgba(255,255,255,0.11); }
        .store-info, .header-actions { display: flex; align-items: center; gap: 0.65rem; min-width: 0; }
        .store-info { flex: 1 1 auto; }
        .header-actions { flex: 0 0 auto; }
        .admin-topbar.is-scrolled {
          background: linear-gradient(115deg, var(--black) 0%, #1a1a1a 100%);
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .sidebar-toggle, .profile-trigger {
          min-height: 40px;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          color: white;
          cursor: pointer;
          transition: background 0.18s ease, transform 0.18s ease;
        }
        .sidebar-toggle {
          justify-self: start;
          width: 42px;
          background: rgba(255,255,255,0.1);
          font-size: 1.1rem;
        }
        .sidebar-toggle:hover { background: rgba(255,255,255,0.2); }
        .brand-link {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          color: var(--yellow);
          font-size: 1.12rem;
          font-weight: 700;
          text-decoration: none;
          white-space: nowrap;
        }
        .brand-link > span:first-child { font-size: 1.4rem; }
        .admin-workspace { display: flex; min-height: calc(100vh - 112px); }
        .profile-wrap { position: relative; justify-self: end; }
        .profile-trigger { display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0.55rem; background: rgba(255,255,255,0.08); font-size: 0.82rem; }
        .profile-trigger:hover { background: rgba(255,255,255,0.17); }
        .profile-avatar { display: grid; place-items: center; width: 29px; height: 29px; border-radius: 50%; background: var(--yellow); color: #332800; font-weight: 800; }
        .profile-menu { position: absolute; right: 0; top: calc(100% + 0.5rem); z-index: 150; width: 230px; padding: 0.45rem; border: 1px solid #eee; border-radius: 10px; background: white; box-shadow: 0 12px 32px rgba(0,0,0,0.18); }
        .profile-identity { display: flex; flex-direction: column; gap: 0.2rem; padding: 0.65rem; border-bottom: 1px solid #eee; color: #333; overflow-wrap: anywhere; }
        .profile-identity strong { font-size: 0.78rem; }
        .profile-identity small { color: #777; }
        .profile-menu a, .profile-menu button { display: block; width: 100%; padding: 0.65rem; border: 0; border-radius: 6px; background: transparent; color: #444; font: inherit; font-size: 0.85rem; text-align: left; text-decoration: none; cursor: pointer; }
        .profile-menu a:hover, .profile-menu button:hover { background: #f6f6f6; color: var(--red); }
        .profile-menu button { color: var(--red); }
        .store-status { flex: 0 0 auto; padding: 0.32rem 0.65rem; border: 1px solid transparent; border-radius: 999px; font: inherit; font-size: 0.76rem; font-weight: 700; cursor: pointer; }
        .store-status.is-open { color: #c9f4d2; background: rgba(46,125,50,0.28); border-color: rgba(129,199,132,0.4); }
        .store-status.is-closed { color: #ffd5d8; background: rgba(198,40,40,0.28); border-color: rgba(239,83,80,0.38); }
        .store-status.is-unset { color: #ffe8a8; background: rgba(255,193,7,0.15); border-color: rgba(255,224,130,0.3); }
        .status-dot { font-size: 0.65rem; }
        .store-hours { flex: 0 0 auto; color: rgba(255,255,255,0.86); font-size: 0.77rem; white-space: nowrap; }
        .store-settings-button { padding: 0.28rem 0.42rem; border: 0; border-radius: 6px; background: rgba(255,255,255,0.1); color: white; cursor: pointer; }
        .store-settings-button:hover { background: rgba(255,255,255,0.22); }
        .store-location { display: flex; align-items: center; gap: 0.25rem; min-width: 0; color: rgba(255,255,255,0.78); font-size: 0.72rem; text-decoration: none; }
        .store-location span { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .store-location:hover { color: white; text-decoration: underline; }
        .header-clock { display: flex; flex-direction: column; align-items: flex-end; min-width: 68px; line-height: 1.15; }
        .header-clock strong { color: var(--yellow); font-size: 0.9rem; font-variant-numeric: tabular-nums; }
        .header-clock span { color: rgba(255,255,255,0.62); font-size: 0.61rem; white-space: nowrap; }
        .header-icon-action { position: relative; display: grid; place-items: center; width: 34px; height: 34px; border: 1px solid rgba(255,255,255,0.18); border-radius: 8px; background: rgba(255,255,255,0.08); text-decoration: none; }
        .header-icon-action:hover { background: rgba(255,255,255,0.18); }
        .action-badge { position: absolute; top: -6px; right: -7px; min-width: 17px; padding: 1px 4px; border-radius: 999px; background: #d41137; color: white; font-size: 0.62rem; font-weight: 800; text-align: center; }
        .stock-action.has-warning .action-badge { background: #e08000; }
        .new-order-button { display: inline-flex; align-items: center; gap: 0.2rem; padding: 0.48rem 0.72rem; border-radius: 7px; background: var(--yellow); color: #302500; font-size: 0.76rem; font-weight: 800; text-decoration: none; white-space: nowrap; }
        .new-order-button:hover { background: #ffe45c; }
        .store-settings-backdrop { position: fixed; inset: 0; z-index: 250; display: grid; place-items: center; padding: 1rem; background: rgba(0,0,0,0.55); }
        .store-settings-dialog { width: min(560px, 100%); max-height: 90vh; overflow: auto; padding: 1.35rem; border-radius: 12px; background: white; box-shadow: 0 20px 50px rgba(0,0,0,0.25); color: #282828; }
        .settings-dialog-heading { display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
        .settings-dialog-heading h2 { margin: 0; }
        .settings-dialog-heading p, .settings-help { margin: 0.3rem 0 0.9rem; color: #777; font-size: 0.82rem; }
        .settings-close { width: 34px; height: 34px; border: 0; border-radius: 7px; background: #f2f2f2; font-size: 1.4rem; cursor: pointer; }
        .store-settings-dialog h3 { margin: 1rem 0 0.6rem; font-size: 0.95rem; }
        .hours-session { display: grid; grid-template-columns: 70px 1fr 1fr; align-items: end; gap: 0.75rem; margin: 0.65rem 0; }
        .hours-session strong { padding-bottom: 0.55rem; font-size: 0.83rem; }
        .hours-session label, .settings-field { display: flex; flex-direction: column; gap: 0.35rem; color: #555; font-size: 0.78rem; font-weight: 600; }
        .hours-session input, .settings-field input, .settings-field select { width: 100%; min-height: 40px; padding: 0.55rem 0.65rem; border: 1px solid #ddd; border-radius: 6px; color: #333; font: inherit; }
        .settings-field { margin: 0.8rem 0; }
        .settings-error { color: var(--red); font-size: 0.85rem; }
        .settings-dialog-actions { display: flex; justify-content: flex-end; gap: 0.6rem; margin-top: 1.1rem; }
        .admin-sidebar {
          position: sticky;
          top: 115px;
          flex: 0 0 270px;
          width: 270px;
          height: calc(100vh - 115px);
          overflow-y: auto;
          padding: 1rem 0.75rem 1.5rem;
          background: #fff;
          border-right: 1px solid #e7e7e7;
          box-shadow: 3px 0 14px rgba(0,0,0,0.035);
          z-index: 110;
        }
        .sidebar-heading {
          padding: 0.45rem 0.65rem 0.85rem;
          color: #929292;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .nav-category { margin-bottom: 0.45rem; }
        .category-toggle {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          width: 100%;
          min-height: 46px;
          padding: 0.65rem 0.7rem;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: #333;
          font: inherit;
          font-size: 0.92rem;
          font-weight: 700;
          text-align: left;
          cursor: pointer;
        }
        .category-toggle:hover { background: #f6f6f6; }
        .category-toggle.is-active { color: var(--red); }
        .category-icon { width: 22px; text-align: center; }
        .category-chevron { margin-left: auto; color: #888; font-size: 1.25rem; }
        .category-links {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          margin: 0.2rem 0 0.6rem 1.15rem;
          padding-left: 0.8rem;
          border-left: 1px solid #e6e6e6;
        }
        .category-link {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          min-height: 38px;
          padding: 0.5rem 0.65rem;
          border-radius: 7px;
          color: #696969;
          font-size: 0.84rem;
          text-decoration: none;
          transition: color 0.15s ease, background 0.15s ease;
        }
        .category-link:hover { color: var(--red); background: #fff5f5; }
        .category-link.is-current {
          color: #b20e2e;
          background: #fff0f2;
          font-weight: 700;
        }
        .admin-main {
          flex: 1;
          min-width: 0;
          padding: 1.5rem;
          background: linear-gradient(135deg, var(--gray-50) 0%, #f0f0f0 100%);
        }
        .sidebar-backdrop { display: none; }
        @media (max-width: 980px) {
          .header-info-row { flex-wrap: wrap; }
          .store-info, .header-actions { flex-basis: 100%; justify-content: space-between; }
          .store-info { flex-wrap: wrap; }
        }
        @media (max-width: 768px) {
          .admin-topbar { padding: 0.4rem 0.65rem 0.55rem; }
          .topbar-main { min-height: 46px; }
          .brand-link { font-size: 0.9rem; gap: 0.35rem; }
          .brand-link > span:first-child { font-size: 1.15rem; }
          .profile-trigger { min-height: 36px; padding: 0.2rem 0.35rem; }
          .profile-trigger-label { display: none; }
          .header-info-row { align-items: stretch; gap: 0.55rem; }
          .store-info { gap: 0.45rem; }
          .store-location { flex-basis: 100%; }
          .store-location span { max-width: calc(100vw - 3rem); }
          .header-actions { flex-wrap: nowrap; justify-content: flex-start; gap: 0.45rem; overflow-x: auto; padding: 0.15rem 0.1rem 0.25rem; }
          .admin-workspace { min-height: calc(100vh - 168px); }
          .admin-sidebar {
            position: fixed;
            top: 168px;
            bottom: 0;
            left: 0;
            width: min(300px, 86vw);
            height: auto;
            z-index: 115;
          }
          .sidebar-backdrop {
            display: block;
            position: fixed;
            inset: 168px 0 0;
            z-index: 105;
            width: 100%;
            border: 0;
            background: rgba(0,0,0,0.38);
          }
          .admin-main { padding: 1rem 0.75rem; }
        }
        @media (max-width: 380px) {
          .brand-link { font-size: 0.76rem; }
          .header-clock span { font-size: 0.55rem; }
          .store-hours { font-size: 0.7rem; }
          .new-order-button span { display: none; }
        }
      `}</style>
    </div>
  )
}
