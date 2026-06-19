import { Outlet, Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'

export default function Layout() {
  const location = useLocation()
  const currentPath = location.pathname
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('jwt')
    window.location.href = '/admin/login'
  }

  const navGroups = [
    {
      label: 'Operational',
      icon: '⚙️',
      links: [
        { to: '/admin/dashboard', label: 'Executive', icon: '📊' },
        { to: '/admin/orders', label: 'Orders', icon: '📋' },
        { to: '/admin/kitchen', label: 'Kitchen', icon: '🍳' },
        { to: '/admin/ingredients', label: 'Ingredients', icon: '🥘' },
        { to: '/admin/menus', label: 'Menus', icon: '📜' },
        { to: '/admin/stock-movements', label: 'Stock', icon: '📦' },
      ]
    },
    {
      label: 'Admin',
      icon: '👤',
      links: [
        { to: '/admin/staff', label: 'Staff', icon: '👥' },
        { to: '/admin/customers', label: 'Customers', icon: '🤝' },
        { to: '/admin/suppliers', label: 'Suppliers', icon: '🚚' },
        { to: '/admin/purchase-orders', label: 'PO', icon: '📑' },
        { to: '/admin/reconciliation', label: 'Reconciliation', icon: '🔄' },
      ]
    },
    {
      label: 'Business Intelligence',
      icon: '🧠',
      links: [
        { to: '/admin/analytics', label: 'Analytics', icon: '📈' },
        { to: '/admin/analytics/profitability', label: 'Profitability', icon: '💰' },
        { to: '/admin/analytics/customers', label: 'Customers BI', icon: '🎯' },
        { to: '/admin/analytics/forecasting', label: 'Forecasting', icon: '🔮' },
        { to: '/admin/analytics/inventory', label: 'Inventory BI', icon: '📊' },
        { to: '/admin/analytics/financial', label: 'Financial BI', icon: '🏦' },
        { to: '/admin/analytics/campaigns', label: 'Campaigns', icon: '📣' },
        { to: '/admin/reports', label: 'Reports', icon: '📄' },
        { to: '/admin/alerts', label: 'Alerts', icon: '🔔' },
        { to: '/admin/finance', label: 'Finance', icon: '💳' },
      ]
    }
  ]

  const isActive = (path) => currentPath === path || currentPath.startsWith(path + '/')

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)'
    }}>
      {/* Header */}
      <header style={{ 
        background: scrolled 
          ? 'linear-gradient(135deg, var(--black) 0%, #1a1a1a 100%)' 
          : 'linear-gradient(135deg, var(--black) 0%, #2c2c2c 50%, var(--red-dark) 100%)',
        color: 'var(--white)', 
        padding: '0 1.5rem', 
        display: 'flex', 
        alignItems: 'center', 
        minHeight: '60px',
        boxShadow: scrolled 
          ? '0 4px 20px rgba(0,0,0,0.3)' 
          : '0 2px 8px rgba(0,0,0,0.2)', 
        flexWrap: 'wrap',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        transition: 'all 0.3s ease',
        overflow: 'hidden',
      }}>
        {/* Glow effect */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-10%',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(253,216,53,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        
        <Link to="/" style={{ 
          color: 'var(--yellow)', 
          fontWeight: 'bold', 
          fontSize: '1.15rem', 
          textDecoration: 'none', 
          marginRight: '1.5rem', 
          padding: '0.75rem 0',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          whiteSpace: 'nowrap',
          position: 'relative',
          zIndex: 1,
        }}>
          <span style={{ fontSize: '1.4rem' }}>🍛</span>
          Nasi Goreng Polonia
        </Link>

        {/* Hamburger for mobile */}
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            display: 'none',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'var(--white)',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            fontSize: '1.2rem',
            cursor: 'pointer',
            position: 'relative',
            zIndex: 1,
          }}
          className="mobile-menu-btn"
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>

        {/* Desktop Navigation */}
        <nav style={{ 
          flex: 1, 
          display: 'flex', 
          gap: '1rem', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          padding: '0.5rem 0',
          position: 'relative',
          zIndex: 1,
        }}>
          {navGroups.map((group) => (
            <div key={group.label} style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ 
                fontSize: '0.65rem', 
                color: 'rgba(255,255,255,0.4)', 
                marginRight: '0.25rem', 
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                {group.icon} {group.label}:
              </span>
              {group.links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  style={{
                    padding: '0.35rem 0.6rem',
                    color: isActive(link.to) ? 'var(--yellow)' : 'rgba(255,255,255,0.75)',
                    textDecoration: 'none',
                    fontSize: '0.8rem',
                    fontWeight: isActive(link.to) ? 600 : 400,
                    background: isActive(link.to) ? 'rgba(253,216,53,0.1)' : 'transparent',
                    borderRadius: '4px',
                    transition: 'all 0.2s ease',
                    borderBottom: isActive(link.to) ? '2px solid var(--yellow)' : '2px solid transparent',
                  }}
                >
                  {link.icon} {link.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <button 
          onClick={handleLogout} 
          style={{
            background: 'rgba(198,40,40,0.8)',
            color: '#fff',
            border: 'none',
            padding: '0.4rem 1rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative',
            zIndex: 1,
          }}
          onMouseEnter={(e) => e.target.style.background = 'var(--red)'}
          onMouseLeave={(e) => e.target.style.background = 'rgba(198,40,40,0.8)'}
        >
          🚪 Logout
        </button>
      </header>

      <main style={{ 
        flex: 1, 
        background: 'linear-gradient(135deg, var(--gray-50) 0%, #f0f0f0 100%)',
        padding: '1.5rem',
        position: 'relative',
      }}>
        <div className="container">
          <div className="page-enter">
            <Outlet />
          </div>
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: block !important;
          }
          nav {
            display: ${sidebarOpen ? 'flex' : 'none'} !important;
            flex-direction: column !important;
            width: 100% !important;
            padding: 1rem 0 !important;
          }
          nav > div {
            flex-direction: column !important;
            width: 100% !important;
          }
          nav > div > span {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}