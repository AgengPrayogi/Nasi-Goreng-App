import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import api from '../api.js'

export default function VerifyEmailPendingPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const email = location.state?.email || ''

  const [resendStatus, setResendStatus] = useState({ sent: false, error: '' })
  const [cooldown, setCooldown] = useState(0)

  const resendMutation = useMutation({
    mutationFn: (emailAddr) => api.post('/auth/resend-verification', { email: emailAddr }),
    onSuccess: () => {
      setResendStatus({ sent: true, error: '' })
      setCooldown(60)
      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || 'Gagal mengirim ulang email verifikasi.'
      setResendStatus({ sent: false, error: msg })
    },
  })

  const handleResend = () => {
    if (!email || cooldown > 0) return
    setResendStatus({ sent: false, error: '' })
    resendMutation.mutate(email)
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
        width: '480px',
        maxWidth: '90%',
        padding: '2.5rem',
        borderTop: '4px solid var(--yellow)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
        <h2 style={{ color: 'var(--red)', marginBottom: '0.5rem' }}>Registrasi Berhasil!</h2>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Kami telah mengirim email verifikasi ke:
        </p>
        <p style={{ color: 'var(--yellow)', fontSize: '1rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
          {email || 'alamat email Anda'}
        </p>
        <div style={{
          background: 'rgba(255, 193, 7, 0.1)',
          borderLeft: '4px solid var(--yellow)',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1.5rem',
          textAlign: 'left',
        }}>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem', lineHeight: 1.5 }}>
            <strong>📌 Langkah selanjutnya:</strong>
          </p>
          <ol style={{ color: 'var(--gray-400)', fontSize: '0.85rem', lineHeight: 1.8, paddingLeft: '1.2rem', marginTop: '0.5rem' }}>
            <li>Buka email Anda (cek juga folder <strong>Spam</strong> jika tidak ditemukan)</li>
            <li>Klik tautan verifikasi di email</li>
            <li>Setelah email diverifikasi, Anda bisa login</li>
          </ol>
        </div>

        {resendStatus.sent && (
          <p style={{ color: '#43a047', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            ✅ Email verifikasi telah dikirim ulang!
          </p>
        )}
        {resendStatus.error && (
          <p style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            ❌ {resendStatus.error}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          <button
            className="btn btn-red"
            onClick={handleResend}
            disabled={!email || cooldown > 0 || resendMutation.isPending}
            style={{ width: '100%', padding: '0.75rem' }}
          >
            {resendMutation.isPending ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderTopColor: 'var(--white)', borderColor: 'rgba(255,255,255,0.3)' }} />
                Mengirim...
              </span>
            ) : cooldown > 0 ? (
              `Kirim Ulang (${cooldown}s)`
            ) : (
              'Kirim Ulang Email Verifikasi'
            )}
          </button>
          <Link to="/admin/login" className="btn btn-gray" style={{ textAlign: 'center', padding: '0.75rem', textDecoration: 'none' }}>
            Ke Halaman Login
          </Link>
          <Link to="/" style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            ← Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  )
}