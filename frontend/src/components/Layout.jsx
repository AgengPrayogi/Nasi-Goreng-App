import { Outlet, Link, useLocation } from 'react-router-dom'

export default function Layout() {
  const location = useLocation()
  const currentPath = location.pathname

  const handleLogout = () => {
    localStorage.removeItem('jwt')
    window.location.href = '/admin/login'
  }

  const navLinks = [
    { to: '/admin/dashboard', label: '📊 Dashboard' },
    { to: '/admin/orders', label: 'Orders' },
    { to: '/admin/orders/new', label: '+ New Order' },
    { to: '/admin/kitchen', label: 'Kitchen' },
    { to: '/admin/ingredients', label: 'Ingredients' },
    { to: '/admin/menus', label: 'Menus' },
    { to: '/admin/stock-movements', label: 'Stock' },
    { to: '/admin/finance', label: 'Finance' },
    { to: '/admin/reports', label: 'Reports' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top Bar */}
      <header style={{ background: 'var(--black)', color: 'var(--white)', padding: '0 1.5rem', display: 'flex', alignItems: 'center', height: '56px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
        <Link to="/" style={{ color: 'var(--yellow)', fontWeight: 'bold', fontSize: '1.1rem', textDecoration: 'none', marginRight: '2rem' }}>
          🍳 Nasi Goreng Polonia
        </Link>
        <nav style={{ flex: 1, display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                padding: '0.5rem 0.75rem',
                color: currentPath.startsWith(link.to) ? 'var(--yellow)' : 'rgba(255,255,255,0.75)',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: currentPath.startsWith(link.to) ? 600 : 400,
                background: currentPath.startsWith(link.to) ? 'rgba(255,255,255,0.1)' : 'transparent',
                borderRadius: '4px',
                transition: 'background 0.2s',
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="btn btn-red btn-sm"
        >
          Logout
        </button>
      </header>

      {/* Content */}
      <main style={{ flex: 1, background: 'var(--gray-50)', padding: '1.5rem' }}>
        <div className="container">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
