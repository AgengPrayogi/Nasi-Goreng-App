import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import api from '../api.js'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const mutation = useMutation({
    mutationFn: (value) => api.post(`/auth/reset-password/${encodeURIComponent(token)}`, { password: value }),
    onSuccess: () => navigate('/admin/login', { replace: true, state: { message: 'Password berhasil diperbarui. Silakan login.' } }),
  })

  const submit = (event) => {
    event.preventDefault()
    setLocalError('')
    if (!token) return setLocalError('Tautan reset tidak lengkap. Minta tautan baru.')
    if (password !== confirmPassword) return setLocalError('Konfirmasi password tidak cocok.')
    mutation.mutate(password)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--black) 0%, var(--gray-900) 100%)' }}>
      <div className="card" style={{ width: 420, maxWidth: '90%', padding: '2.5rem', borderTop: '4px solid var(--yellow)' }}>
        <h2 style={{ color: 'var(--red)' }}>Buat Password Baru</h2>
        <p style={{ color: 'var(--gray-500)' }}>Gunakan minimal 8 karakter dengan huruf besar, huruf kecil, angka, dan simbol.</p>
        <form onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="new-password">Password baru</label>
            <input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="confirm-password">Ulangi password</label>
            <input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          {(localError || mutation.isError) && <p role="alert" style={{ color: 'var(--red)' }}>{localError || mutation.error?.response?.data?.message || 'Reset password gagal.'}</p>}
          <button className="btn btn-red" type="submit" disabled={mutation.isPending} style={{ width: '100%' }}>
            {mutation.isPending ? 'Menyimpan...' : 'Simpan Password Baru'}
          </button>
        </form>
        <p style={{ marginTop: '1.25rem' }}><Link to="/admin/login">Kembali ke login</Link></p>
      </div>
    </div>
  )
}
