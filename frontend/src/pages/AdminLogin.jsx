import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import api from '../api.js'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })

  const loginMutation = useMutation({
    mutationFn: (body) => api.post('/auth/login', body),
    onSuccess: (res) => {
      const token = res.data?.data?.token
      if (token) {
        localStorage.setItem('jwt', token)
        navigate('/admin/dashboard', { replace: true })
      }
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    loginMutation.mutate(form)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--black) 0%, #2c2c2c 50%, var(--red-dark) 100%)',
    }}>
      <div className="card" style={{
        width: '400px',
        maxWidth: '90%',
        padding: '2.5rem',
        borderTop: '4px solid var(--yellow)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ color: 'var(--red)', marginBottom: '0.25rem' }}>Admin Login</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>Nasi Goreng Polonia</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              placeholder="admin@example.com"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              placeholder="••••••••"
            />
          </div>

          {loginMutation.isError && (
            <p style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              {loginMutation.error?.response?.data?.message || 'Login gagal. Periksa email dan password.'}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-red"
            style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderTopColor: 'var(--white)', borderColor: 'rgba(255,255,255,0.3)' }} />
                Logging in...
              </span>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
          <Link to="/admin/register" style={{ color: 'var(--yellow)', fontSize: '0.85rem' }}>Buat Akun Baru</Link>
          <Link to="/" style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>Beranda</Link>
        </div>
      </div>
    </div>
  )
}