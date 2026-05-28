import axios from 'axios'

// Base URL for the backend API – can be overridden via VITE_API_BASE_URL env variable
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token from localStorage to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt')
  if (token) {
    config.headers = config.headers ?? {}
    ;(config.headers)['Authorization'] = `Bearer ${token}`
  }
  return config
})

export default api