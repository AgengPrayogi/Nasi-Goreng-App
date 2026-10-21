import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import api from '../api.js'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const mutation = useMutation({ mutationFn: (body) => api.post('/auth/forgot-password', body) })

  const submit = (event) => {
    event.preventDefault()
    mutation.mutate({ email })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--black) 0%, var(--gray-900) 100%)' }}>
      <div className="card" style={{ width: 420, maxWidth: '90%', padding: '2.5rem', borderTop: '4px solid var(--yellow)' }}>
        <h2 style={{ color: 'var(--red)' }}>Lupa Password</h2>
        <p style={{ color: 'var(--gray-500)' }}>Masukkan email admin. Jika akun terverifikasi ditemukan, tautan reset akan dikirim dan berlaku selama 1 jam.</p>
        {mutation.isSuccess ? (
          <p role="status">Jika email tersebut terdaftar dan terverifikasi, tautan reset password telah dikirim. Periksa juga folder spam.</p>
        ) : (
          <form onSubmit={submit}>
            <div className="form-group">
              <label htmlFor="reset-email">Email</label>
              <input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {mutation.isError && <p role="alert" style={{ color: 'var(--red)' }}>{mutation.error?.response?.data?.message || 'Permintaan gagal. Coba lagi nanti.'}</p>}
            <button className="btn btn-red" type="submit" disabled={mutation.isPending} style={{ width: '100%' }}>
              {mutation.isPending ? 'Mengirim...' : 'Kirim Tautan Reset'}
            </button>
          </form>
        )}
        <p style={{ marginTop: '1.25rem' }}><Link to="/admin/login">Kembali ke login</Link></p>
      </div>
    </div>
  )
}
