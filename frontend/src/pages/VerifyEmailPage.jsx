import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import api from '../api.js'

export default function VerifyEmailPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState('Klik tombol di bawah untuk menyelesaikan verifikasi email.')
  const [success, setSuccess] = useState(false)

  const verifyEmail = useMutation({
    mutationFn: (t) => api.post(`/auth/verify-email/${t}`),
    onSuccess: () => {
      setMessage('Email verified successfully!')
      setSuccess(true)
    },
    onError: () => {
      setMessage('Invalid or expired verification token.')
      setSuccess(false)
    },
  })

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--black) 0%, var(--gray-900) 100%)',
    }}>
      <div className="card" style={{
        width: '420px',
        maxWidth: '90%',
        padding: '2.5rem',
        borderTop: '4px solid var(--yellow)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          {success ? (
            <h2 style={{ color: '#43a047', marginBottom: '0.5rem' }}>✓ Email Verified</h2>
          ) : (
            <h2 style={{ color: 'var(--red)', marginBottom: '0.5rem' }}>Email Verification</h2>
          )}
          <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>
            {message}
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          {success ? (
            <button className="btn btn-red" onClick={() => navigate('/admin/login')}>
              Go to Login
            </button>
          ) : (
            <button className="btn btn-red" disabled={!token || verifyEmail.isPending} onClick={() => verifyEmail.mutate(token)}>
              {verifyEmail.isPending ? 'Memverifikasi...' : 'Verifikasi Email'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
