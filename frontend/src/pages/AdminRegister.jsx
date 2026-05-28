import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import api from '../api.js'

export default function AdminRegister() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' })
  const [passError, setPassError] = useState('')

  const registerMutation = useMutation({
    mutationFn: (body) => api.post('/auth/register-admin', body),
    onSuccess: (response) => {
      // Redirect to verify-email page with the token
      const token = response.data?.data?.verificationToken
      if (token) {
        navigate(`/verify-email/${token}`, { replace: true })
      } else {
        navigate('/admin/login', { replace: true })
      }
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setPassError('')
    if (form.password !== form.confirmPassword) {
      setPassError('Password tidak cocok.')
      return
    }
    registerMutation.mutate({ email: form.email, password: form.password })
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
        width: '420px',
        maxWidth: '90%',
        padding: '2.5rem',
        borderTop: '4px solid var(--yellow)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ color: 'var(--red)', marginBottom: '0.25rem' }}>Register Admin</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>
            Buat akun admin Nasi Goreng Polonia
          </p>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            (Hanya admin pertama yang bisa register. Admin berikutnya perlu env <code>ALLOW_ADMIN_REGISTER=true</code>)
          </p>
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
              minLength={6}
              placeholder="Minimal 6 karakter"
            />
          </div>
          <div className="form-group">
            <label>Konfirmasi Password</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              required
              minLength={6}
              placeholder="Ulangi password"
            />
          </div>

          {passError && (
            <p style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{passError}</p>
          )}

          {registerMutation.isError && (
            <p style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              {registerMutation.error?.response?.data?.message || 'Registrasi gagal.'}
            </p>
          )}

          {registerMutation.isSuccess && (
            <p style={{ color: '#43a047', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              Registrasi berhasil! Silakan login.
            </p>
          )}

          <button
            type="submit"
            className="btn btn-red"
            style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderTopColor: 'var(--white)', borderColor: 'rgba(255,255,255,0.3)' }} />
                Mendaftarkan...
              </span>
            ) : (
              'Register'
            )}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
          <Link to="/admin/login" style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>← Sudah punya akun? Login</Link>
          <Link to="/" style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>Beranda</Link>
        </div>
      </div>
    </div>
  )
}