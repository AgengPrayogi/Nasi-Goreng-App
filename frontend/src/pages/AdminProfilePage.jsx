import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '../api.js'

export default function AdminProfilePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' })
  const profileQuery = useQuery({
    queryKey: ['admin-profile'],
    queryFn: async () => (await api.get('/auth/me')).data.data,
  })
  const passwordMutation = useMutation({
    mutationFn: (body) => api.patch('/auth/change-password', body),
    onSuccess: () => {
      localStorage.removeItem('jwt')
      localStorage.removeItem('adminToken')
      navigate('/admin/login', { replace: true, state: { message: 'Password berhasil diganti. Silakan login kembali dengan password baru.' } })
      setForm({ currentPassword: '', newPassword: '' })
    },
  })
  const submit = (event) => {
    event.preventDefault()
    passwordMutation.mutate(form)
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1.25rem' }}>Profil Admin</h1>
      <section className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <h2>Informasi akun</h2>
        {profileQuery.isPending ? <p>Memuat profil…</p> : profileQuery.isError ? (
          <p role="alert">Profil tidak dapat dimuat.</p>
        ) : (
          <dl style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '0.75rem', margin: '1rem 0 0' }}>
            <dt>Email</dt><dd style={{ margin: 0 }}>{profileQuery.data.email}</dd>
            <dt>Peran</dt><dd style={{ margin: 0 }}>{profileQuery.data.role || 'Admin'}</dd>
          </dl>
        )}
      </section>
      <section className="card" id="password" style={{ padding: '1.5rem' }}>
        <h2>Ganti password</h2>
        <p style={{ color: 'var(--gray-500)' }}>Gunakan minimal 8 karakter dengan huruf besar, kecil, angka, dan simbol.</p>
        <form onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="current-password">Password saat ini</label>
            <input id="current-password" type="password" autoComplete="current-password" required value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
          </div>
          <div className="form-group">
            <label htmlFor="profile-new-password">Password baru</label>
            <input id="profile-new-password" type="password" autoComplete="new-password" minLength={8} required value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
          </div>
          {passwordMutation.isError && <p role="alert" style={{ color: 'var(--red)' }}>{passwordMutation.error?.response?.data?.message || 'Password tidak dapat diperbarui.'}</p>}
          <button type="submit" className="btn btn-red" disabled={passwordMutation.isPending}>
            {passwordMutation.isPending ? 'Menyimpan…' : 'Simpan password'}
          </button>
        </form>
      </section>
    </div>
  )
}
